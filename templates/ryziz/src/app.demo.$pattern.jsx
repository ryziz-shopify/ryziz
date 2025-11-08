import { useParams, Link } from '@ryziz-shopify/router';

// Import all pattern components
import AccountConnection from './patterns/account-connection.jsx';
import AppCard from './patterns/app-card.jsx';
import CalloutCard from './patterns/callout-card.jsx';
import Details from './patterns/details.jsx';
import EmptyState from './patterns/empty-state.jsx';
import FooterHelp from './patterns/footer-help.jsx';
import IndexTable from './patterns/index-table.jsx';
import InterstitialNav from './patterns/interstitial-nav.jsx';
import MediaCard from './patterns/media-card.jsx';
import MetricsCard from './patterns/metrics-card.jsx';
import ResourceList from './patterns/resource-list.jsx';
import SetupGuide from './patterns/setup-guide.jsx';
import BackendStorename from './patterns/backend-storename.jsx';
import BackendCounter from './patterns/backend-counter.jsx';

export default function DemoPattern() {
  const { pattern } = useParams();

  // Map pattern IDs to components
  const patterns = {
    'account-connection': AccountConnection,
    'app-card': AppCard,
    'callout-card': CalloutCard,
    'details': Details,
    'empty-state': EmptyState,
    'footer-help': FooterHelp,
    'index-table': IndexTable,
    'interstitial-nav': InterstitialNav,
    'media-card': MediaCard,
    'metrics-card': MetricsCard,
    'resource-list': ResourceList,
    'setup-guide': SetupGuide,
    'backend-storename': BackendStorename,
    'backend-counter': BackendCounter
  };

  const PatternComponent = patterns[pattern];

  // Show 404 empty state if pattern not found
  if (!PatternComponent) {
    return (
      <s-page heading="Pattern Not Found">
        <s-link slot="breadcrumb-actions" href="/app/demo">
          Ryziz Patterns Demo
        </s-link>

        <s-section accessibilityLabel="Pattern not found empty state">
          <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
            <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
              <s-stack alignItems="center">
                <s-heading>Pattern not found</s-heading>
                <s-paragraph>
                  The pattern "{pattern}" does not exist. Please check the URL or return to the demo list.
                </s-paragraph>
              </s-stack>
              <Link to="/app/demo">
                <s-button variant="primary">Back to Demo List</s-button>
              </Link>
            </s-grid>
          </s-grid>
        </s-section>
      </s-page>
    );
  }

  // Render the pattern component
  return (
    <s-page heading={`Pattern: ${pattern}`}>
      {/* Breadcrumb back to demo list */}
      <s-link slot="breadcrumb-actions" href="/app/demo">
        Ryziz Patterns Demo
      </s-link>

      {/* Render pattern component */}
      <PatternComponent />
    </s-page>
  );
}
