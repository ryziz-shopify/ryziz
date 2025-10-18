/**
 * Shopify Configuration
 *
 * This file allows you to customize your Shopify app settings.
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
  /**
   * Handle app uninstallation
   */
  APP_UNINSTALLED: async (topic, shop, body, webhookId) => {
    console.log(`App uninstalled from shop: ${shop}`);
    // Add your cleanup logic here
    // e.g., remove shop data from database, cancel subscriptions, etc.
  },

  /**
   * Handle shop data updates
   */
  SHOP_UPDATE: async (topic, shop, body, webhookId) => {
    console.log(`Shop updated: ${shop}`, body);
    // Update cached shop information
  },

  /**
   * Handle order creation
   */
  ORDERS_CREATE: async (topic, shop, body, webhookId) => {
    const order = JSON.parse(body);
    console.log(`New order created in ${shop}:`, order.name);
    // Process new order
    // e.g., send notification, update analytics, trigger fulfillment
  },

  /**
   * Handle product updates
   */
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
  // API version to use
  apiVersion: '2024-01',

  // App billing configuration (optional)
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

  // Rate limiting configuration
  rateLimiting: {
    requestsPerSecond: 2
  },

  // Session timeout (in seconds)
  sessionTimeout: 24 * 60 * 60, // 24 hours

  // Custom app bridge configuration
  appBridge: {
    forceRedirect: true,
    debug: process.env.NODE_ENV === 'development'
  }
};

/**
 * Custom Middleware
 * Add custom Express middleware to your app
 * @param {Express} app - The Express application instance
 */
export function setupMiddleware(app) {
  // Example: Add custom logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // Example: Add custom headers
  app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'Ryziz');
    next();
  });

  // Example: Add custom error handling for specific routes
  app.use('/api/*', (err, req, res, next) => {
    if (err.status === 401) {
      res.status(401).json({ error: 'Authentication required' });
    } else {
      next(err);
    }
  });
}

/**
 * GraphQL Query Fragments
 * Reusable GraphQL fragments for common queries
 */
export const graphqlFragments = {
  // Product fields fragment
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

  // Customer fields fragment
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

  // Order fields fragment
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
  /**
   * Format Shopify money values
   */
  formatMoney: (amount, currencyCode = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(parseFloat(amount));
  },

  /**
   * Convert Shopify ID to numeric ID
   */
  parseShopifyId: (gid) => {
    // Extract numeric ID from Shopify GID
    // e.g., "gid://shopify/Product/123456" -> "123456"
    return gid.split('/').pop();
  },

  /**
   * Build Shopify GID
   */
  buildShopifyGid: (resource, id) => {
    return `gid://shopify/${resource}/${id}`;
  },

  /**
   * Check if shop domain is valid
   */
  isValidShopDomain: (shop) => {
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
    return shopRegex.test(shop);
  }
};

/**
 * Export all configurations
 * Ryziz will automatically pick up these exports
 */
export default {
  scopes,
  webhooks,
  appConfig,
  setupMiddleware,
  graphqlFragments,
  helpers
};