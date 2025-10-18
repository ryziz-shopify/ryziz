// Enable TSX loader for JSX file support at runtime
import 'tsx/esm';

import { onRequest } from 'firebase-functions/v2/https';
import { createServer } from 'ryziz/core';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Create Express app
const app = createServer({
  routesDir: path.join(__dirname, 'src', 'routes'),
  publicDir: null
});

// Export as Firebase Function
export const ssr = onRequest({
  cors: true,
  maxInstances: 10,
}, app);
