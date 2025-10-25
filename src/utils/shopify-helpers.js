/**
 * Extract API secret from Shopify CLI process output
 * @param {ChildProcess} proc - The Shopify CLI process
 * @returns {Promise<string>} The API secret
 */
export async function extractApiSecret(proc) {
  return new Promise((resolve, reject) => {
    let output = '';

    const onData = (data) => {
      output += data.toString();
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    proc.on('close', (code) => {
      if (code === 0) {
        const match = output.match(/SHOPIFY_API_SECRET=([^\s\n]+)/);
        if (match?.[1]) {
          resolve(match[1]);
        } else {
          reject(new Error('API secret not found in output'));
        }
      } else {
        reject(new Error('Please link your Shopify app first: npm run link'));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}
