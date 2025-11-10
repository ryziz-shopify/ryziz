export const TOPIC = 'APP_UNINSTALLED';
export const handle = _handle;

// Implementation

async function _handle(topic, shop, body) {
  console.log('App uninstalled:', { topic, shop, body });
}
