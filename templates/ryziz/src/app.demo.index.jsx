export const metadata = {
  id: 'index',
  title: 'Index (Full Layout)',
  description: 'Complete index page with action buttons and data table displaying items with status badges',
  category: 'full-layout'
};

export default function DemoIndex() {
  return (
    <s-page heading="Items">
      <s-link slot="breadcrumb-actions" href="/app">
        Welcome to Ryziz!
      </s-link>

      {/* Primary action button */}
      <s-button slot="primary-action" variant="primary">
        Create item
      </s-button>

      {/* Secondary action buttons */}
      <s-button slot="secondary-actions" variant="secondary">
        Export items
      </s-button>
      <s-button slot="secondary-actions" variant="secondary">
        Import items
      </s-button>

      {/* Items table */}
      <s-section padding="none" accessibilityLabel="Items table section">
        <s-table>
          <s-table-header-row>
            <s-table-header listSlot="primary">Item</s-table-header>
            <s-table-header format="numeric">Quantity</s-table-header>
            <s-table-header>Created</s-table-header>
            <s-table-header>Status</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {/* Row 1 */}
            <s-table-row>
              <s-table-cell>
                <s-stack direction="inline" gap="small" alignItems="center">
                  {/* Thumbnail */}
                  <s-clickable
                    href="javascript:void(0)"
                    accessibilityLabel="Item 1 thumbnail"
                    border="base"
                    borderRadius="base"
                    overflow="hidden"
                    inlineSize="40px"
                    blockSize="40px"
                  >
                    <s-image
                      objectFit="cover"
                      alt="Item 1 thumbnail"
                      src="https://via.placeholder.com/80"
                    />
                  </s-clickable>
                  <s-link href="javascript:void(0)">Item Name 1</s-link>
                </s-stack>
              </s-table-cell>
              <s-table-cell>16</s-table-cell>
              <s-table-cell>Today</s-table-cell>
              <s-table-cell>
                <s-badge color="base" tone="success">
                  Active
                </s-badge>
              </s-table-cell>
            </s-table-row>

            {/* Row 2 */}
            <s-table-row>
              <s-table-cell>
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-clickable
                    href="javascript:void(0)"
                    accessibilityLabel="Item 2 thumbnail"
                    border="base"
                    borderRadius="base"
                    overflow="hidden"
                    inlineSize="40px"
                    blockSize="40px"
                  >
                    <s-image
                      objectFit="cover"
                      alt="Item 2 thumbnail"
                      src="https://via.placeholder.com/80"
                    />
                  </s-clickable>
                  <s-link href="javascript:void(0)">Item Name 2</s-link>
                </s-stack>
              </s-table-cell>
              <s-table-cell>9</s-table-cell>
              <s-table-cell>Yesterday</s-table-cell>
              <s-table-cell>
                <s-badge color="base" tone="success">
                  Active
                </s-badge>
              </s-table-cell>
            </s-table-row>

            {/* Row 3 */}
            <s-table-row>
              <s-table-cell>
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-clickable
                    href="javascript:void(0)"
                    accessibilityLabel="Item 3 thumbnail"
                    border="base"
                    borderRadius="base"
                    overflow="hidden"
                    inlineSize="40px"
                    blockSize="40px"
                  >
                    <s-image
                      objectFit="cover"
                      alt="Item 3 thumbnail"
                      src="https://via.placeholder.com/80"
                    />
                  </s-clickable>
                  <s-link href="javascript:void(0)">Item Name 3</s-link>
                </s-stack>
              </s-table-cell>
              <s-table-cell>25</s-table-cell>
              <s-table-cell>Last week</s-table-cell>
              <s-table-cell>
                <s-badge color="base" tone="neutral">
                  Draft
                </s-badge>
              </s-table-cell>
            </s-table-row>
          </s-table-body>
        </s-table>
      </s-section>
    </s-page>
  );
}
