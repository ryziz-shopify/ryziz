import { useState } from 'react';

export const metadata = {
  id: 'backend-storename',
  title: 'Backend - Store Name',
  description: 'Fetch Shopify store name from GraphQL API endpoint',
  category: 'backend'
};

export default function BackendStorename() {
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchStoreName = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/demo');
      const data = await response.json();
      setStoreName(data.storeName);
    } catch (error) {
      console.error('Failed to fetch store name:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Pattern overview section */}
      <s-section>
        <s-heading>Backend - Store Name</s-heading>
        <s-paragraph>
          This pattern demonstrates how to fetch the Shopify store name from a backend API endpoint that uses Shopify GraphQL.
        </s-paragraph>
      </s-section>

      {/* Demo section */}
      <s-section>
        <s-grid gap="base">
          {/* Fetch button */}
          <s-button variant="primary" onClick={fetchStoreName} disabled={loading}>
            {loading ? 'Loading...' : 'Fetch Store Name'}
          </s-button>

          {/* Display store name */}
          {storeName && (
            <s-box padding="base" background="subdued" borderRadius="base">
              <s-heading>Store Name: {storeName}</s-heading>
            </s-box>
          )}
        </s-grid>
      </s-section>
    </>
  );
}
