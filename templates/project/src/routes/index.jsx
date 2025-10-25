import React from 'react';

// Loader function - runs on the server before rendering
export async function loader({ request, query }) {
  return {
    timestamp: new Date().toISOString()
  };
}

// Head metadata
export async function head() {
  return {
    title: 'Welcome to Ryziz',
    description: 'A simple landing page built with Ryziz'
  };
}

// React component for the page
export default function Home({ timestamp }) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Hello World!</h1>
        <p style={styles.subtitle}>Welcome to Ryziz</p>

        <div style={styles.infoBox}>
          <p style={styles.description}>
            This is a simple landing page template built with Ryziz - a modern framework
            for building Shopify apps with server-side rendering and React.
          </p>

          <div style={styles.timestamp}>
            <strong>Server timestamp:</strong> {timestamp}
          </div>
        </div>

        <div style={styles.features}>
          <h2 style={styles.featuresTitle}>Get Started</h2>
          <ul style={styles.featuresList}>
            <li>Edit <code style={styles.code}>src/routes/index.jsx</code> to customize this page</li>
            <li>Create new routes by adding files to <code style={styles.code}>src/routes/</code></li>
            <li>Use the <code style={styles.code}>loader</code> function to fetch server-side data</li>
            <li>Customize metadata with the <code style={styles.code}>head</code> function</li>
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
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)'
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: '20px',
    color: '#667eea',
    marginBottom: '32px',
    textAlign: 'center',
    fontWeight: '500'
  },
  infoBox: {
    background: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '32px'
  },
  description: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '16px'
  },
  timestamp: {
    fontSize: '14px',
    color: '#888',
    fontFamily: 'monospace',
    padding: '12px',
    background: 'white',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  features: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '24px'
  },
  featuresTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '16px'
  },
  featuresList: {
    listStyle: 'none',
    padding: '0',
    margin: '0',
    color: '#666',
    lineHeight: '2'
  },
  code: {
    background: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'monospace',
    color: '#667eea'
  }
};
