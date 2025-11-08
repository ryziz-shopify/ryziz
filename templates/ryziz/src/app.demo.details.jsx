export const metadata = {
  id: 'details',
  title: 'Details (Full Layout)',
  description: 'Complete details page with form sections, related items table, and sidebar summary',
  category: 'full-layout'
};

export default function DemoDetails() {
  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const formEntries = Object.fromEntries(formData);
    console.log('Form data', formEntries);
  };

  const handleReset = (event) => {
    console.log('Handle discarded changes if necessary');
  };

  return (
    <form data-save-bar onSubmit={handleSubmit} onReset={handleReset}>
      <s-page heading="Resource Name">
        {/* Breadcrumb navigation */}
        <s-link slot="breadcrumb-actions" href="/app">
          Welcome to Ryziz!
        </s-link>

        {/* Secondary actions (duplicate, delete, etc.) */}
        <s-button slot="secondary-actions">Duplicate</s-button>
        <s-button slot="secondary-actions">Delete</s-button>

        {/* Main content - Resource information section */}
        <s-section heading="Resource information">
          <s-grid gap="base">
            {/* Text field for resource name */}
            <s-text-field
              label="Resource name"
              name="name"
              labelAccessibilityVisibility="visible"
              placeholder="Enter resource name"
              value="Sample Resource"
              details="This name will be displayed to users."
            />

            {/* Textarea for description */}
            <s-text-area
              label="Description"
              name="description"
              labelAccessibilityVisibility="visible"
              placeholder="Brief description"
              value="A sample description for this resource"
              details="Help users understand what this resource is about"
            />

            {/* Money field for pricing */}
            <s-money-field
              label="Price"
              name="price"
              labelAccessibilityVisibility="visible"
              placeholder="0.00"
              value="9.99"
              details="Set the price for this resource"
            />

            {/* URL field for external link */}
            <s-url-field
              label="External URL"
              name="external-url"
              labelAccessibilityVisibility="visible"
              placeholder="https://example.com"
              details="Optional external reference link"
            />
          </s-grid>
        </s-section>

        {/* Related items section with search and table */}
        <s-section heading="Related items">
          <s-grid gap="base">
            {/* Search bar with action button */}
            <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
              <s-grid-item>
                <s-search-field
                  label="Search items"
                  labelAccessibilityVisibility="exclusive"
                  placeholder="Search items"
                />
              </s-grid-item>
              <s-grid-item>
                <s-button>Browse</s-button>
              </s-grid-item>
            </s-grid>

            {/* Table with related items */}
            <s-box
              background="strong"
              border="base"
              borderRadius="base"
              borderStyle="solid"
              overflow="hidden"
            >
              <s-table>
                <s-table-header-row>
                  <s-table-header listSlot="primary">Item</s-table-header>
                  <s-table-header>
                    <s-stack alignItems="end">Actions</s-stack>
                  </s-table-header>
                  <s-table-header listSlot="secondary">
                    <s-stack direction="inline" alignItems="end" />
                  </s-table-header>
                </s-table-header-row>
                <s-table-body>
                  {/* First row */}
                  <s-table-row>
                    <s-table-cell>
                      <s-stack direction="inline" gap="base" alignItems="center">
                        {/* Item thumbnail */}
                        <s-box
                          border="base"
                          borderRadius="base"
                          overflow="hidden"
                          maxInlineSize="40px"
                          maxBlockSize="40px"
                        >
                          <s-image alt="Item thumbnail" src="https://via.placeholder.com/40" />
                        </s-box>
                        Item Name 1
                      </s-stack>
                    </s-table-cell>
                    <s-table-cell>
                      <s-stack alignItems="end">
                        <s-link href="javascript:void(0)">Preview</s-link>
                      </s-stack>
                    </s-table-cell>
                    <s-table-cell>
                      <s-stack alignItems="end">
                        <s-button
                          icon="x"
                          tone="neutral"
                          variant="tertiary"
                          accessibilityLabel="Remove item 1"
                        />
                      </s-stack>
                    </s-table-cell>
                  </s-table-row>

                  {/* Second row */}
                  <s-table-row>
                    <s-table-cell>
                      <s-stack direction="inline" gap="base" alignItems="center">
                        <s-box
                          border="base"
                          borderRadius="base"
                          overflow="hidden"
                          maxInlineSize="40px"
                          maxBlockSize="40px"
                        >
                          <s-image alt="Item thumbnail" src="https://via.placeholder.com/40" />
                        </s-box>
                        Item Name 2
                      </s-stack>
                    </s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="base" justifyContent="end">
                        <s-link href="javascript:void(0)">Preview</s-link>
                      </s-stack>
                    </s-table-cell>
                    <s-table-cell>
                      <s-stack alignItems="end">
                        <s-button
                          icon="x"
                          tone="neutral"
                          variant="tertiary"
                          accessibilityLabel="Remove item 2"
                        />
                      </s-stack>
                    </s-table-cell>
                  </s-table-row>
                </s-table-body>
              </s-table>
            </s-box>
          </s-grid>
        </s-section>

        {/* Settings section with various form controls */}
        <s-section heading="Settings">
          <s-grid gap="base">
            {/* Select dropdown for size */}
            <s-select label="Size" name="size">
              <s-option value="small">Small</s-option>
              <s-option value="medium" selected>
                Medium
              </s-option>
              <s-option value="large">Large</s-option>
            </s-select>

            {/* Select dropdown for category */}
            <s-select label="Category" name="category">
              <s-option value="category1">Category 1</s-option>
              <s-option value="category2" selected>
                Category 2
              </s-option>
              <s-option value="category3">Category 3</s-option>
            </s-select>

            {/* Number field for quantity */}
            <s-number-field
              label="Quantity"
              name="quantity"
              labelAccessibilityVisibility="visible"
              value="50"
              min={0}
              placeholder="0"
              details="Current inventory quantity"
            />

            {/* Switch toggle for feature */}
            <s-switch
              label="Enable feature"
              name="enable-feature"
              details="Toggle to enable or disable this feature"
            />
          </s-grid>
        </s-section>

        {/* Sidebar content using the aside slot */}
        <s-box slot="aside">
          <s-section heading="Summary">
            <s-heading>Resource Name</s-heading>
            <s-unordered-list>
              <s-list-item>Summary item 1</s-list-item>
              <s-list-item>Summary item 2</s-list-item>
              <s-list-item>Summary item 3</s-list-item>
              <s-list-item>
                {/* Status badge */}
                <s-stack direction="inline" gap="small">
                  <s-text>Current status:</s-text>
                  <s-badge color="base" tone="success">
                    Active
                  </s-badge>
                </s-stack>
              </s-list-item>
            </s-unordered-list>
          </s-section>
        </s-box>
      </s-page>
    </form>
  );
}
