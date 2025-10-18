import React from 'react';

// Loader function - runs on the server before rendering
export async function loader({ request, query }) {
  const { shop } = query;

  // If shop parameter exists, redirect to auth
  if (shop) {
    return {
      redirect: `/auth?shop=${shop}`
    };
  }

  return {
    shopParam: shop || null
  };
}

// Head metadata
export async function head() {
  return {
    title: 'Install Shopify App',
    description: 'Install our Shopify app to get started'
  };
}

// React component for the page
export default function Home({ shopParam }) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome to Your Shopify App</h1>
        <p style={styles.description}>
          Connect your Shopify store to get started with powerful features and integrations.
        </p>

        <form method="GET" action="/auth" style={styles.form}>
          <label style={styles.label}>
            Enter your Shopify store domain:
          </label>
          <div style={styles.inputGroup}>
            <input
              name="shop"
              type="text"
              placeholder="your-store.myshopify.com"
              required
              pattern="[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com"
              style={styles.input}
              defaultValue={shopParam}
            />
            <button type="submit" style={styles.button}>
              Install App
            </button>
          </div>
          <p style={styles.hint}>
            Example: awesome-store.myshopify.com
          </p>
        </form>

        <div style={styles.features}>
          <h2 style={styles.featuresTitle}>Features</h2>
          <ul style={styles.featuresList}>
            <li>Product management and sync</li>
            <li>Order tracking and analytics</li>
            <li>Customer insights</li>
            <li>Automated workflows</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '16px',
    textAlign: 'center'
  },
  description: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '32px',
    textAlign: 'center',
    lineHeight: '1.6'
  },
  form: {
    marginBottom: '32px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px'
  },
  inputGroup: {
    display: 'flex',
    gap: '8px'
  },
  input: {
    flex: '1',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': {
      borderColor: '#667eea'
    }
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 20px rgba(102, 126, 234, 0.3)'
    }
  },
  hint: {
    fontSize: '13px',
    color: '#999',
    marginTop: '8px'
  },
  features: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '24px'
  },
  featuresTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '12px'
  },
  featuresList: {
    listStyle: 'none',
    padding: '0',
    margin: '0',
    color: '#666',
    lineHeight: '2'
  }
};