/// <reference types="@shopify/polaris-types" />
/// <reference types="@shopify/app-bridge-types" />

export { useParams, useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
export const shopify = _shopify;

// Implementation

/** @type {import('@shopify/app-bridge-types').ShopifyGlobal | undefined} */
const _shopify = typeof window !== 'undefined' ? window.shopify : undefined;
