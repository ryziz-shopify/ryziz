import React from 'react';

// Loader function - runs on the server with Shopify context
export async function loader({ shopify }) {
  // The shopify object is provided by the middleware for protected routes
  // It includes the authenticated GraphQL client

  try {
    // Fetch shop information and products
    const response = await shopify.graphql(`
      query {
        shop {
          name
          email
          currencyCode
          primaryDomain {
            url
            host
          }
          plan {
            displayName
          }
        }
        products(first: 10, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              title
              handle
              status
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              totalInventory
              createdAt
            }
          }
        }
      }
    `);

    const data = response.body.data;

    return {
      shop: data.shop,
      products: data.products.edges.map(edge => edge.node)
    };
  } catch (error) {
    console.error('Error fetching Shopify data:', error);
    return {
      shop: null,
      products: [],
      error: error.message
    };
  }
}

// Action function - handles form submissions
export async function action({ shopify, body }) {
  const { actionType } = body;

  if (actionType === 'createProduct') {
    try {
      const response = await shopify.graphql(`
        mutation {
          productCreate(input: {
            title: "Sample Product"
            productType: "Demo"
            vendor: "Ryziz Demo"
            status: DRAFT
          }) {
            product {
              id
              title
              handle
            }
            userErrors {
              field
              message
            }
          }
        }
      `);

      if (response.body.data.productCreate.userErrors.length > 0) {
        return {
          success: false,
          errors: response.body.data.productCreate.userErrors
        };
      }

      return {
        success: true,
        product: response.body.data.productCreate.product,
        redirect: '/app'  // Refresh to show new product
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  return {
    success: false,
    error: 'Unknown action'
  };
}

// Head metadata
export async function head({ data }) {
  return {
    title: data.shop ? `${data.shop.name} - Dashboard` : 'Dashboard',
    description: 'Manage your Shopify store'
  };
}

// React component for the dashboard
export default function Dashboard({ shop, products, error }) {
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <a href="/app" style={styles.retryButton}>Retry</a>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard</h1>
        <div style={styles.shopInfo}>
          <span style={styles.shopName}>{shop.name}</span>
          <span style={styles.shopPlan}>{shop.plan?.displayName || 'Free'}</span>
        </div>
      </div>

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{products.length}</div>
          <div style={styles.statLabel}>Products</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{shop.currencyCode}</div>
          <div style={styles.statLabel}>Currency</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{shop.primaryDomain?.host}</div>
          <div style={styles.statLabel}>Domain</div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Recent Products</h2>
          <form method="POST" style={{ display: 'inline' }}>
            <input type="hidden" name="actionType" value="createProduct" />
            <button type="submit" style={styles.createButton}>
              + Create Sample Product
            </button>
          </form>
        </div>

        {products.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No products found. Create your first product to get started!</p>
          </div>
        ) : (
          <div style={styles.productGrid}>
            {products.map(product => (
              <div key={product.id} style={styles.productCard}>
                {product.images?.edges?.[0] ? (
                  <img
                    src={product.images.edges[0].node.url}
                    alt={product.images.edges[0].node.altText || product.title}
                    style={styles.productImage}
                  />
                ) : (
                  <div style={styles.productImagePlaceholder}>
                    No Image
                  </div>
                )}
                <div style={styles.productInfo}>
                  <h3 style={styles.productTitle}>{product.title}</h3>
                  <div style={styles.productMeta}>
                    <span style={styles.productStatus(product.status)}>
                      {product.status}
                    </span>
                    {product.priceRange?.minVariantPrice && (
                      <span style={styles.productPrice}>
                        {product.priceRange.minVariantPrice.currencyCode} {product.priceRange.minVariantPrice.amount}
                      </span>
                    )}
                  </div>
                  <div style={styles.productInventory}>
                    Inventory: {product.totalInventory || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f7f7f7',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    padding: '20px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0'
  },
  shopInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  shopName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#666'
  },
  shopPlan: {
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#667eea',
    background: '#f0f2ff',
    borderRadius: '20px'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  statCard: {
    padding: '24px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    margin: '0'
  },
  createButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#999'
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px'
  },
  productCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s'
  },
  productImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover'
  },
  productImagePlaceholder: {
    width: '100%',
    height: '200px',
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af'
  },
  productInfo: {
    padding: '16px'
  },
  productTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 8px 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  productMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  productStatus: (status) => ({
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '4px',
    ...(status === 'ACTIVE' ? {
      color: '#059669',
      background: '#d1fae5'
    } : {
      color: '#d97706',
      background: '#fed7aa'
    })
  }),
  productPrice: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333'
  },
  productInventory: {
    fontSize: '13px',
    color: '#666'
  },
  errorCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '100px auto',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
  },
  loadingCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '100px auto',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
  },
  retryButton: {
    display: 'inline-block',
    marginTop: '16px',
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none'
  }
};