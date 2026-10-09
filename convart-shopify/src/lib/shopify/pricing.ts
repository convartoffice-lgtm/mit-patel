// Server-side copy of the per-wall pricing used by the cart and checkout pages
// (see checkout-payment/components/CheckoutInteractive.tsx). Shopify checkout
// totals are computed here, never taken from the browser.

export const SINGLE_WALL_PRICE = 7999;
export const MULTI_WALL_PRICE = 5999;
export const PROFESSIONAL_INSTALL_PRICE = 2500;
export const HYBRID_ART_PREMIUM = 0.10;
export const FESTIVE_DISCOUNT_RATE = 0.20;

export interface PricedItemInput {
  walls: number;
  hybridArt: boolean;
  professionalInstall: boolean;
}

export const getWallPrice = (totalWalls: number): number =>
  totalWalls >= 2 ? MULTI_WALL_PRICE : SINGLE_WALL_PRICE;

export function priceOrder(items: PricedItemInput[]) {
  const totalWalls = items.reduce((sum, item) => sum + item.walls, 0);
  const wallPrice = getWallPrice(totalWalls);

  const itemTotals = items.map(item => {
    const wallsTotal = wallPrice * item.walls;
    const installTotal = item.professionalInstall ? PROFESSIONAL_INSTALL_PRICE * item.walls : 0;
    const hybridPremium = item.hybridArt ? Math.round((wallsTotal + installTotal) * HYBRID_ART_PREMIUM) : 0;
    return wallsTotal + installTotal + hybridPremium;
  });

  const subtotal = itemTotals.reduce((sum, t) => sum + t, 0);
  const festiveDiscount = Math.round(subtotal * FESTIVE_DISCOUNT_RATE);

  return {
    totalWalls,
    wallPrice,
    itemTotals,
    subtotal,
    festiveDiscount,
    total: subtotal - festiveDiscount,
  };
}
