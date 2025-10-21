/**
 * Shopify Configuration
 * All exports are optional - Ryziz will use sensible defaults if not provided.
 */

/**
 * OAuth Scopes
 * Define the permissions your app needs from Shopify stores
 * @see https://shopify.dev/api/usage/access-scopes
 */
export const scopes = [
  'read_products',
  'write_products',
  'read_orders',
  'read_customers'
];

/**
 * Webhook Handlers
 * Subscribe to Shopify webhook events
 * @see https://shopify.dev/api/admin-rest/2024-01/resources/webhook
 */
export const webhooks = {
  APP_UNINSTALLED: async (topic, shop, body, webhookId) => {
    console.log(`App uninstalled from shop: ${shop}`);
    // Add your cleanup logic here
  },

  SHOP_UPDATE: async (topic, shop, body, webhookId) => {
    console.log(`Shop updated: ${shop}`, body);
    // Update cached shop information
  },

  ORDERS_CREATE: async (topic, shop, body, webhookId) => {
    const order = JSON.parse(body);
    console.log(`New order created in ${shop}:`, order.name);
    // Process new order
  },

  PRODUCTS_UPDATE: async (topic, shop, body, webhookId) => {
    const product = JSON.parse(body);
    console.log(`Product updated in ${shop}:`, product.title);
    // Sync product changes
  }
};

/**
 * App Configuration
 * Additional settings for your Shopify app
 */
export const appConfig = {
  apiVersion: '2024-01',
  billing: {
    required: false,
    plans: [
      {
        name: 'Basic',
        price: 9.99,
        features: ['100 products', 'Basic analytics']
      },
      {
        name: 'Pro',
        price: 29.99,
        features: ['Unlimited products', 'Advanced analytics', 'Priority support']
      }
    ]
  },
  rateLimiting: {
    requestsPerSecond: 2
  },
  sessionTimeout: 24 * 60 * 60, // 24 hours
  appBridge: {
    forceRedirect: true,
    debug: process.env.NODE_ENV === 'development'
  }
};

/**
 * GraphQL Query Fragments
 * Reusable GraphQL fragments for common queries
 */
export const graphqlFragments = {
  productFields: `
    fragment ProductFields on Product {
      id
      title
      handle
      description
      vendor
      productType
      status
      tags
      createdAt
      updatedAt
    }
  `,
  customerFields: `
    fragment CustomerFields on Customer {
      id
      email
      firstName
      lastName
      phone
      acceptsMarketing
      createdAt
      updatedAt
    }
  `,
  orderFields: `
    fragment OrderFields on Order {
      id
      name
      email
      createdAt
      updatedAt
      fulfillmentStatus
      financialStatus
      totalPrice
      currencyCode
    }
  `
};

/**
 * Helper Functions
 * Utility functions for common Shopify operations
 */
export const helpers = {
  formatMoney: (amount, currencyCode = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(parseFloat(amount));
  },

  parseShopifyId: (gid) => {
    return gid.split('/').pop();
  },

  buildShopifyGid: (resource, id) => {
    return `gid://shopify/${resource}/${id}`;
  },

  isValidShopDomain: (shop) => {
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
    return shopRegex.test(shop);
  }
};

/**
 * Custom Middleware
 * Add custom Express middleware to your app
 */
export function setupMiddleware(app) {
  app.use(logRequests);
  app.use(addCustomHeaders);
  app.use('/api/*', handleApiErrors);
}

/**
 * Export all configurations
 */
export default {
  scopes,
  webhooks,
  appConfig,
  setupMiddleware,
  graphqlFragments,
  helpers
};

/**
 * Log incoming requests
 */
function logRequests(req, res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
}

/**
 * Add custom response headers
 */
function addCustomHeaders(req, res, next) {
  res.setHeader('X-Powered-By', 'Ryziz');
  next();
}

/**
 * Handle API authentication errors
 */
function handleApiErrors(err, req, res, next) {
  if (err.status === 401) {
    res.status(401).json({ error: 'Authentication required' });
  } else {
    next(err);
  }
}
