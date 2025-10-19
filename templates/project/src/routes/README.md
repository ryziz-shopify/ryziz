# Public Routes Guide

Public routes are accessible without Shopify authentication. Use for landing pages, marketing, install flows.

## Creating a Route

Create `.jsx` file in `src/routes/`:

```jsx
// src/routes/contact.jsx → /contact

import React from 'react';

export async function loader() {
  return { email: 'support@example.com' };
}

export default function Contact({ email }) {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
      <h1>Contact Us</h1>
      <p>Email: {email}</p>
    </div>
  );
}
```

## Styling

Use inline styles, style objects, or CSS-in-JS libraries:

```jsx
const styles = {
  container: {
    padding: '40px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }
};

export default function Landing() {
  return <div style={styles.container}>Welcome</div>;
}
```

## Landing Page Example

```jsx
// src/routes/index.jsx
export default function Landing() {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1>Amazing App</h1>
        <a href="/auth" style={styles.button}>Install App</a>
      </header>

      <section style={styles.hero}>
        <h2>Grow Your Shopify Store</h2>
        <form method="GET" action="/auth">
          <input
            name="shop"
            type="text"
            placeholder="your-store.myshopify.com"
            required
          />
          <button type="submit">Install Now</button>
        </form>
      </section>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  header: {
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between'
  },
  hero: {
    textAlign: 'center',
    padding: '100px 20px',
    color: 'white'
  },
  button: {
    background: 'white',
    color: '#667eea',
    padding: '10px 20px',
    borderRadius: '8px',
    textDecoration: 'none'
  }
};
```

## Form Handling

```jsx
export async function action({ body }) {
  const { email } = body;
  // Save to database, send email, etc.
  return { success: true };
}

export default function Newsletter({ success }) {
  return (
    <form method="POST">
      <input name="email" type="email" />
      <button type="submit">Subscribe</button>
      {success && <p>Thanks!</p>}
    </form>
  );
}
```

## Important Restrictions

### ❌ Cannot Import Polaris

```jsx
// ❌ This will ERROR
import { Button } from '@shopify/polaris';
```

**Error:** Polaris components can only be imported in `/app/*` routes

**Solution:** Use custom components or move to `/app/*`

```jsx
// ✅ Use custom button
const CustomButton = ({ children }) => (
  <button style={{ padding: '12px 24px', background: '#667eea' }}>
    {children}
  </button>
);
```

## Redirects

```jsx
export async function loader({ query }) {
  if (query.install) {
    return { redirect: '/auth?shop=' + query.shop };
  }
  return { data: 'something' };
}
```

## Next Steps

- Create landing page in `src/routes/index.jsx`
- Build admin dashboard in [`src/routes/app/`](./app/README.md)
