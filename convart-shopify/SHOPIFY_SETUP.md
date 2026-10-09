# Shopify checkout for convart.in

The website keeps its own shop, cart, wall visualiser and pricing. When a customer picks
**Card**, **Net Banking** or **Pay Later / EMI** on `/payment-selection`, the site creates a
Shopify **draft order** with the exact website price and sends the customer to Shopify's
secure checkout. Paid orders are copied back into Supabase, so they appear in the existing
admin dashboards next to UPI orders. UPI QR payments work exactly as before.

Until the Shopify variables below are set, the site behaves exactly as it does today
("coming soon" messages on the card / net banking / EMI options).

## What was added

| File | Purpose |
| --- | --- |
| `src/lib/shopify/pricing.ts` | Server copy of the per-wall pricing (₹7,999 / ₹5,999, +₹2,500 install, +10% Hybrid Art, 20% festive discount) |
| `src/lib/shopify/admin.ts` | Shopify Admin API client (static token or client-credentials login) |
| `src/app/api/shopify/status/route.ts` | Tells the payment page whether Shopify is connected |
| `src/app/api/shopify/checkout/route.ts` | Re-prices the cart on the server and creates the draft order; returns the checkout link |
| `src/app/api/shopify/webhooks/route.ts` | Verifies Shopify's signature and writes orders into `orders` / `order_items` |
| `src/components/common/ShopifyCheckoutButton.tsx` | "Pay securely online" button |
| `src/app/payment-selection/page.tsx` | Shows that button for card / net banking / EMI once Shopify is connected |

How each order type reaches Shopify:

- **Catalogue designs:** the design's title and stock are read from `art_products`. A design that is out of stock is refused.
- **Custom designs** (wall visualiser or wall design dashboard): sent as "Custom Wall Design" lines. Uploaded artwork links are attached to the line item as `Artwork 1`, `Artwork 2`, and so on, so you see them on the Shopify order. Only links on your own Supabase storage are accepted.
- **Every line** also carries: number of walls, price per wall, Hybrid Art yes/no, installation yes/no, and the design ID.

## One-time setup

### 1. Create the Shopify store
1. Sign up at shopify.com, pick a plan and set the store currency to **INR**.
2. Go to **Settings → Payments** and turn on Shopify Payments, or Razorpay / PayU / Cashfree for India.
   That's where you enable UPI, cards, net banking, EMI and COD.
3. Go to **Settings → Taxes and duties**: set up GST for India and turn on **"All prices include tax"**.
   Website prices already include GST.

### 2. Create an app to connect the website
1. Open the **Dev Dashboard** (Shopify admin → Settings → Apps → Develop apps → *Build apps in Dev Dashboard*)
   and create an app.
2. Under **Access scopes**, give it `write_draft_orders`, `read_draft_orders` and `read_orders`. Release
   the version and install the app on your store.
3. Copy the app's **Client ID** and **Client secret**.

### 3. Add environment variables in your hosting (Netlify / Rocket), not in code

```
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_CLIENT_ID=...
SHOPIFY_CLIENT_SECRET=...
# Optional:
# SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...   # use instead of client id/secret if you have a static token
# SHOPIFY_WEBHOOK_SECRET=...             # only if webhooks are created under Settings → Notifications
# SHOPIFY_API_VERSION=2026-07
# SHOPIFY_SEND_SITE_EMAILS=false         # stop the website's own order emails for Shopify orders
```

`SUPABASE_SERVICE_ROLE_KEY` must also be set (it already is for the other API routes).

### 4. Webhooks (so orders show up in the admin dashboard)
Create these webhooks with the URL `https://www.convart.in/api/shopify/webhooks` and format JSON:

- `orders/create`
- `orders/paid`
- `orders/cancelled`

You can add them in the app's configuration in the Dev Dashboard; those are signed with the client secret.
You can also add them under **Shopify admin → Settings → Notifications → Webhooks**. In that case, copy
the signing secret shown on that page into `SHOPIFY_WEBHOOK_SECRET`.

Orders are saved as `SHOP-<number>` (for example `SHOP-1001`) with payment method `shopify`.

### 5. Test
1. Turn on Shopify's test mode (Bogus Gateway or the test mode of your payment provider).
2. Add a design to the cart on convart.in → checkout → choose **Credit/Debit Card** → **Pay by card**.
3. Complete the payment on Shopify. The order should appear in Shopify **Orders** and in the website admin dashboard.

## Notes
- **Delivery:** draft orders carry a free "Free delivery" shipping line so the total matches the website.
  To charge for delivery, change `shippingLine` in `src/app/api/shopify/checkout/route.ts`.
- **Prices** are always recomputed on the server; the browser can't change them. If you change the
  pricing on the website, update `src/lib/shopify/pricing.ts` too.
- **Emails:** customers get Shopify's order confirmation. By default they also get the website's own
  order email, and you get the usual admin alert. To avoid two confirmation emails, set
  `SHOPIFY_SEND_SITE_EMAILS=false` or turn off Shopify's confirmation under Settings → Notifications.
