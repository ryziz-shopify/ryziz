export const metadata = {
  id: 'resource-list',
  title: 'Resource List',
  description: 'Display collections of similar resources with search, filter, and bulk actions',
  category: 'pattern'
};

export default function ResourceList() {
  return (
    <>
      {/* Pattern overview section */}
      <s-section>
        <s-heading>Resource List</s-heading>
        <s-paragraph>
          A resource list displays a collection of objects of the same type, like products or customers. The main job of
          a resource list is to help merchants find an object and navigate to a full-page representation of it.
        </s-paragraph>
      </s-section>

      {/* Demo section */}
      <s-section padding="none">
        <s-stack gap="small-200">
          {/* Search and filter controls */}
          <s-grid
            gridTemplateColumns="1fr auto"
            gap="base"
            alignItems="center"
            paddingInline="base"
            paddingBlockStart="base"
          >
            {/* Search field and filter button */}
            <s-grid gridTemplateColumns="1fr auto" gap="small-200" alignItems="center">
              <s-text-field icon="search" placeholder="Search items" />
              <s-button commandFor="filter-menu">Filter</s-button>
              {/* Filter popover */}
              <s-popover id="filter-menu">
                <s-stack gap="small-200" padding="small-200">
                  <s-text-field value="Filter Value" placeholder="Add filter" />
                  <s-link href="javascript:void(0)">Clear</s-link>
                </s-stack>
              </s-popover>
            </s-grid>
            {/* Save button */}
            <s-button variant="secondary">Save</s-button>
          </s-grid>

          {/* Active filters */}
          <s-stack direction="inline" gap="small-400" paddingInline="base">
            <s-clickable-chip removable>Active Filter</s-clickable-chip>
          </s-stack>

          {/* Showing count and sort controls */}
          <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center" paddingInline="base">
            <s-checkbox label="Showing 2 items" />
            <s-select>
              <s-option value="newest">Newest update</s-option>
              <s-option value="oldest">Oldest update</s-option>
            </s-select>
          </s-grid>

          {/* Resource list items */}
          <s-stack>
            {/* First item */}
            <s-clickable
              borderStyle="solid none none none"
              border="base"
              paddingInline="base"
              paddingBlock="small"
            >
              <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-checkbox />
                  <s-avatar />
                  <s-stack>
                    <s-heading>Item Name 1</s-heading>
                    <s-text>Additional details</s-text>
                  </s-stack>
                </s-stack>
                {/* Actions menu button */}
                <s-button
                  icon="menu-horizontal"
                  variant="tertiary"
                  accessibilityLabel="Actions for item 1"
                />
              </s-grid>
            </s-clickable>

            {/* Second item */}
            <s-clickable
              borderStyle="solid none none none"
              border="base"
              paddingInline="base"
              paddingBlock="small"
            >
              <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-checkbox />
                  <s-avatar />
                  <s-stack>
                    <s-heading>Item Name 2</s-heading>
                    <s-text>Additional details</s-text>
                  </s-stack>
                </s-stack>
                <s-button
                  icon="menu-horizontal"
                  variant="tertiary"
                  accessibilityLabel="Actions for item 2"
                />
              </s-grid>
            </s-clickable>
          </s-stack>
        </s-stack>
      </s-section>
    </>
  );
}
