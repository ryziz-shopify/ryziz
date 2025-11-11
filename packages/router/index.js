/// <reference types="@shopify/polaris-types" />
/// <reference types="@shopify/app-bridge-types" />

export { useParams, useNavigate, useLocation, Link, NavLink } from 'react-router-dom';

/** @type {import('@shopify/app-bridge-types').ShopifyGlobal | undefined} */
export const shopify = typeof window !== 'undefined' ? window.shopify : undefined;
