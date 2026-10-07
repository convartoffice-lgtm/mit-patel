import { NextResponse } from 'next/server';
import { isShopifyConfigured } from '@/lib/shopify/admin';

export const dynamic = 'force-dynamic';

// Lets the payment page show the Shopify checkout option only once the store is connected.
export async function GET() {
  return NextResponse.json({ enabled: isShopifyConfigured() });
}
