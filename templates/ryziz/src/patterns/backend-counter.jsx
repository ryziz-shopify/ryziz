import { useState, useEffect } from 'react';

export const metadata = {
  id: 'backend-counter',
  title: 'Backend - Counter',
  description: 'Interactive counter with Firestore persistence via API endpoints',
  category: 'backend'
};

export default function BackendCounter() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch initial counter value on mount
  useEffect(() => {
    const fetchCounter = async () => {
      try {
        const response = await fetch('/api/demo');
        const data = await response.json();
        setCount(data.counter);
      } catch (error) {
        console.error('Failed to fetch counter:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounter();
  }, []);

  const increment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'increment' })
      });
      const data = await response.json();
      setCount(data.counter);
    } catch (error) {
      console.error('Failed to increment:', error);
    } finally {
      setLoading(false);
    }
  };

  const decrement = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decrement' })
      });
      const data = await response.json();
      setCount(data.counter);
    } catch (error) {
      console.error('Failed to decrement:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Pattern overview section */}
      <s-section>
        <s-heading>Backend - Counter</s-heading>
        <s-paragraph>
          This pattern demonstrates how to interact with Firestore through API endpoints. The counter value is stored in
          Firestore and persists across sessions.
        </s-paragraph>
      </s-section>

      {/* Demo section */}
      <s-section>
        <s-grid gap="base">
          {/* Counter display */}
          <s-box padding="base" background="subdued" borderRadius="base">
            <s-heading>Count: {count}</s-heading>
          </s-box>

          {/* Action buttons */}
          <s-stack direction="inline" gap="base">
            <s-button variant="primary" onClick={increment} disabled={loading}>
              Increment
            </s-button>
            <s-button variant="secondary" onClick={decrement} disabled={loading}>
              Decrement
            </s-button>
          </s-stack>
        </s-grid>
      </s-section>
    </>
  );
}
