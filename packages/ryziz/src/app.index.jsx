// shopify is provided by Shopify App Bridge (loaded in index.html)
export default function AppIndex() {
  const openProductPicker = async () => {
    const products = await shopify.resourcePicker({type: 'product'});
    shopify.toast.show('Selected ' + products.length + ' products');
  };

  return (
    <div>
      <h1>App Bridge Demo</h1>
      <button onClick={openProductPicker}>Open Product Picker</button>
    </div>
  );
}
