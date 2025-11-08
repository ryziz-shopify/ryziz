export const metadata = {
  id: 'footer-help',
  title: 'Footer Help',
  description: 'Refer merchants to related help documentation and support resources',
  category: 'pattern'
};

export default function FooterHelp() {
  return (
    <>
      {/* Pattern overview section */}
      <s-section>
        <s-heading>Footer Help</s-heading>
        <s-paragraph>
          Footer help is used to refer merchants to more information related to the product or feature they're using.
        </s-paragraph>
      </s-section>

      {/* Demo section */}
      <s-section>
        {/* Centered help text with link */}
        <s-stack alignItems="center">
          <s-text>
            Learn more about{' '}
            <s-link href="javascript:void(0)">this feature</s-link>.
          </s-text>
        </s-stack>
      </s-section>
    </>
  );
}
