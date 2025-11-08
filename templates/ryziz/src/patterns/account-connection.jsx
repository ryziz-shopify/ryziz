export const metadata = {
  id: 'account-connection',
  title: 'Account Connection',
  description: 'Display connection status and allow merchants to connect/disconnect accounts',
  category: 'pattern'
};

export default function AccountConnection() {
  return (
    <>
      {/* Pattern overview section */}
      <s-section>
        <s-heading>Account Connection</s-heading>
        <s-paragraph>
          The account connection component is used so merchants can connect or disconnect their store to various accounts.
          For example, if merchants want to use the Facebook sales channel, they need to connect their Facebook account to their Shopify store.
        </s-paragraph>
      </s-section>

      {/* Demo section */}
      <s-section>
        <s-stack gap="base">
          {/* Two-column grid: service info on left, action button on right */}
          <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
            <s-grid-item>
              {/* Service name and connection status */}
              <s-stack>
                <s-heading>Service Name</s-heading>
                <s-text color="subdued">Connection Status</s-text>
              </s-stack>
            </s-grid-item>
            <s-grid-item>
              {/* Primary action button to connect account */}
              <s-button variant="primary">Connect</s-button>
            </s-grid-item>
          </s-grid>

          {/* Terms and conditions or additional information */}
          <s-text>
            Additional information about the connection agreement, terms, or conditions.
          </s-text>
        </s-stack>
      </s-section>
    </>
  );
}
