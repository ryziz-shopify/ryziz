export const metadata = {
  id: 'metrics-card',
  title: 'Metrics Card',
  description: 'Highlight important numbers, statistics, and performance trends',
  category: 'pattern'
};

export default function MetricsCard() {
  return (
    <>
      {/* Pattern overview section */}
      <s-section>
        <s-heading>Metrics Card</s-heading>
        <s-paragraph>
          Metrics cards are used to highlight important numbers, statistics, or trends from your app, so merchants can
          quickly understand their activity and performance.
        </s-paragraph>
      </s-section>

      {/* Demo section */}
      <s-section padding="base">
        {/* Responsive grid: stacks on small screens, row on larger screens */}
        <s-grid
          gridTemplateColumns="@container (inline-size <= 400px) 1fr, 1fr auto 1fr auto 1fr"
          gap="small"
        >
          {/* First metric: clickable card */}
          <s-clickable
            href="javascript:void(0)"
            paddingBlock="small-400"
            paddingInline="small-100"
            borderRadius="base"
          >
            <s-grid gap="small-300">
              <s-heading>Metric 1</s-heading>
              <s-stack direction="inline" gap="small-200">
                <s-text>1,234</s-text>
                {/* Badge with positive trend indicator */}
                <s-badge tone="success" icon="arrow-up">
                  12%
                </s-badge>
              </s-stack>
            </s-grid>
          </s-clickable>

          {/* Vertical divider */}
          <s-divider direction="block" />

          {/* Second metric: clickable card */}
          <s-clickable
            href="javascript:void(0)"
            paddingBlock="small-400"
            paddingInline="small-100"
            borderRadius="base"
          >
            <s-grid gap="small-300">
              <s-heading>Metric 2</s-heading>
              <s-stack direction="inline" gap="small-200">
                <s-text>5,678</s-text>
                {/* Badge with neutral trend */}
                <s-badge tone="warning">0%</s-badge>
              </s-stack>
            </s-grid>
          </s-clickable>

          {/* Vertical divider */}
          <s-divider direction="block" />

          {/* Third metric: clickable card */}
          <s-clickable
            href="javascript:void(0)"
            paddingBlock="small-400"
            paddingInline="small-100"
            borderRadius="base"
          >
            <s-grid gap="small-300">
              <s-heading>Metric 3</s-heading>
              <s-stack direction="inline" gap="small-200">
                <s-text>2.5%</s-text>
                {/* Badge with negative trend indicator */}
                <s-badge tone="critical" icon="arrow-down">
                  0.3%
                </s-badge>
              </s-stack>
            </s-grid>
          </s-clickable>
        </s-grid>
      </s-section>
    </>
  );
}
