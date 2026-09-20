// Everything in this folder is served at /pos (see vercel.json), not site
// root. pharmacy-pos's own code uses root-absolute paths ('/dashboard',
// '/login.html', etc.) everywhere, so this shim gives router.js/app.js a
// single place to add/strip the /pos prefix instead of hand-editing every
// href in index.html and every dynamically-rendered link across the app.
(function () {
  window.POS = window.POS || {};
  window.POS.BASE = '/pos';
  // The API lives on Render, NOT on this (Vercel) origin. Every fetch to the
  // backend must use this — `window.location.origin + '/api/...'` points at
  // Vercel's old serverless function instead.
  window.POS.API_BASE = 'https://sardar-pharmacy.onrender.com';
  window.POS.routePath = function () {
    var p = window.location.pathname;
    return p.startsWith(window.POS.BASE) ? (p.slice(window.POS.BASE.length) || '/') : p;
  };
})();
