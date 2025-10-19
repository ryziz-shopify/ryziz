# Public Routes Guide

Public routes are pages accessible to anyone without Shopify authentication. Use them for:
- Landing pages
- Marketing pages
- Install flows
- Contact pages
- Pricing pages
- Documentation

## Creating a Public Route

Create a `.jsx` file in `src/routes/`:

```jsx
// src/routes/contact.jsx → accessible at /contact

import React from 'react';

export async function loader() {
  return {
    email: 'support@example.com',
    phone: '1-800-SHOPIFY'
  };
}

export async function head() {
  return {
    title: 'Contact Us',
    description: 'Get in touch with our team'
  };
}

export default function Contact({ email, phone }) {
  return (
    <div style={styles.container}>
      <h1>Contact Us</h1>
      <p>Email: {email}</p>
      <p>Phone: {phone}</p>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px'
  }
};
```

## Styling Public Routes

Public routes use **custom React styles**. No Polaris components allowed.

### Option 1: Inline Styles

```jsx
export default function Landing() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '48px', color: '#333' }}>
        Welcome to Our App
      </h1>
    </div>
  );
}
```

### Option 2: Style Objects

```jsx
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '40px'
  },
  title: {
    fontSize: '48px',
    color: 'white',
    textAlign: 'center'
  }
};

export default function Landing() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome</h1>
    </div>
  );
}
```

### Option 3: CSS-in-JS Libraries

You can install and use any CSS-in-JS library:

```bash
npm install styled-components
```

```jsx
import styled from 'styled-components';

const Container = styled.div`
  padding: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

export default function Landing() {
  return <Container><h1>Welcome</h1></Container>;
}
```

## Common Public Route Examples

### Landing Page

```jsx
// src/routes/index.jsx
import React from 'react';

export async function head() {
  return {
    title: 'Amazing Shopify App - Install Now',
    description: 'Boost your store with our powerful features'
  };
}

export default function Landing() {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.logo}>Amazing App</h1>
        <nav>
          <a href="/pricing" style={styles.link}>Pricing</a>
          <a href="/contact" style={styles.link}>Contact</a>
          <a href="/auth" style={styles.installButton}>Install App</a>
        </nav>
      </header>

      <section style={styles.hero}>
        <h2 style={styles.heroTitle}>Grow Your Shopify Store</h2>
        <p style={styles.heroSubtitle}>
          Powerful features to boost sales and automate workflows
        </p>
        <form method="GET" action="/auth" style={styles.installForm}>
          <input
            name="shop"
            type="text"
            placeholder="your-store.myshopify.com"
            style={styles.input}
            required
          />
          <button type="submit" style={styles.submitButton}>
            Install Now - Free
          </button>
        </form>
      </section>

      <section style={styles.features}>
        <h3>Features</h3>
        <div style={styles.featureGrid}>
          <div style={styles.featureCard}>
            <h4>Feature 1</h4>
            <p>Description of amazing feature</p>
          </div>
          <div style={styles.featureCard}>
            <h4>Feature 2</h4>
            <p>Another great feature</p>
          </div>
          <div style={styles.featureCard}>
            <h4>Feature 3</h4>
            <p>Even more features</p>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  header: {
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.1)',
  },
  logo: {
    color: 'white',
    fontSize: '24px',
    margin: 0
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    marginLeft: '20px'
  },
  installButton: {
    background: 'white',
    color: '#667eea',
    padding: '10px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
    marginLeft: '20px',
    fontWeight: '600'
  },
  hero: {
    textAlign: 'center',
    padding: '100px 20px',
    color: 'white'
  },
  heroTitle: {
    fontSize: '56px',
    margin: '0 0 16px 0'
  },
  heroSubtitle: {
    fontSize: '20px',
    opacity: 0.9,
    marginBottom: '40px'
  },
  installForm: {
    maxWidth: '500px',
    margin: '0 auto',
    display: 'flex',
    gap: '12px'
  },
  input: {
    flex: 1,
    padding: '16px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '8px'
  },
  submitButton: {
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    background: '#1a1a1a',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  features: {
    padding: '80px 40px',
    background: 'white',
    textAlign: 'center'
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '32px',
    marginTop: '40px'
  },
  featureCard: {
    padding: '32px',
    background: '#f7f7f7',
    borderRadius: '12px'
  }
};
```

### Pricing Page

```jsx
// src/routes/pricing.jsx
import React from 'react';

export async function head() {
  return {
    title: 'Pricing - Simple & Affordable',
    description: 'Choose the perfect plan for your store'
  };
}

