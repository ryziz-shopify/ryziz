export const metadata = {
  id: 'setup-guide',
  title: 'Setup Guide',
  description: 'Guide merchants through essential onboarding with interactive checklist',
  category: 'pattern'
};

export default function SetupGuide() {
  return (
    <>
      {/* Pattern overview section */}
      <s-section>
        <s-heading>Setup Guide</s-heading>
        <s-paragraph>
          Setup guide provides an interactive checklist to guide merchants through essential onboarding or configuration
          tasks. Progress is tracked visually, helping merchants complete all required steps and understand what remains.
        </s-paragraph>
      </s-section>

      {/* Demo section */}
      <s-section>
        <s-grid gap="base">
          {/* Header with title, dismiss and collapse buttons */}
          <s-grid gap="small-200">
            <s-grid gridTemplateColumns="1fr auto auto" gap="small-300" alignItems="center">
              <s-heading>Setup Guide</s-heading>
              <s-button
                accessibilityLabel="Dismiss Guide"
                variant="tertiary"
                tone="neutral"
                icon="x"
              />
              <s-button
                accessibilityLabel="Toggle setup guide"
                variant="tertiary"
                tone="neutral"
                icon="chevron-up"
              />
            </s-grid>
            <s-paragraph>Use this guide to complete your setup process.</s-paragraph>
            <s-paragraph color="subdued">0 out of 3 steps completed</s-paragraph>
          </s-grid>

          {/* Steps container */}
          <s-box borderRadius="base" border="base" background="base">
            {/* Step 1 - Expanded with details */}
            <s-box>
              <s-grid gridTemplateColumns="1fr auto" gap="base" padding="small">
                <s-checkbox label="Complete step 1" />
                <s-button
                  accessibilityLabel="Toggle step 1 details"
                  variant="tertiary"
                  icon="chevron-up"
                />
              </s-grid>
              {/* Step details */}
              <s-box padding="small" paddingBlockStart="none">
                <s-box padding="base" background="subdued" borderRadius="base">
                  <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
                    <s-grid gap="small-200">
                      <s-paragraph>
                        Detailed instructions and information for completing this step successfully.
                      </s-paragraph>
                      <s-stack direction="inline" gap="small-200">
                        <s-button variant="primary">Take action</s-button>
                        <s-button variant="tertiary" tone="neutral">
                          Learn more
                        </s-button>
                      </s-stack>
                    </s-grid>
                    {/* Optional illustration */}
                    <s-box maxBlockSize="80px" maxInlineSize="80px">
                      <s-image src="https://via.placeholder.com/80" alt="Step illustration" />
                    </s-box>
                  </s-grid>
                </s-box>
              </s-box>
            </s-box>

            <s-divider />

            {/* Step 2 - Collapsed */}
            <s-box>
              <s-grid gridTemplateColumns="1fr auto" gap="base" padding="small">
                <s-checkbox label="Complete step 2" />
                <s-button
                  accessibilityLabel="Toggle step 2 details"
                  variant="tertiary"
                  icon="chevron-down"
                />
              </s-grid>
              <s-box padding="small" paddingBlockStart="none" />
            </s-box>

            <s-divider />

            {/* Step 3 - Collapsed */}
            <s-box>
              <s-grid gridTemplateColumns="1fr auto" gap="base" padding="small">
                <s-checkbox label="Complete step 3" />
                <s-button
                  accessibilityLabel="Toggle step 3 details"
                  variant="tertiary"
                  icon="chevron-down"
                />
              </s-grid>
              <s-box padding="small" paddingBlockStart="none" />
            </s-box>
          </s-box>
        </s-grid>
      </s-section>
    </>
  );
}
