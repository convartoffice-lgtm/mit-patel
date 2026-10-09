// Minimal Shopify Admin GraphQL client (server only).
//
// Auth, in order of preference:
//   1. SHOPIFY_ADMIN_ACCESS_TOKEN  - a static Admin API token (shpat_...)
//   2. SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET - a Dev Dashboard app installed
//      on your own store; a 24h token is fetched with the client credentials grant.

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-07';

let cachedToken: { value: string; expiresAt: number } | null = null;

export function getShopDomain(): string | null {
  const raw = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  if (!raw) return null;
  return raw.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

export function isShopifyConfigured(): boolean {
  return Boolean(
    getShopDomain() &&
      (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ||
        (process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET))
  );
}

async function getAccessToken(shop: string): Promise<string> {
  const staticToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (staticToken) return staticToken;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SHOPIFY_CLIENT_ID!,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET!,
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Shopify token request failed (${res.status})`);
  }
  const json = (await res.json()) as { access_token: string; expires_in?: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 86399) * 1000,
  };
  return json.access_token;
}

export async function shopifyAdminGraphql<T = any>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const shop = getShopDomain();
  if (!shop || !isShopifyConfigured()) {
    throw new Error('Shopify is not configured');
  }

  const token = await getAccessToken(shop);
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  if (res.status === 401) cachedToken = null;
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.errors) {
    const detail = json?.errors ? JSON.stringify(json.errors) : `HTTP ${res.status}`;
    throw new Error(`Shopify Admin API error: ${detail}`);
  }
  return json.data as T;
}
