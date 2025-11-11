export const TOPIC = 'APP_UNINSTALLED';

export default async function handle(topic, shop, body) {
  console.log('App uninstalled:', { topic, shop, body });
}
