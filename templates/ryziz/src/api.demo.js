import { db, withShopify } from '@ryziz-shopify/functions';

export const GET = _GET;
export const POST = _POST;

// Implementation

// GET endpoint - fetch store name from Shopify GraphQL and counter from Firestore
const _GET = withShopify(async (req, res) => {
  try {
    // Query Shopify GraphQL for shop name
    const shopData = await req.shopify.graphql(`
      query {
        shop {
          name
        }
      }
    `);

    // Get counter from Firestore
    const counterDoc = await db.collection('demo-counters').doc('global').get();
    const counter = counterDoc.exists ? counterDoc.data().count : 0;

    res.json({
      storeName: shopData.shop.name,
      counter
    });
  } catch (error) {
    console.error('GET /api/demo error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// POST endpoint - update counter in Firestore using transaction
const _POST = async (req, res) => {
  try {
    const { action } = req.body;

    if (!action || (action !== 'increment' && action !== 'decrement')) {
      return res.status(400).json({ error: 'Invalid action. Must be "increment" or "decrement"' });
    }

    // Use transaction for atomic update
    const newCounter = await db.runTransaction(async (transaction) => {
      const counterRef = db.collection('demo-counters').doc('global');
      const doc = await transaction.get(counterRef);

      const currentCount = doc.exists ? doc.data().count : 0;
      const newCount = action === 'increment' ? currentCount + 1 : currentCount - 1;

      transaction.set(counterRef, { count: newCount });

      return newCount;
    });

    res.json({ counter: newCounter });
  } catch (error) {
    console.error('POST /api/demo error:', error);
    res.status(500).json({ error: 'Failed to update counter' });
  }
};
