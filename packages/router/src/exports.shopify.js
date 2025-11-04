/** @type {import('@shopify/app-bridge-types').ShopifyGlobal | undefined} */
export const shopify = typeof window !== 'undefined' ? window.shopify : undefined;
