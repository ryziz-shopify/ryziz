export const TOPIC = 'CUSTOMERS_REDACT';
export const handle = _handle;

// Implementation

async function _handle(topic, shop, body) {
  const data = JSON.parse(body);
  console.log('Customer redact request:', { shop, customerId: data.customer?.id });

  // TODO: Implement customer data deletion
  // Delete all customer personal data from your database
}
