export const metadata = {
  id: 'media-card',
  title: 'Media Card',
  description: 'Present visual information with consistent layout and clear context',
  category: 'pattern'
};

export default function MediaCard() {
  return (
    <>
      {/* Pattern overview section */}
      <s-section>
        <s-heading>Media Card</s-heading>
        <s-paragraph>
          Media cards provide a consistent layout to present visual information to merchants. Visual media is used to
          provide additional context to the written information it's paired with.
        </s-paragraph>
      </s-section>

      {/* Demo section */}
      <s-section>
        {/* Card container with fixed width */}
        <s-box border="base" borderRadius="base" overflow="hidden" maxInlineSize="216px">
          {/* Clickable media image */}
          <s-clickable href="javascript:void(0)">
            <s-image
              aspectRatio="1/1"
              objectFit="cover"
              alt="Media preview"
              src="https://via.placeholder.com/216"
            />
          </s-clickable>

          {/* Divider between image and content */}
          <s-divider />

          {/* Card content: title and action button */}
          <s-grid
            gridTemplateColumns="1fr auto"
            background="base"
            padding="small"
            gap="small"
            alignItems="center"
          >
            <s-heading>Media Title</s-heading>
            <s-button href="javascript:void(0)" accessibilityLabel="View media details">
              View
            </s-button>
          </s-grid>
        </s-box>
      </s-section>
    </>
  );
}
