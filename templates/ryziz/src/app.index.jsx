import { Link } from '@ryziz-shopify/router';

export default function AppIndex() {
  return (
    <s-page heading="Welcome to Ryziz!">
      {/* Welcome Section */}
      <s-section>
        <s-grid gap="base">
          <s-paragraph>
            Hey there! We've set up some demo pages to help you get started with building your Shopify app.
            Feel free to explore them to see what's possible with Ryziz.
          </s-paragraph>
        </s-grid>
      </s-section>

      {/* Full Layout Demos */}
      <s-section heading="Full Page Layouts">
        <s-grid gap="base">
          <Link to="/app/demo/homepage">
            <s-clickable
              border="base"
              borderRadius="base"
              padding="base"
              inlineSize="100%"
            >
              <s-grid gap="small">
                <s-heading>Homepage</s-heading>
                <s-paragraph color="subdued">
                  Complete homepage with banner, setup guide, metrics, templates, news, and featured apps
                </s-paragraph>
              </s-grid>
            </s-clickable>
          </Link>

          <Link to="/app/demo/index">
            <s-clickable
              border="base"
              borderRadius="base"
              padding="base"
              inlineSize="100%"
            >
              <s-grid gap="small">
                <s-heading>Index Table</s-heading>
                <s-paragraph color="subdued">
                  Index page with action buttons and data table displaying items
                </s-paragraph>
              </s-grid>
            </s-clickable>
          </Link>

          <Link to="/app/demo/details">
            <s-clickable
              border="base"
              borderRadius="base"
              padding="base"
              inlineSize="100%"
            >
              <s-grid gap="small">
                <s-heading>Details Page</s-heading>
                <s-paragraph color="subdued">
                  Details form with multiple sections, related items table, and sidebar
                </s-paragraph>
              </s-grid>
            </s-clickable>
          </Link>

          <Link to="/app/demo/settings">
            <s-clickable
              border="base"
              borderRadius="base"
              padding="base"
              inlineSize="100%"
            >
              <s-grid gap="small">
                <s-heading>Settings</s-heading>
                <s-paragraph color="subdued">
                  Settings page with form fields, preferences, and configuration options
                </s-paragraph>
              </s-grid>
            </s-clickable>
          </Link>
        </s-grid>
      </s-section>

      {/* Pattern Components */}
      <s-section heading="UI Patterns">
        <s-grid gap="base">
          <Link to="/app/demo">
            <s-clickable
              border="base"
              borderRadius="base"
              padding="base"
              inlineSize="100%"
            >
              <s-grid gap="small">
                <s-heading>Browse All Patterns</s-heading>
                <s-paragraph color="subdued">
                  Explore reusable UI patterns and components with live examples
                </s-paragraph>
              </s-grid>
            </s-clickable>
          </Link>
        </s-grid>
      </s-section>

      {/* Cleanup Instructions */}
      <s-section heading="Ready to start building?">
        <s-grid gap="base">
          <s-paragraph>
            When you're ready to begin working on your own app, you can safely delete all the demo files.
            Here's what you need to remove:
          </s-paragraph>

          <s-box
            padding="base"
            background="subdued"
            borderRadius="base"
          >
            <s-grid gap="small">
              <s-text>Files to delete:</s-text>
              <s-unordered-list>
                <s-list-item>
                  <s-text>app.demo.*.jsx</s-text> - All demo page files
                </s-list-item>
                <s-list-item>
                  <s-text>patterns/*.jsx</s-text> - All pattern component files
                </s-list-item>
                <s-list-item>
                  <s-text>api.demo.js</s-text> - Demo API endpoint
                </s-list-item>
              </s-unordered-list>
              <s-text>Firestore collections to delete:</s-text>
              <s-unordered-list>
                <s-list-item>
                  <s-text>demo-counters</s-text> - Demo counter data
                </s-list-item>
              </s-unordered-list>
            </s-grid>
          </s-box>

          <s-paragraph color="subdued">
            After deleting these files, you'll have a clean slate to build your app. Happy coding!
          </s-paragraph>
        </s-grid>
      </s-section>
    </s-page>
  );
}
