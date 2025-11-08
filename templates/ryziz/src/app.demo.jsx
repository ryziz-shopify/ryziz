import { useState } from 'react';
import { Link } from '@ryziz-shopify/router';

// Import metadata from all patterns
import { metadata as accountConnection } from './patterns/account-connection.jsx';
import { metadata as appCard } from './patterns/app-card.jsx';
import { metadata as calloutCard } from './patterns/callout-card.jsx';
import { metadata as details } from './patterns/details.jsx';
import { metadata as emptyState } from './patterns/empty-state.jsx';
import { metadata as footerHelp } from './patterns/footer-help.jsx';
import { metadata as indexTable } from './patterns/index-table.jsx';
import { metadata as interstitialNav } from './patterns/interstitial-nav.jsx';
import { metadata as mediaCard } from './patterns/media-card.jsx';
import { metadata as metricsCard } from './patterns/metrics-card.jsx';
import { metadata as resourceList } from './patterns/resource-list.jsx';
import { metadata as setupGuide } from './patterns/setup-guide.jsx';
import { metadata as backendStorename } from './patterns/backend-storename.jsx';
import { metadata as backendCounter } from './patterns/backend-counter.jsx';

export default function Demo() {
  const [searchQuery, setSearchQuery] = useState('');

  // All patterns array from metadata
  const allPatterns = [
    accountConnection,
    appCard,
    calloutCard,
    emptyState,
    footerHelp,
    indexTable,
    interstitialNav,
    mediaCard,
    metricsCard,
    resourceList,
    setupGuide,
    backendStorename,
    backendCounter
  ];

  // Filter patterns based on search query (case-insensitive)
  const filteredPatterns = allPatterns.filter((pattern) => {
    const query = searchQuery.toLowerCase();
    return (
      pattern.title.toLowerCase().includes(query) ||
      pattern.description.toLowerCase().includes(query)
    );
  });

  return (
    <s-page heading="Ryziz Patterns Demo">
      <s-link slot="breadcrumb-actions" href="/app">
        Welcome to Ryziz!
      </s-link>

      {/* Search section */}
      <s-section>
        <s-search-field
          label="Search patterns"
          labelAccessibilityVisibility="exclusive"
          placeholder="Search by name or description"
          value={searchQuery}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
        />
      </s-section>

      {/* Patterns list section */}
      <s-section>
        <s-grid gap="base">
          {filteredPatterns.length === 0 ? (
            // Empty state when no patterns match search
            <s-box padding="base" background="subdued" borderRadius="base">
              <s-paragraph>No patterns found matching "{searchQuery}"</s-paragraph>
            </s-box>
          ) : (
            // Display filtered patterns
            filteredPatterns.map((pattern) => (
              <Link key={pattern.id} to={`/app/demo/${pattern.id}`}>
                <s-clickable
                  border="base"
                  borderRadius="base"
                  padding="base"
                  inlineSize="100%"
                >
                  <s-grid gap="small">
                    <s-stack direction="inline" gap="small-200" alignItems="center">
                      <s-heading>{pattern.title}</s-heading>
                      <s-badge tone={pattern.category === 'backend' ? 'info' : 'neutral'}>
                        {pattern.category}
                      </s-badge>
                    </s-stack>
                    <s-paragraph color="subdued">{pattern.description}</s-paragraph>
                  </s-grid>
                </s-clickable>
              </Link>
            ))
          )}
        </s-grid>
      </s-section>

      {/* Summary section */}
      <s-section>
        <s-paragraph color="subdued">
          Showing {filteredPatterns.length} of {allPatterns.length} patterns
        </s-paragraph>
      </s-section>
    </s-page>
  );
}
