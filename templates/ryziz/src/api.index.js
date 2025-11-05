import { withShopify } from '@ryziz-shopify/functions';

export function GET(req, res) {
  res.json({ message: 'hello world' });
}

export const POST = withShopify(async (req, res) => {
  const data = await req.shopify.graphql(`
    query {
      products(first: 5) {
        edges {
          node {
            id
            title
          }
        }
      }
    }
  `);

  res.json(data);
});
