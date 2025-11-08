export const metadata = {
  id: 'app-card',
  title: 'App Card',
  description: 'Present another app to merchants with consistent layout and clear call-to-action',
  category: 'pattern'
};

export default function AppCard() {
  return (
    <>
      {/* Pattern overview section */}
      <s-section>
        <s-heading>App Card</s-heading>
        <s-paragraph>
          App cards provide a consistent layout for presenting another app to merchants. They are used to highlight apps
          that can extend functionality or help merchants accomplish related tasks. App cards should educate merchants
          about the value of the suggested app and provide a clear, actionable way to learn more or install it.
        </s-paragraph>
      </s-section>

      {/* Demo section */}
      <s-section>
        {/* Clickable card container with border and padding */}
        <s-clickable
          href="javascript:void(0)"
          border="base"
          borderRadius="base"
          padding="base"
          inlineSize="100%"
        >
          {/* Three-column grid: thumbnail, app info, action button */}
          <s-grid gridTemplateColumns="auto 1fr auto" alignItems="stretch" gap="base">
            {/* App icon/thumbnail */}
            <s-thumbnail
              size="small"
              src="https://via.placeholder.com/64"
              alt="App Icon"
            />

            {/* App information: name, pricing, description */}
            <s-box>
              <s-heading>App Name</s-heading>
              <s-paragraph>Pricing Information</s-paragraph>
              <s-paragraph>
                Brief description of the app's value proposition and key benefits.
              </s-paragraph>
            </s-box>

            {/* Download/Install action button */}
            <s-stack justifyContent="start">
              <s-button
                href="javascript:void(0)"
                icon="download"
                accessibilityLabel="Install App"
              />
            </s-stack>
          </s-grid>
        </s-clickable>
      </s-section>
    </>
  );
}
