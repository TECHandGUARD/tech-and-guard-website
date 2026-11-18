export const maxBasketLines = 25;
export const maxBasketQuantity = 99;
export type Basket = Record<string, number>;

export function basketQuantityLimit(stock: number | null) {
 return stock === null ? maxBasketQuantity : Math.max(0, Math.min(stock, maxBasketQuantity));
}

export function readBasket(value: string | null): Basket {
 try {
  const data: unknown = JSON.parse(value ?? '{}');
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  return Object.fromEntries(Object.entries(data)
   .filter(([sku, quantity]) => sku && Number.isInteger(quantity) && quantity > 0 && quantity <= maxBasketQuantity)
   .slice(0, maxBasketLines));
 } catch {
  return {};
 }
}

export function changeBasket(basket: Basket, sku: string, adjustment: number, stock: number | null): Basket {
 const current = Object.prototype.hasOwnProperty.call(basket, sku) ? basket[sku] : 0;
 if (adjustment > 0 && (current >= basketQuantityLimit(stock) ||
   (current === 0 && Object.keys(basket).length >= maxBasketLines))) return basket;
 const quantity = Math.max(0, current + adjustment);
 if (quantity > 0) return {...basket, [sku]: quantity};
 const next = {...basket};
 delete next[sku];
 return next;
}
