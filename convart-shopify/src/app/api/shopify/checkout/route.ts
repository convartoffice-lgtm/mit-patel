import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isShopifyConfigured, shopifyAdminGraphql } from '@/lib/shopify/admin';
import { FESTIVE_DISCOUNT_RATE, priceOrder } from '@/lib/shopify/pricing';

export const dynamic = 'force-dynamic';

// Creates a Shopify draft order from the website cart and returns its checkout
// (invoice) URL. Prices are recomputed here from the per-wall pricing rules;
// the browser only says which designs and options were chosen.

interface IncomingItem {
  id?: string;
  name?: string;
  quantity?: number;
  artistTouch?: boolean;
  professionalInstall?: boolean;
  referencePhotos?: string[];
  wallDimensions?: string;
  blockCount?: number;
}

interface IncomingBody {
  items?: IncomingItem[];
  customer?: { name?: string; email?: string; phone?: string; address?: string };
  uploadedImageUrl?: string | null;
  cartSessionId?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 20;
const MAX_WALLS_PER_ITEM = 50;

const DRAFT_ORDER_CREATE = `
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder { id name invoiceUrl }
      userErrors { field message }
    }
  }
`;

const clean = (value: unknown, max = 255) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

function toE164India(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return null;
}

// Artwork links are only passed to Shopify if they point at this site's own Supabase storage.
function isOwnStorageUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').host;
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.host === supabaseHost;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isShopifyConfigured()) {
    return NextResponse.json({ error: 'Online checkout is not available yet.' }, { status: 503 });
  }

  let body: IncomingBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS) : [];
  if (rawItems.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
  }

  const customer = {
    name: clean(body.customer?.name, 120),
    email: clean(body.customer?.email, 254),
    phone: clean(body.customer?.phone, 20),
    address: clean(body.customer?.address, 500),
  };
  if (!customer.name || !customer.email.includes('@')) {
    return NextResponse.json({ error: 'Please enter your name and a valid email.' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  // Optional: link the order to the signed-in website account.
  let userId: string | null = null;
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (bearer) {
    const { data } = await supabase.auth.getUser(bearer);
    userId = data.user?.id ?? null;
  }

  // Look up catalogue designs so titles and stock come from the database, not the browser.
  // (art_products.id is free text in production, e.g. "Father son duo"; older schemas used UUIDs.)
  const productIds = Array.from(
    new Set(rawItems.map(i => clean(i.id, 200)).filter(Boolean))
  );
  const products = new Map<string, { title: string; in_stock: boolean; dimensions: string | null }>();
  if (productIds.length > 0) {
    const lookup = (ids: string[]) =>
      supabase.from('art_products').select('id, title, in_stock, dimensions').in('id', ids);
    let { data, error } = await lookup(productIds);
    if (error?.code === '22P02') {
      // uuid-typed column: non-UUID ids (custom designs) can't match anyway
      ({ data, error } = await lookup(productIds.filter(id => UUID_RE.test(id))));
    }
    if (error) {
      console.error('[Shopify checkout] Product lookup failed:', error);
      return NextResponse.json({ error: 'Could not load products. Please try again.' }, { status: 502 });
    }
    for (const p of data || []) products.set(String(p.id), p);
  }

  const uploadedImageUrl = isOwnStorageUrl(body.uploadedImageUrl) ? body.uploadedImageUrl : null;

  const items = rawItems.map(raw => {
    const walls = Math.min(MAX_WALLS_PER_ITEM, Math.max(1, Math.floor(Number(raw.quantity) || 1)));
    const product = products.get(clean(raw.id, 200));
    const artwork = [
      ...(Array.isArray(raw.referencePhotos) ? raw.referencePhotos : []),
      ...(!product && uploadedImageUrl ? [uploadedImageUrl] : []),
    ].filter(isOwnStorageUrl).slice(0, 10);

    return {
      product,
      productId: product ? clean(raw.id, 200) : null,
      title: product ? product.title : `Custom Wall Design${clean(raw.name, 80) ? ` – ${clean(raw.name, 80)}` : ''}`,
      walls,
      hybridArt: raw.artistTouch !== false,
      professionalInstall: raw.professionalInstall === true,
      wallDimensions: clean(raw.wallDimensions, 60),
      artwork,
    };
  });

  const outOfStock = items.find(i => i.product && !i.product.in_stock);
  if (outOfStock) {
    return NextResponse.json({ error: `"${outOfStock.title}" is currently out of stock.` }, { status: 409 });
  }

  const pricing = priceOrder(items);
  const money = (amount: number) => ({ amount: amount.toFixed(2), currencyCode: 'INR' });

  const lineItems = items.map((item, index) => {
    const attrs: { key: string; value: string }[] = [
      { key: 'Walls', value: String(item.walls) },
      { key: 'Price per wall', value: `₹${pricing.wallPrice}` },
      { key: 'Hybrid Art', value: item.hybridArt ? 'Yes (+10%)' : 'No' },
      { key: 'Professional installation', value: item.professionalInstall ? 'Yes' : 'No' },
    ];
    if (item.productId) attrs.push({ key: 'Design ID', value: item.productId });
    if (item.wallDimensions) attrs.push({ key: 'Wall dimensions', value: item.wallDimensions });
    item.artwork.forEach((url, i) => attrs.push({ key: `Artwork ${i + 1}`, value: url }));

    return {
      title: `${item.title} (${item.walls} wall${item.walls > 1 ? 's' : ''})`,
      quantity: 1,
      originalUnitPriceWithCurrency: money(pricing.itemTotals[index]),
      requiresShipping: true,
      taxable: true,
      customAttributes: attrs,
    };
  });

  const orderAttributes: { key: string; value: string }[] = [
    { key: 'convart_source', value: 'website' },
    { key: 'convart_customer_name', value: customer.name },
  ];
  if (customer.phone) orderAttributes.push({ key: 'convart_phone', value: customer.phone });
  if (customer.address) orderAttributes.push({ key: 'convart_address', value: customer.address });
  if (userId) orderAttributes.push({ key: 'convart_user_id', value: userId });
  const cartSessionId = clean(body.cartSessionId, 100);
  if (cartSessionId) orderAttributes.push({ key: 'convart_cart_session', value: cartSessionId });

  const input: Record<string, unknown> = {
    email: customer.email,
    note: customer.address ? `Delivery address (from website): ${customer.address}` : undefined,
    tags: ['convart-website'],
    taxesIncluded: true,
    presentmentCurrencyCode: 'INR',
    customAttributes: orderAttributes,
    lineItems,
    shippingLine: { title: 'Free delivery', priceWithCurrency: money(0) },
  };
  const phone = toE164India(customer.phone);
  if (phone) input.phone = phone;
  if (pricing.festiveDiscount > 0) {
    input.appliedDiscount = {
      title: 'Festive discount',
      description: `${Math.round(FESTIVE_DISCOUNT_RATE * 100)}% festive offer`,
      value: pricing.festiveDiscount,
      valueType: 'FIXED_AMOUNT',
    };
  }

  try {
    const data = await shopifyAdminGraphql<{
      draftOrderCreate: {
        draftOrder: { id: string; name: string; invoiceUrl: string } | null;
        userErrors: { field: string[] | null; message: string }[];
      };
    }>(DRAFT_ORDER_CREATE, { input });

    const { draftOrder, userErrors } = data.draftOrderCreate;
    if (!draftOrder || userErrors.length > 0) {
      console.error('[Shopify checkout] draftOrderCreate userErrors:', userErrors);
      return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({
      checkoutUrl: draftOrder.invoiceUrl,
      draftOrderName: draftOrder.name,
      total: pricing.total,
    });
  } catch (error) {
    console.error('[Shopify checkout] Failed:', error);
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 });
  }
}
