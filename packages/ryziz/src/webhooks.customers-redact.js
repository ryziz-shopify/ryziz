export const TOPIC = 'CUSTOMERS_REDACT';

export async function handle(topic, shop, body) {
  const data = JSON.parse(body);
  console.log('Customer redact request:', { shop, customerId: data.customer?.id });

  // TODO: Implement customer data deletion
  // Delete all customer personal data from your database
}
