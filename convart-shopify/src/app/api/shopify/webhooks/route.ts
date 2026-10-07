import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Receives Shopify order webhooks (orders/create, orders/paid, orders/cancelled)
// and mirrors each order into the Supabase `orders` / `order_items` tables so it
// shows up in the existing admin dashboards next to UPI orders.

type Attr = { name: string; value: string };

interface ShopifyLineItem {
  title: string;
  quantity: number;
  price: string;
  properties?: Attr[];
}

interface ShopifyOrder {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  financial_status?: string | null;
  cancelled_at?: string | null;
  subtotal_price?: string;
  total_price?: string;
  total_tax?: string;
  total_discounts?: string;
  note_attributes?: Attr[];
  line_items?: ShopifyLineItem[];
  customer?: { first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null } | null;
  shipping_address?: {
    name?: string | null;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    province?: string | null;
    zip?: string | null;
    country?: string | null;
    phone?: string | null;
  } | null;
}

function verifyHmac(rawBody: string, hmacHeader: string | null): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret || !hmacHeader) return false;
  const digest = createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  const received = Buffer.from(hmacHeader, 'base64');
  return received.length === digest.length && timingSafeEqual(received, digest);
}

const attr = (list: Attr[] | undefined, key: string) => list?.find(a => a.name === key)?.value || null;

function mapPaymentStatus(financialStatus?: string | null): 'pending' | 'paid' | 'failed' | 'refunded' {
  switch (financialStatus) {
    case 'paid':
    case 'partially_refunded':
      return 'paid';
    case 'refunded':
      return 'refunded';
    case 'voided':
      return 'failed';
    default:
      return 'pending';
  }
}

