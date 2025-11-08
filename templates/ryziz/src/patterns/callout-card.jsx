export const metadata = {
  id: 'callout-card',
  title: 'Callout Card',
  description: 'Encourage merchants to take action on new features or opportunities',
  category: 'pattern'
};

export default function CalloutCard() {
  return (
    <>
      {/* Pattern overview section */}
      <s-section>
        <s-heading>Callout Card</s-heading>
        <s-paragraph>
          Callout cards are used to encourage merchants to take an action related to a new feature or opportunity.
          They are most commonly displayed in the sales channels section of Shopify.
        </s-paragraph>
      </s-section>

      {/* Demo section */}
      <s-section>
        {/* Main grid: content area and dismiss button */}
        <s-grid gridTemplateColumns="1fr auto" gap="small-400" alignItems="start">
          {/* Responsive content grid: stacks vertically on small screens */}
          <s-grid
            gridTemplateColumns="@container (inline-size <= 480px) 1fr, auto auto"
            gap="base"
            alignItems="center"
          >
            {/* Text content and action buttons */}
            <s-grid gap="small-200">
              <s-heading>Feature Title</s-heading>
              <s-paragraph>
                Description of the new feature or opportunity and what merchants can do with it.
              </s-paragraph>

              {/* Primary and secondary action buttons inline */}
              <s-stack direction="inline" gap="small-200">
                <s-button>Primary Action</s-button>
                <s-button tone="neutral" variant="tertiary">Secondary Action</s-button>
              </s-stack>
            </s-grid>

            {/* Illustration or image to visualize the feature */}
            <s-stack alignItems="center">
              <s-box maxInlineSize="200px" borderRadius="base" overflow="hidden">
                <s-image
                  src="https://via.placeholder.com/400x200"
                  alt="Feature illustration"
                  aspectRatio="1/0.5"
                />
              </s-box>
            </s-stack>
          </s-grid>

          {/* Dismiss button in top-right corner */}
          <s-button
            icon="x"
            tone="neutral"
            variant="tertiary"
            accessibilityLabel="Dismiss card"
          />
        </s-grid>
      </s-section>
    </>
  );
}
