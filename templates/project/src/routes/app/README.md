# Admin Routes Guide (Polaris)

Admin routes are embedded in Shopify admin and use Polaris UI. They're **automatically wrapped** with Polaris providers.

## The Magic

Create file in `src/routes/app/` and Polaris just works:

```jsx
// src/routes/app/products.jsx → /app/products

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

**No provider setup needed!** Framework automatically:
- ✅ Wraps with `<AppProvider>` and `<AppBridgeProvider>`
- ✅ Loads Polaris CSS
- ✅ Handles authentication
- ✅ Provides GraphQL client

## Creating Routes

| File | URL | Protected |
|------|-----|-----------|
| `app/index.jsx` | `/app` | ✅ Yes |
| `app/products.jsx` | `/app/products` | ✅ Yes |
| `app/products/[id].jsx` | `/app/products/:id` | ✅ Yes |

All `/app/*` routes require OAuth.

## Polaris Components

```jsx
import {
  Page,
  Layout,
  Card,
  Button,
  TextField,
  ResourceList,
  Badge,
  Banner,
  EmptyState,
  DataTable
} from '@shopify/polaris';
```

[Full component list →](https://polaris.shopify.com/components)

## Dashboard Example

```jsx
// src/routes/app/index.jsx
import { Page, Layout, Card, Text } from '@shopify/polaris';

export async function loader({ shopify }) {
  const response = await shopify.graphql(`
    query {
      shop { name }
      productsCount: productsCount { count }
    }
  `);
  return response.body.data;
}

export default function Dashboard({ shop, productsCount }) {
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
      </Layout>
    </Page>
  );
}
```

## Products List

```jsx
import { Page, Card, ResourceList, ResourceItem, Text } from '@shopify/polaris';

export async function loader({ shopify }) {
  const response = await shopify.graphql(`
    query {
      products(first: 50) {
        edges {
          node { id title status }
        }
      }
    }
  `);
  return { products: response.body.data.products.edges.map(e => e.node) };
}

export default function Products({ products }) {
  return (
    <Page title="Products">
      <Card>
        <ResourceList
          resourceName={{ singular: 'product', plural: 'products' }}
          items={products}
          renderItem={(product) => (
            <ResourceItem id={product.id} url={`/app/products/${product.id}`}>
              <Text variant="bodyMd" fontWeight="bold">{product.title}</Text>
            </ResourceItem>
          )}
        />
      </Card>
    </Page>
  );
}
```

## Settings Form

```jsx
import { Page, Card, FormLayout, TextField, Button } from '@shopify/polaris';

export async function action({ body }) {
  const { apiKey } = body;
  // Save to database
  return { success: true };
}

export default function Settings({ success }) {
  return (
    <Page title="Settings">
      <Card sectioned>
        <form method="POST">
          <FormLayout>
            <TextField label="API Key" name="apiKey" />
            <Button submit primary>Save Settings</Button>
          </FormLayout>
        </form>
        {success && <Banner status="success">Saved!</Banner>}
      </Card>
    </Page>
  );
}
```

## Fetching Shopify Data

```jsx
export async function loader({ shopify }) {
  const response = await shopify.graphql(`
    query {
      shop { name email }
      products(first: 10) {
        edges {
          node { id title }
        }
      }
    }
  `);
  return response.body.data;
}
```

## Mutations

```jsx
export async function action({ shopify, body }) {
  const { title } = body;

  const response = await shopify.graphql(`
    mutation {
      productCreate(input: { title: "${title}" }) {
        product { id }
        userErrors { field message }
      }
    }
  `);

  const result = response.body.data.productCreate;

  if (result.userErrors.length > 0) {
    return { success: false, errors: result.userErrors };
  }

  return { success: true, product: result.product };
}
```

## Dynamic Routes

```jsx
// src/routes/app/products/[id].jsx → /app/products/:id

export async function loader({ params, shopify }) {
  const { id } = params;
  const response = await shopify.graphql(`
    query {
      product(id: "${id}") { id title description }
    }
  `);
  return { product: response.body.data.product };
}

export default function ProductDetail({ product }) {
  return (
    <Page title={product.title} backAction={{ url: '/app/products' }}>
      <Card sectioned>
        <p>{product.description}</p>
      </Card>
    </Page>
  );
}
```

## App Bridge Features

```jsx
import { useNavigate } from '@shopify/app-bridge-react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Toast } from '@shopify/app-bridge/actions';

export default function MyPage() {
  const navigate = useNavigate();
  const app = useAppBridge();

  const handleClick = () => {
    navigate('/app/products');
  };

  const showToast = () => {
    const toast = Toast.create(app, { message: 'Saved!', duration: 3000 });
    toast.dispatch(Toast.Action.SHOW);
  };

  return <Button onClick={showToast}>Save</Button>;
}
```

## Best Practices

### Always use Page wrapper
```jsx
// ✅ Good
<Page title="Products">
  <Card>Content</Card>
</Page>

// ❌ Bad
<div>
  <Card>Content</Card>
</div>
```

### Use server actions for forms
```jsx
// ✅ Good
export async function action({ body }) {
  return { success: true };
}

// ❌ Bad - won't work with SSR
const handleSubmit = (e) => {
  e.preventDefault();
};
```

## Resources

- [Polaris Components](https://polaris.shopify.com/components)
- [App Bridge Docs](https://shopify.dev/docs/api/app-bridge)
- [Shopify GraphQL](https://shopify.dev/docs/api/admin-graphql)

## Next Steps

- Build dashboard in `src/routes/app/index.jsx`
- Create product management pages
- Explore [Polaris components](https://polaris.shopify.com/components)

---

**Need public pages?** See [Public Routes Guide](../README.md)