function formatAddress(order: ShopifyOrder): string | null {
  const a = order.shipping_address;
  if (a) {
    const parts = [a.name, a.address1, a.address2, a.city, a.province, a.zip, a.country].filter(Boolean);
    if (parts.length) return parts.join(', ');
  }
  return attr(order.note_attributes, 'convart_address');
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyHmac(rawBody, req.headers.get('x-shopify-hmac-sha256'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const topic = req.headers.get('x-shopify-topic') || '';
  if (!['orders/create', 'orders/paid', 'orders/updated', 'orders/cancelled'].includes(topic)) {
    return NextResponse.json({ ok: true, ignored: topic });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('[Shopify webhook] SUPABASE_SERVICE_ROLE_KEY is not set');
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  const supabase: SupabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const order = JSON.parse(rawBody) as ShopifyOrder;
  const orderNumber = `SHOP-${order.name.replace(/^#/, '')}`;
  const paymentStatus = mapPaymentStatus(order.financial_status);
  const orderStatus = order.cancelled_at ? 'cancelled' : null;

  // Existing order: only refresh payment / cancellation state.
  const { data: existing, error: lookupError } = await supabase
    .from('orders')
    .select('id')
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (lookupError) {
    console.error('[Shopify webhook] Order lookup failed:', lookupError);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
  if (existing) {
    await updateExisting(supabase, existing.id, paymentStatus, orderStatus);
    return NextResponse.json({ ok: true, updated: orderNumber });
  }

  // New order: find or create the customer row.
  const userId = attr(order.note_attributes, 'convart_user_id');
  const email = order.email || order.customer?.email || null;
  const customerName =
    attr(order.note_attributes, 'convart_customer_name') ||
    [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ') ||
    order.shipping_address?.name ||
    'Shopify customer';

  let customerId: number | null = null;
  if (userId) {
    const { data } = await supabase.from('customers').select('id').eq('user_id', userId).maybeSingle();
    customerId = data?.id ?? null;
  }
  if (!customerId && email) {
    const { data } = await supabase.from('customers').select('id').eq('email', email).limit(1).maybeSingle();
    customerId = data?.id ?? null;
  }
  if (!customerId) {
    const { data, error } = await supabase
      .from('customers')
      .insert({ user_id: userId, customer_name: customerName, email, is_guest: !userId })
      .select('id')
      .single();
    if (error || !data) {
      console.error('[Shopify webhook] Customer insert failed:', error);
      return NextResponse.json({ error: 'Customer insert failed' }, { status: 500 });
    }
    customerId = data.id;
  }

  const lineItems = order.line_items || [];
  const artwork = lineItems
    .flatMap(li => li.properties || [])
    .filter(p => p.name.startsWith('Artwork'))
    .map(p => p.value);

  const { data: inserted, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: customerId,
      order_status: orderStatus || 'pending',
      payment_status: paymentStatus,
      payment_method: 'shopify',
      subtotal: Number(order.subtotal_price || 0),
      tax_amount: Number(order.total_tax || 0),
      gst_amount: 0,
      total_amount: Number(order.total_price || 0),
      shipping_address: formatAddress(order),
      payment_reference_id: `shopify:${order.id}`,
      image_url: artwork[0] || null,
    })
    .select('id')
    .single();

  if (orderError || !inserted) {
    // orders/create and orders/paid can arrive together; the second insert hits the unique order_number.
    if (orderError?.code === '23505') {
      const { data: raced } = await supabase.from('orders').select('id').eq('order_number', orderNumber).single();
      if (raced) await updateExisting(supabase, raced.id, paymentStatus, orderStatus);
      return NextResponse.json({ ok: true, updated: orderNumber });
    }
    console.error('[Shopify webhook] Order insert failed:', orderError);
    return NextResponse.json({ error: 'Order insert failed' }, { status: 500 });
  }

  const items = lineItems.map(li => {
    const props = li.properties || [];
    const walls = Number(attr(props, 'Walls')) || li.quantity || 1;
    const pricePerWall = Number((attr(props, 'Price per wall') || '').replace(/[^\d.]/g, '')) || Number(li.price);
    return {
      order_id: inserted.id,
      product_id: attr(props, 'Design ID'),
      product_name: li.title,
      quantity: walls,
      unit_price: pricePerWall,
      total_price: Number(li.price) * li.quantity,
      total_blocks: walls,
      is_hybrid_art: (attr(props, 'Hybrid Art') || '').startsWith('Yes'),
      custom_notes: `Shopify order ${order.name}`,
      configuration: Object.fromEntries(props.map(p => [p.name, p.value])),
    };
  });

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from('order_items').insert(items);
    if (itemsError) console.error('[Shopify webhook] Order items insert failed:', itemsError);
  }

  // Same order emails / admin alert the UPI checkout sends.
  if (process.env.SHOPIFY_SEND_SITE_EMAILS !== 'false' && email) {
    const emailData = {
      customerName,
      customerEmail: email,
      customerPhone: attr(order.note_attributes, 'convart_phone') || order.phone || order.shipping_address?.phone || '',
      orderNumber,
      orderId: inserted.id,
      items: lineItems.map(li => ({
        name: li.title,
        quantity: Number(attr(li.properties, 'Walls')) || li.quantity,
        price: Number(li.price) * li.quantity,
        isHybridArt: (attr(li.properties, 'Hybrid Art') || '').startsWith('Yes'),
      })),
      subtotal: Number(order.subtotal_price || 0),
      gst: 0,
      total: Number(order.total_price || 0),
      shippingAddress: formatAddress(order) || '',
      shippingCity: order.shipping_address?.city || '',
      paymentMethod: 'Shopify Checkout',
      paymentReference: order.name,
      imageUrl: artwork[0],
    };
    try {
      await fetch(new URL('/api/send-order-emails', req.nextUrl.origin), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: emailData }),
      });
    } catch (emailError) {
      console.error('[Shopify webhook] Order emails failed (non-critical):', emailError);
    }
  }

  const cartSessionId = attr(order.note_attributes, 'convart_cart_session');
  if (cartSessionId) {
    await supabase
      .from('cart_sessions')
      .update({ converted_to_order: true, order_id: inserted.id })
      .eq('session_id', cartSessionId);
  }

  return NextResponse.json({ ok: true, created: orderNumber });
}

async function updateExisting(
  supabase: SupabaseClient,
  id: string,
  paymentStatus: string,
  orderStatus: string | null
) {
  const update: Record<string, string> = { payment_status: paymentStatus };
  if (orderStatus) update.order_status = orderStatus;
  const { error } = await supabase.from('orders').update(update).eq('id', id);
  if (error) console.error('[Shopify webhook] Order update failed:', error);
}
