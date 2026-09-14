// Goes in your pharmacy-app repo root at: api/[...path].js
// (Vercel auto-detects anything under /api as a serverless function.)
//
// Wraps the ENTIRE Express app (server.js, unmodified) so every existing
// route in it — /api/products, /api/orders, /api/customers, /api/auth/login,
// etc. — keeps working exactly as written, with no path prefix. This matches
// what pharmacy-pos's own frontend JS already calls
// (`${window.location.origin}/api/products`), so none of its ~15 JS files
// need editing.
//
// Requires: npm install serverless-http  (in the repo root)

const serverless = require('serverless-http');
const app = require('../pharmacy-pos-backend/server'); // path to server.js from integrated-pos

module.exports = serverless(app);
