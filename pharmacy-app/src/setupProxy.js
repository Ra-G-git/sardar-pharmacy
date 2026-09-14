// CRA's dev server (npm start) already serves everything in public/ as
// static files — including public/pos/*, so /pos/login.html etc. work
// automatically with zero config. The one thing it can't do on its own is
// run our Express API, so this proxies any /api/* request to the backend
// running separately on port 3001.
//
// Requires: npm install http-proxy-middleware --save-dev  (run once, at
// the pharmacy-app repo root — same place as this file's parent, src/)

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
    })
  );
};
