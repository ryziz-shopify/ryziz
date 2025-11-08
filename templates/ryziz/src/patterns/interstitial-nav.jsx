export const metadata = {
  id: 'interstitial-nav',
  title: 'Interstitial Nav',
  description: 'Connect merchants to deeper pages while keeping navigation clean and focused',
  category: 'pattern'
};

export default function InterstitialNav() {
  return (
    <>
      {/* Pattern overview section */}
      <s-section>
        <s-heading>Interstitial Nav</s-heading>
        <s-paragraph>
          Interstitial navigation is used to connect merchants to deeper pages—such as settings, features, or
          resources—within a section of your app. It helps keep navigation clean and focused by avoiding multiple nested
          items, making it easier for merchants to discover and access important functionality.
        </s-paragraph>
      </s-section>

      {/* Demo section */}
      <s-section heading="Preferences">
        <s-box border="base" borderRadius="base">
          {/* First navigation item */}
          <s-clickable
            padding="small-100"
            href="javascript:void(0)"
            accessibilityLabel="Navigate to first section settings"
          >
            <s-grid gridTemplateColumns="1fr auto" alignItems="center" gap="base">
              <s-box>
                <s-heading>Section 1</s-heading>
                <s-paragraph color="subdued">
                  Description of settings and options available in this section.
                </s-paragraph>
              </s-box>
              {/* Chevron icon indicating navigation */}
              <s-icon type="chevron-right" />
            </s-grid>
          </s-clickable>

          {/* Divider between items */}
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>

          {/* Second navigation item */}
          <s-clickable
            padding="small-100"
            href="javascript:void(0)"
            accessibilityLabel="Navigate to second section settings"
          >
            <s-grid gridTemplateColumns="1fr auto" alignItems="center" gap="base">
              <s-box>
                <s-heading>Section 2</s-heading>
                <s-paragraph color="subdued">
                  Configure additional preferences and features for this area.
                </s-paragraph>
              </s-box>
              <s-icon type="chevron-right" />
            </s-grid>
          </s-clickable>

          {/* Divider between items */}
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>

          {/* Third navigation item */}
          <s-clickable
            padding="small-100"
            href="javascript:void(0)"
            accessibilityLabel="Navigate to third section settings"
          >
            <s-grid gridTemplateColumns="1fr auto" alignItems="center" gap="base">
              <s-box>
                <s-heading>Section 3</s-heading>
                <s-paragraph color="subdued">
                  Manage settings and resources for this functionality.
                </s-paragraph>
              </s-box>
              <s-icon type="chevron-right" />
            </s-grid>
          </s-clickable>
        </s-box>
      </s-section>
    </>
  );
}
