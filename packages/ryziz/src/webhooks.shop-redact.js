export const TOPIC = 'SHOP_REDACT';

export async function handle(topic, shop, body) {
  const data = JSON.parse(body);
  console.log('Shop redact request:', { shop, shopId: data.shop_id });

  // TODO: Implement shop data deletion
  // Delete all shop data from your database (48 hours after app uninstall)
}
