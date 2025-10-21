import React from 'react';
import { Page, Layout, Card, ResourceList, ResourceItem, Text, Badge, Button, Banner, EmptyState, SkeletonPage, SkeletonBodyText } from '@shopify/polaris';

// GraphQL Queries
const SHOP_QUERY = `
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
`;

const CREATE_PRODUCT_MUTATION = `
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
`;

// Loader function - runs on the server with Shopify context
export async function loader({ shopify }) {
  try {
    const response = await shopify.graphql(SHOP_QUERY);
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
      const response = await shopify.graphql(CREATE_PRODUCT_MUTATION);

      if (response.body.data.productCreate.userErrors.length > 0) {
        return {
          success: false,
          errors: response.body.data.productCreate.userErrors
        };
      }

      return {
        success: true,
        product: response.body.data.productCreate.product,
        redirect: '/app'
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
export default function Dashboard({ shop, products, error, success }) {
  if (error) {
    return (
      <Page title="Dashboard">
        <Layout>
          <Layout.Section>
            <Banner status="critical" title="Error Loading Dashboard">
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (!shop) {
    return (
      <SkeletonPage primaryAction>
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <SkeletonBodyText />
            </Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  const statsMarkup = (
    <Layout>
      <Layout.Section oneThird>
        <Card>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Text variant="heading2xl" as="p">{products.length}</Text>
            <Text variant="bodyMd" as="p" tone="subdued">Products</Text>
          </div>
        </Card>
      </Layout.Section>
      <Layout.Section oneThird>
        <Card>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Text variant="heading2xl" as="p">{shop.currencyCode}</Text>
            <Text variant="bodyMd" as="p" tone="subdued">Currency</Text>
          </div>
        </Card>
      </Layout.Section>
      <Layout.Section oneThird>
        <Card>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Text variant="heading2xl" as="p">{shop.primaryDomain?.host}</Text>
            <Text variant="bodyMd" as="p" tone="subdued">Domain</Text>
          </div>
        </Card>
      </Layout.Section>
    </Layout>
  );

  const createProductAction = (
    <form method="POST" style={{ display: 'inline' }}>
      <input type="hidden" name="actionType" value="createProduct" />
      <Button submit primary>Create Sample Product</Button>
    </form>
  );

  return (
    <Page
      title="Dashboard"
      subtitle={shop.name}
      titleMetadata={<Badge tone="info">{shop.plan?.displayName || 'Free'}</Badge>}
    >
      <Layout>
        {success && (
          <Layout.Section>
            <Banner status="success" title="Success">
              <p>Product created successfully!</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          {statsMarkup}
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e3e3e3' }}>
              <Text variant="headingMd" as="h2">Recent Products</Text>
              {createProductAction}
            </div>
            {products.length === 0 ? (
              <EmptyState
                heading="No products found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Create your first product to get started!</p>
              </EmptyState>
            ) : (
              <ResourceList
                resourceName={{ singular: 'product', plural: 'products' }}
                items={products}
                renderItem={renderProductItem}
              />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

/**
 * Render individual product item in list
 */
function renderProductItem(product) {
  const { id, title, status, priceRange, totalInventory, images } = product;

  const media = images?.edges?.[0] ? (
    <img
      src={images.edges[0].node.url}
      alt={images.edges[0].node.altText || title}
      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
    />
  ) : undefined;

  const price = priceRange?.minVariantPrice
    ? `${priceRange.minVariantPrice.currencyCode} ${priceRange.minVariantPrice.amount}`
    : 'No price';

  return (
    <ResourceItem
      id={id}
      media={media}
      accessibilityLabel={`View details for ${title}`}
    >
      <Text variant="bodyMd" fontWeight="bold" as="h3">
        {title}
      </Text>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center' }}>
        <Badge tone={status === 'ACTIVE' ? 'success' : 'warning'}>
          {status}
        </Badge>
        <Text variant="bodySm" as="span">{price}</Text>
        <Text variant="bodySm" as="span" tone="subdued">
          Inventory: {totalInventory || 0}
        </Text>
      </div>
    </ResourceItem>
  );
}
