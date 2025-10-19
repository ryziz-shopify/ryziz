# Admin Routes Guide (Polaris)

Admin routes are embedded in the Shopify admin and use Polaris UI components. These routes are **automatically wrapped** with Polaris and App Bridge providers.

## The Magic

Create a file in `src/routes/app/` and Polaris just works:

```jsx
// src/routes/app/products.jsx → accessible at /app/products

import React from 'react';
import { Page, Card, Button } from '@shopify/polaris';

export default function Products() {
  return (
    <Page title="Products">
      <Card sectioned>
        <Button primary>Add Product</Button>
      </Card>
    </Page>
  );
}
```

**No provider setup needed!** The framework automatically:
- ✅ Wraps your component with `<AppProvider>` and `<AppBridgeProvider>`
- ✅ Loads Polaris CSS
- ✅ Configures App Bridge with your API key
- ✅ Handles Shopify authentication

## Creating Admin Routes

Any file in `src/routes/app/` becomes an admin route:

| File | URL | Protected |
|------|-----|-----------|
| `app/index.jsx` | `/app` | ✅ Yes |
| `app/products.jsx` | `/app/products` | ✅ Yes |
| `app/settings.jsx` | `/app/settings` | ✅ Yes |
| `app/orders/index.jsx` | `/app/orders` | ✅ Yes |
| `app/orders/[id].jsx` | `/app/orders/:id` | ✅ Yes |

**All `/app/*` routes are protected** - users must complete OAuth before accessing.

## Shopify Polaris Components

Import and use any Polaris component:

```jsx
import {
  Page,
  Layout,
  Card,
  Button,
  TextField,
  Select,
  ResourceList,
  ResourceItem,
  Badge,
  Banner,
  EmptyState,
  DataTable,
  FormLayout
} from '@shopify/polaris';
```