export default function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: '$9/month',
      features: ['Feature 1', 'Feature 2', 'Email support']
    },
    {
      name: 'Pro',
      price: '$29/month',
      features: ['Everything in Starter', 'Feature 3', 'Feature 4', 'Priority support'],
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      features: ['Everything in Pro', 'Custom features', 'Dedicated support']
    }
  ];

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Choose Your Plan</h1>
      <div style={styles.grid}>
        {plans.map(plan => (
          <div
            key={plan.name}
            style={{
              ...styles.card,
              ...(plan.popular ? styles.popularCard : {})
            }}
          >
            {plan.popular && <span style={styles.badge}>Popular</span>}
            <h2>{plan.name}</h2>
            <p style={styles.price}>{plan.price}</p>
            <ul style={styles.features}>
              {plan.features.map(feature => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <a href="/auth" style={styles.button}>Get Started</a>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: '80px 40px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  title: {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '60px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '32px'
  },
  card: {
    padding: '40px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    textAlign: 'center',
    position: 'relative'
  },
  popularCard: {
    borderColor: '#667eea',
    boxShadow: '0 10px 40px rgba(102, 126, 234, 0.2)',
    transform: 'scale(1.05)'
  },
  badge: {
    position: 'absolute',
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#667eea',
    color: 'white',
    padding: '4px 16px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600'
  },
  price: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '20px 0'
  },
  features: {
    listStyle: 'none',
    padding: 0,
    margin: '32px 0',
    textAlign: 'left'
  },
  button: {
    display: 'inline-block',
    padding: '12px 32px',
    background: '#667eea',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600'
  }
};
```

### Contact Page with Form

```jsx
// src/routes/contact.jsx
import React from 'react';

export async function action({ body }) {
  const { name, email, message } = body;

  // Send email, save to database, etc.
  console.log('Contact form:', { name, email, message });

  return {
    success: true,
    message: 'Thanks! We\'ll get back to you soon.'
  };
}

export default function Contact({ success, message }) {
  return (
    <div style={styles.page}>
      <h1>Contact Us</h1>

      {success && (
        <div style={styles.successBanner}>
          {message}
        </div>
      )}

      <form method="POST" style={styles.form}>
        <label style={styles.label}>
          Name
          <input
            name="name"
            type="text"
            required
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Email
          <input
            name="email"
            type="email"
            required
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Message
          <textarea
            name="message"
            rows="5"
            required
            style={styles.textarea}
          />
        </label>

        <button type="submit" style={styles.button}>
          Send Message
        </button>
      </form>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px'
  },
  successBanner: {
    padding: '16px',
    background: '#d1fae5',
    color: '#059669',
    borderRadius: '8px',
    marginBottom: '24px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600'
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px'
  },
  textarea: {
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontFamily: 'inherit'
  },
  button: {
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  }
};
```

## Important Restrictions

### ❌ Cannot Import Polaris

```jsx
// ❌ This will ERROR in public routes
import { Button } from '@shopify/polaris';

export default function Landing() {
  return <Button>Click me</Button>;  // Error!
}
```

**Error message:**
```
Error: Polaris components can only be imported in /app/* routes.
Found '@shopify/polaris' import in: /landing-page

Move this route to /app/ or use custom components instead.
```

**Solution:** Use custom HTML/CSS or move to `/app/*` route.

### ✅ Use Custom Components Instead

```jsx
// ✅ Create your own button component
const CustomButton = ({ children, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '12px 24px',
      background: '#667eea',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer'
    }}
  >
    {children}
  </button>
);

export default function Landing() {
  return <CustomButton>Install Now</CustomButton>;
}
```

## Data Loading

Use the `loader()` function to fetch data on the server:

```jsx
export async function loader({ query }) {
  // Fetch from API
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();

  return { data };
}

export default function MyPage({ data }) {
  return <div>{JSON.stringify(data)}</div>;
}
```

## Form Handling

Use the `action()` function to handle form submissions:

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
      {success && <p>Thanks for subscribing!</p>}
    </form>
  );
}
```

## Redirects

Redirect users to other pages:

```jsx
export async function loader({ query }) {
  if (query.install) {
    return { redirect: '/auth?shop=' + query.shop };
  }

  return { data: 'something' };
}
```

## Next Steps

- ✅ Create your landing page in `src/routes/index.jsx`
- ✅ Add pricing page in `src/routes/pricing.jsx`
- ✅ Build your admin dashboard in [`src/routes/app/`](./app/README.md)

---

**Need admin pages with Polaris?** See the [Admin Routes Guide](./app/README.md)
