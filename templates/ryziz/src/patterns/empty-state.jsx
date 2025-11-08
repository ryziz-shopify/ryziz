export const metadata = {
  id: 'empty-state',
  title: 'Empty State',
  description: 'Provide guidance and next steps when lists, tables, or charts have no data',
  category: 'pattern'
};

export default function EmptyState() {
  return (
    <>
      {/* Pattern overview section */}
      <s-section>
        <s-heading>Empty State</s-heading>
        <s-paragraph>
          Empty states are used when a list, table, or chart has no items or data to show. This is an opportunity to
          provide explanation or guidance to help merchants progress. The empty state component is intended for use when
          a full page in the admin is empty, and not for individual elements or areas in the interface.
        </s-paragraph>
      </s-section>

      {/* Demo section */}
      <s-section accessibilityLabel="Empty state demonstration">
        {/* Centered layout with padding */}
        <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
          {/* Illustration image */}
          <s-box maxInlineSize="200px" maxBlockSize="200px">
            <s-image
              aspectRatio="1/0.5"
              src="https://via.placeholder.com/400x200"
              alt="Empty state illustration"
            />
          </s-box>

          {/* Content area with heading, description, and actions */}
          <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
            {/* Centered text content */}
            <s-stack alignItems="center">
              <s-heading>Get started</s-heading>
              <s-paragraph>
                No items found. Create your first item to get started with this feature.
              </s-paragraph>
            </s-stack>

            {/* Primary and secondary action buttons */}
            <s-button-group>
              <s-button slot="secondary-actions" accessibilityLabel="Learn more about this feature">
                Learn more
              </s-button>
              <s-button slot="primary-action" accessibilityLabel="Create your first item">
                Create item
              </s-button>
            </s-button-group>
          </s-grid>
        </s-grid>
      </s-section>
    </>
  );
}