Full component list: [Polaris Components](https://polaris.shopify.com/components)

## Common Examples

### Dashboard with Stats

```jsx
// src/routes/app/index.jsx
import React from 'react';
import { Page, Layout, Card, Text } from '@shopify/polaris';

export async function loader({ shopify }) {
  const response = await shopify.graphql(`
    query {
      shop { name }
      productsCount: productsCount { count }
      ordersCount: ordersCount { count }
    }
  `);

  return response.body.data;
}

export default function Dashboard({ shop, productsCount, ordersCount }) {
  return (
    <Page title="Dashboard" subtitle={shop.name}>
      <Layout>
        <Layout.Section oneThird>
          <Card>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <Text variant="heading2xl" as="p">
                {productsCount.count}
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Products
              </Text>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section oneThird>
          <Card>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <Text variant="heading2xl" as="p">
                {ordersCount.count}
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Orders
              </Text>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section oneThird>
          <Card>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <Text variant="heading2xl" as="p">
                $0
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Revenue
              </Text>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
```

### Products List

```jsx
// src/routes/app/products.jsx
import React from 'react';
import {
  Page,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Badge,
  Button
} from '@shopify/polaris';

export async function loader({ shopify }) {
  const response = await shopify.graphql(`
    query {
      products(first: 50) {
        edges {
          node {
            id
            title
            status
            totalInventory
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `);

  return {
    products: response.body.data.products.edges.map(e => e.node)
  };
}

export default function Products({ products }) {
  return (
    <Page
      title="Products"
      primaryAction={{
        content: 'Add product',
        url: '/app/products/new'
      }}
    >
      <Card>
        <ResourceList
          resourceName={{ singular: 'product', plural: 'products' }}
          items={products}
          renderItem={(product) => {
            const { id, title, status, totalInventory, priceRange } = product;
            const price = `${priceRange.minVariantPrice.currencyCode} ${priceRange.minVariantPrice.amount}`;

            return (
              <ResourceItem
                id={id}
                url={`/app/products/${id}`}
                accessibilityLabel={`View details for ${title}`}
              >
                <Text variant="bodyMd" fontWeight="bold" as="h3">
                  {title}
                </Text>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <Badge tone={status === 'ACTIVE' ? 'success' : 'warning'}>
                    {status}
                  </Badge>
                  <Text variant="bodySm" as="span">
                    {price}
                  </Text>
                  <Text variant="bodySm" as="span" tone="subdued">
                    {totalInventory} in stock
                  </Text>
                </div>
              </ResourceItem>
            );
          }}
        />
      </Card>
    </Page>
  );
}
```

### Settings Form

```jsx
// src/routes/app/settings.jsx
import React, { useState, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  Banner
} from '@shopify/polaris';

export async function loader() {
  // Load settings from database
  return {
    apiKey: '',
    webhookUrl: '',
    syncFrequency: 'daily'
  };
}

export async function action({ body }) {
  const { apiKey, webhookUrl, syncFrequency } = body;

  // Save to database
  console.log('Saving settings:', { apiKey, webhookUrl, syncFrequency });

  return {
    success: true,
    message: 'Settings saved successfully!'
  };
}

export default function Settings({ apiKey, webhookUrl, syncFrequency, success, message }) {
  const [formData, setFormData] = useState({
    apiKey: apiKey || '',
    webhookUrl: webhookUrl || '',
    syncFrequency: syncFrequency || 'daily'
  });

  const handleChange = useCallback((field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section>
          {success && (
            <Banner status="success" title="Success">
              {message}
            </Banner>
          )}

          <Card sectioned>
            <form method="POST">
              <FormLayout>
                <TextField
                  label="API Key"
                  value={formData.apiKey}
                  onChange={handleChange('apiKey')}
                  name="apiKey"
                  autoComplete="off"
                />

                <TextField
                  label="Webhook URL"
                  value={formData.webhookUrl}
                  onChange={handleChange('webhookUrl')}
                  name="webhookUrl"
                  type="url"
                  helpText="URL to receive webhook notifications"
                />

                <Select
                  label="Sync Frequency"
                  options={[
                    { label: 'Every hour', value: 'hourly' },
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly', value: 'weekly' }
                  ]}
                  value={formData.syncFrequency}
                  onChange={handleChange('syncFrequency')}
                  name="syncFrequency"
                />

                <Button submit primary>
                  Save Settings
                </Button>
              </FormLayout>
            </form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
```

### Empty State

```jsx
// src/routes/app/templates.jsx
import React from 'react';
import { Page, Card, EmptyState, Button } from '@shopify/polaris';

export async function loader({ shopify }) {
  const response = await shopify.graphql(`
    query {
      products(first: 1, query: "tag:template") {
        edges {
          node { id }
        }
      }
    }
  `);

  return {
    hasTemplates: response.body.data.products.edges.length > 0
  };
}

export default function Templates({ hasTemplates }) {
  if (!hasTemplates) {
    return (
      <Page title="Templates">
        <Card sectioned>
          <EmptyState
            heading="No templates yet"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            action={{
              content: 'Create template',
              url: '/app/templates/new'
            }}
          >
            <p>Create your first product template to get started</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  return <Page title="Templates">{/* Show templates */}</Page>;
}
```

### Data Table

```jsx
// src/routes/app/analytics.jsx
import React from 'react';
import { Page, Card, DataTable } from '@shopify/polaris';

export async function loader({ shopify }) {
  const response = await shopify.graphql(`
    query {
      orders(first: 20) {
        edges {
          node {
            id
            name
            createdAt
            totalPrice
            customer {
              displayName
            }
          }
        }
      }
    }
  `);

  return {
    orders: response.body.data.orders.edges.map(e => e.node)
  };
}

export default function Analytics({ orders }) {
  const rows = orders.map(order => [
    order.name,
    order.customer?.displayName || 'Guest',
    order.totalPrice,
    new Date(order.createdAt).toLocaleDateString()
  ]);

  return (
    <Page title="Recent Orders">
      <Card>
        <DataTable
          columnContentTypes={['text', 'text', 'numeric', 'text']}
          headings={['Order', 'Customer', 'Total', 'Date']}
          rows={rows}
        />
      </Card>
    </Page>
  );
}
```

## Fetching Shopify Data

Use the `shopify` object in your `loader()`:

```jsx
export async function loader({ shopify }) {
  // GraphQL query
  const response = await shopify.graphql(`
    query {
      shop {
        name
        email
        currencyCode
      }
      products(first: 10) {
        edges {
          node {
            id
            title
            status
          }
        }
      }
    }
  `);

  return response.body.data;
}
```

### GraphQL Mutations

```jsx
export async function action({ shopify, body }) {
  const { title, description } = body;

  const response = await shopify.graphql(`
    mutation {
      productCreate(input: {
        title: "${title}"
        descriptionHtml: "${description}"
        status: DRAFT
      }) {
        product {
          id
          title
        }
        userErrors {
          field
          message
        }
      }
    }
  `);

  const result = response.body.data.productCreate;

  if (result.userErrors.length > 0) {
    return {
      success: false,
      errors: result.userErrors
    };
  }

  return {
    success: true,
    product: result.product
  };
}
```

## Form Handling

Forms in admin routes work the same as public routes:

```jsx
export async function action({ shopify, body }) {
  const { productId, quantity } = body;

  // Update inventory
  await shopify.graphql(`
    mutation {
      inventoryAdjustQuantity(input: {
        inventoryLevelId: "${productId}"
        availableDelta: ${quantity}
      }) {
        inventoryLevel { available }
      }
    }
  `);

  return { success: true };
}

export default function InventoryUpdate({ success }) {
  return (
    <Page title="Update Inventory">
      <Card sectioned>
        <form method="POST">
          <FormLayout>
            <TextField
              label="Product ID"
              name="productId"
            />
            <TextField
              label="Quantity to Add"
              name="quantity"
              type="number"
            />
            <Button submit primary>Update</Button>
          </FormLayout>
        </form>
        {success && <Banner status="success">Updated!</Banner>}
      </Card>
    </Page>
  );
}
```

## App Bridge Features

Your routes automatically have access to App Bridge for:

### Navigation

```jsx
import { useNavigate } from '@shopify/app-bridge-react';

export default function MyPage() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/app/products');
  };

  return <Button onClick={handleClick}>Go to Products</Button>;
}
```

### Toasts

```jsx
import { useAppBridge } from '@shopify/app-bridge-react';
import { Toast } from '@shopify/app-bridge/actions';

export default function MyPage() {
  const app = useAppBridge();

  const showToast = () => {
    const toast = Toast.create(app, {
      message: 'Product saved!',
      duration: 3000
    });
    toast.dispatch(Toast.Action.SHOW);
  };

  return <Button onClick={showToast}>Save</Button>;
}
```

### Modals

```jsx
import { Modal } from '@shopify/app-bridge-react';

export default function MyPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal
        open={isOpen}
        title="Confirm Action"
        onClose={() => setIsOpen(false)}
        primaryAction={{
          content: 'Confirm',
          onAction: () => {
            // Do something
            setIsOpen(false);
          }
        }}
      >
        <Modal.Section>
          <p>Are you sure?</p>
        </Modal.Section>
      </Modal>
    </>
  );
}
```

## Dynamic Routes

Create dynamic routes with `[parameter]` syntax:

```jsx
// src/routes/app/products/[id].jsx → /app/products/:id

export async function loader({ params, shopify }) {
  const { id } = params;

  const response = await shopify.graphql(`
    query {
      product(id: "${id}") {
        id
        title
        description
        status
      }
    }
  `);

  return { product: response.body.data.product };
}

export default function ProductDetail({ product }) {
  return (
    <Page
      title={product.title}
      backAction={{ url: '/app/products' }}
    >
      <Card sectioned>
        <p>{product.description}</p>
        <Badge>{product.status}</Badge>
      </Card>
    </Page>
  );
}
```

## Error Handling

Show errors to users with Banners:

```jsx
export async function loader({ shopify }) {
  try {
    const response = await shopify.graphql(`query { ... }`);
    return { data: response.body.data };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

export default function MyPage({ data, error }) {
  if (error) {
    return (
      <Page title="Error">
        <Banner status="critical" title="Error loading data">
          <p>{error}</p>
        </Banner>
      </Page>
    );
  }

  return <Page title="Data">{/* ... */}</Page>;
}
```

## Loading States

Use Polaris skeleton components:

```jsx
import { SkeletonPage, SkeletonBodyText, Card } from '@shopify/polaris';

export default function MyPage({ data }) {
  if (!data) {
    return (
      <SkeletonPage primaryAction>
        <Card sectioned>
          <SkeletonBodyText />
        </Card>
      </SkeletonPage>
    );
  }

  return <Page>{/* ... */}</Page>;
}
```

## Best Practices

### Use Page Component

Always wrap your content in `<Page>`:

```jsx
// ✅ Good
<Page title="Products">
  <Card>Content</Card>
</Page>

// ❌ Bad - missing Page wrapper
<div>
  <Card>Content</Card>
</div>
```

### Use Layout for Structure

```jsx
<Page title="Dashboard">
  <Layout>
    <Layout.Section oneThird>
      <Card>Stat 1</Card>
    </Layout.Section>
    <Layout.Section oneThird>
      <Card>Stat 2</Card>
    </Layout.Section>
  </Layout>
</Page>
```

### Proper Form Handling

```jsx
// ✅ Good - uses action()
export async function action({ body }) {
  // Handle form
  return { success: true };
}

// ❌ Bad - client-side only
const handleSubmit = (e) => {
  e.preventDefault();
  // This won't work with SSR
};
```

## Resources

- **Polaris Components**: https://polaris.shopify.com/components
- **App Bridge Docs**: https://shopify.dev/docs/api/app-bridge
- **Shopify GraphQL**: https://shopify.dev/docs/api/admin-graphql

## Next Steps

- ✅ Build your dashboard in `src/routes/app/index.jsx`
- ✅ Create product management pages
- ✅ Add settings and configuration
- ✅ Explore [Polaris components](https://polaris.shopify.com/components)

---

**Need public pages?** See the [Public Routes Guide](../README.md)
