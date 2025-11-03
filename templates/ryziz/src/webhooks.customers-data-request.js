export const TOPIC = 'CUSTOMERS_DATA_REQUEST';

export async function handle(topic, shop, body) {
  const data = JSON.parse(body);
  console.log('Customer data request:', { shop, customerId: data.customer?.id });

  // TODO: Implement customer data collection and response
  // Must respond within 30 days with customer data
}
