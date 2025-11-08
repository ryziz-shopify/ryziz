import shopify from './app.js';

export function withShopify(handler) {
  return async (req, res) => {
    await new Promise((resolve, reject) => {
      shopify.validateAuthenticatedSession()(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const session = res.locals.shopify?.session;

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = new shopify.api.clients.Graphql({ session });

    req.shopify = {
      session,
      client,
      graphql: async (query, variables) => {
        const response = await client.request(query, { variables });

        if (response.errors) {
          throw new Error(response.errors.map(e => e.message).join(', '));
        }

        return response.data;
      }
    };

    return handler(req, res);
  };
}
