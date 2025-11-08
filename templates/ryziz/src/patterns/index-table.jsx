export const metadata = {
  id: 'index-table',
  title: 'Index Table',
  description: 'Display collections of similar objects with sorting and bulk actions',
  category: 'pattern'
};

export default function IndexTable() {
  return (
    <>
      {/* Pattern overview section */}
      <s-section>
        <s-heading>Index Table</s-heading>
        <s-paragraph>
          An index table displays a collection of objects of the same type, like orders or products. The main job of an
          index table is to help merchants get an at-a-glance of the objects to perform actions or navigate to a
          full-page representation of it.
        </s-paragraph>
      </s-section>

      {/* Demo section */}
      <s-section padding="none" accessibilityLabel="Items table section">
        <s-table>
          {/* Filters slot for search and sort controls */}
          <s-grid slot="filters" gap="small-200" gridTemplateColumns="1fr auto">
            <s-text-field
              label="Search items"
              labelAccessibilityVisibility="exclusive"
              icon="search"
              placeholder="Search all items"
            />
            <s-button
              icon="sort"
              variant="secondary"
              accessibilityLabel="Sort"
              interestFor="sort-tooltip"
              commandFor="sort-actions"
            />
            {/* Sort tooltip */}
            <s-tooltip id="sort-tooltip">
              <s-text>Sort</s-text>
            </s-tooltip>
            {/* Sort popover menu */}
            <s-popover id="sort-actions">
              <s-stack gap="none">
                <s-box padding="small">
                  <s-choice-list label="Sort by" name="Sort by">
                    <s-choice value="name" selected>
                      Name
                    </s-choice>
                    <s-choice value="quantity">Quantity</s-choice>
                    <s-choice value="created">Created</s-choice>
                    <s-choice value="status">Status</s-choice>
                  </s-choice-list>
                </s-box>
                <s-divider />
                <s-box padding="small">
                  <s-choice-list label="Order by" name="Order by">
                    <s-choice value="az" selected>
                      A-Z
                    </s-choice>
                    <s-choice value="za">Z-A</s-choice>
                  </s-choice-list>
                </s-box>
              </s-stack>
            </s-popover>
          </s-grid>

          {/* Table header */}
          <s-table-header-row>
            <s-table-header listSlot="primary">Item</s-table-header>
            <s-table-header format="numeric">Quantity</s-table-header>
            <s-table-header>Created</s-table-header>
            <s-table-header listSlot="secondary">Status</s-table-header>
          </s-table-header-row>

          {/* Table body with rows */}
          <s-table-body>
            {/* Row 1 */}
            <s-table-row clickDelegate="item-1-checkbox">
              <s-table-cell>
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-checkbox id="item-1-checkbox" />
                  {/* Item thumbnail */}
                  <s-clickable
                    href="javascript:void(0)"
                    accessibilityLabel="Item 1 thumbnail"
                    border="base"
                    borderRadius="base"
                    overflow="hidden"
                    inlineSize="40px"
                    blockSize="40px"
                  >
                    <s-image objectFit="cover" src="https://via.placeholder.com/80" />
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
            <s-table-row clickDelegate="item-2-checkbox">
              <s-table-cell>
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-checkbox id="item-2-checkbox" />
                  <s-clickable
                    href="javascript:void(0)"
                    accessibilityLabel="Item 2 thumbnail"
                    border="base"
                    borderRadius="base"
                    overflow="hidden"
                    inlineSize="40px"
                    blockSize="40px"
                  >
                    <s-image objectFit="cover" src="https://via.placeholder.com/80" />
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
            <s-table-row clickDelegate="item-3-checkbox">
              <s-table-cell>
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-checkbox id="item-3-checkbox" />
                  <s-clickable
                    href="javascript:void(0)"
                    accessibilityLabel="Item 3 thumbnail"
                    border="base"
                    borderRadius="base"
                    overflow="hidden"
                    inlineSize="40px"
                    blockSize="40px"
                  >
                    <s-image objectFit="cover" src="https://via.placeholder.com/80" />
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
    </>
  );
}
