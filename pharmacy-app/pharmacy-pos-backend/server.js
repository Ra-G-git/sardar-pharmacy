const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('./config');
const products = require('./productsFirestore');
const pos = require('./posFirestore');
const auth = require('./auth');

const app = express();
const PORT = config.port;

// Render (and Vercel) sit behind a proxy. Without this, req.ip is the proxy's
// address (breaking the login rate limiter) and req.protocol is always 'http'.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Local dev only — on Vercel, /pos is served as static files directly (see
// vercel.json) and this Express app only handles /api. Locally there's no
// separate static server, so we serve it here too for `node server.js` testing.
app.use('/pos', express.static(path.join(__dirname, '..', 'public', 'pos')));
// pharmacy-pos is a client-side router — paths like /pos/dashboard aren't
// real files, so anything under /pos not matched above falls back to
// index.html and the app's own router.js takes it from there.
app.get('/pos*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pos', 'index.html'));
});

// Note: on Vercel, this static-serving block is inert for actual pos/*
// static assets (Vercel serves those directly, faster) — it only matters
// for local `node server.js` testing.

// ── Authentication ────────────────────────────────
// Default-deny: every /api/* request needs a valid signed token, except the
// four login/reset endpoints listed in auth.js. verifyRole() then checks the
// role that is INSIDE the token (req.user), never a client-supplied header.
app.use('/api', auth.authenticate);
const verifyRole = auth.verifyRole;

// ── Auth ──────────────────────────────────────────
const loginLimiter = auth.makeLimiter(10, 15 * 60 * 1000);   // 10 failures / 15 min
const forgotLimiter = auth.makeLimiter(5, 15 * 60 * 1000);   // 5 requests / 15 min

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const key = `${req.ip}|${username.toLowerCase().trim()}`;
    if (loginLimiter.isBlocked(key)) {
      return res.status(429).json({ error: 'Too many failed attempts. Please try again in 15 minutes.' });
    }
    const user = await pos.login(username, password);
    if (!user) {
      loginLimiter.hit(key);
      return res.status(400).json({ error: 'Invalid username/email or password' });
    }
    loginLimiter.clear(key);
    res.json({ success: true, user, token: auth.signToken(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Google Sign-In login — the frontend authenticates with Firebase Auth
// directly (client-side popup), then sends us the resulting ID token,
// which we verify server-side (see pos.googleLogin) before trusting the
// email it contains.
app.post('/api/auth/google-login', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken is required' });
    const user = await pos.googleLogin(idToken);
    if (!user) return res.status(403).json({ error: 'No staff account is linked to this Google account. Ask an admin to add your Gmail in the Users tab.' });
    res.json({ success: true, user, token: auth.signToken(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/change-password', async (req, res) => {
  try {
    const userId = req.user.id; // from the verified token, not a client header
    const { oldPassword, newPassword } = req.body;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing old or new password keys' });
    await pos.changePassword(userId, oldPassword, newPassword);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const createMailTransporter = () => {
  const host = process.env.SMTP_HOST, port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER, pass = process.env.SMTP_PASSWORD;
  if (host && port && user && pass) {
    return nodemailer.createTransport({
      host, port: parseInt(port), secure: parseInt(port) === 465,
      auth: { user, pass }, tls: { rejectUnauthorized: false },
    });
  }
  return null;
};

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { identity } = req.body || {};
    if (typeof identity !== 'string' || !identity) return res.status(400).json({ error: 'Username or email address is required' });
    if (forgotLimiter.isBlocked(req.ip)) return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    forgotLimiter.hit(req.ip);
    const result = await pos.forgotPassword(identity);
    const genericMsg = { success: true, message: 'If a matching account exists, a password reset link has been sent.' };
    if (!result.found || !result.hasEmail) return res.json(genericMsg);

    // Fixed base URL — building this from the request's Host header would let an
    // attacker point the emailed link at their own domain and steal the token.
    const baseUrl = (process.env.POS_BASE_URL || 'https://sardar-pharmacy.vercel.app').replace(/\/+$/, '');
    const resetLink = `${baseUrl}/pos/login.html?token=${result.token}`;
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Pharmacy POS Support" <support@example.com>',
      to: result.email, subject: 'Password Recovery Link',
      text: `Hello ${result.name},\n\nReset your password: ${resetLink}\n\nValid for 1 hour.`,
      html: `<p>Hello ${result.name},</p><p><a href="${resetLink}">Reset Password</a> (valid 1 hour)</p>`,
    };
    const transporter = createMailTransporter();
    if (transporter) {
      try {
        await transporter.sendMail(mailOptions);
        return res.json(genericMsg);
      } catch (mailErr) {
        console.error('SMTP send failed, falling back to console log:', mailErr.message);
      }
    }
    console.log('\n=== PASSWORD RESET (no SMTP configured) ===');
    console.log('To:', result.email, '| Link:', resetLink);
    console.log('============================================\n');
    // The link goes to the server log only. It is returned in the response ONLY if
    // EXPOSE_RESET_LINK=1 is set (local testing) — otherwise anyone could request
    // a reset for 'admin' and receive the link, i.e. take over the account.
    if (process.env.EXPOSE_RESET_LINK === '1') return res.json({ ...genericMsg, _debugLink: resetLink });
    res.json(genericMsg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });
    await pos.resetPassword(token, newPassword);
    res.json({ success: true, message: 'Password has been successfully updated.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Settings ──────────────────────────────────────
app.get('/api/settings', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json(await pos.getSettings());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/settings', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    await pos.updateSettings(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Coupons ───────────────────────────────────────
app.get('/api/coupons', async (req, res) => {
  try { res.json(await pos.listCoupons()); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/coupons', verifyRole(['admin']), async (req, res) => {
  try {
    const { code, discountType, discountValue } = req.body;
    if (!code || !discountType || discountValue === undefined) return res.status(400).json({ error: 'Missing coupon fields' });
    await pos.createCoupon({ code, discountType, discountValue });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/coupons/:code', verifyRole(['admin']), async (req, res) => {
  try { await pos.deleteCoupon(req.params.code); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Expenses ──────────────────────────────────────
app.get('/api/expenses', async (req, res) => {
  try { res.json(await pos.listExpenses()); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/expenses', async (req, res) => {
  try {
    const { name, date, amount } = req.body;
    if (!name || !date || amount === undefined) return res.status(400).json({ error: 'Missing expense fields' });
    await pos.createExpense(req.body);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/expenses/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try { await pos.deleteExpense(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/expense-categories', async (req, res) => {
  try { res.json(await pos.listExpenseCategories()); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/expense-categories', async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'Name is required' });
    await pos.createExpenseCategory(req.body);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/expense-categories/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try { await pos.deleteExpenseCategory(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Users (admin only) ─────────────────────────────
app.get('/api/users', verifyRole(['admin']), async (req, res) => {
  try { res.json(await pos.listUsers()); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/users', verifyRole(['admin']), async (req, res) => {
  try { await pos.createUser(req.body); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/users/:id', verifyRole(['admin']), async (req, res) => {
  try { await pos.updateUser(req.params.id, req.body); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/users/:id', verifyRole(['admin']), async (req, res) => {
  try { await pos.deleteUser(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

// ── Counters ──────────────────────────────────────
app.get('/api/counters/next/:prefix', async (req, res) => {
  try { res.json({ nextId: await pos.nextCounter(req.params.prefix) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Product categories ─────────────────────────────
app.get('/api/categories', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json(await pos.listCategories());
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/categories', verifyRole(['admin', 'manager']), async (req, res) => {
  try { await pos.createCategory(req.body); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/categories/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try { await pos.deleteCategory(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Products ──────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const search = req.query.search || req.query.q || '';
    const trackedOnly = req.query.tracked === 'true';
    const result = trackedOnly ? await products.listTrackedProducts() : await products.listProducts({ search });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/products/resolve-scan', async (req, res) => {
  try {
    const code = req.query.query || req.query.code;
    if (!code) return res.status(400).json({ error: 'Missing query parameter' });
    const match = await products.resolveScan(code);
    if (!match) return res.json({ success: false, error: 'No matching product or variation found' });
    res.json({ success: true, item: match });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/products/bulk-stock-update', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const updates = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Body must be an array of updates' });
    await products.bulkStockUpdate(updates);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/products/bulk', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Body must be an array of products' });
    await products.bulkUpsertProducts(items);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/products', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const slug = req.body.slug || req.body.id;
    if (!slug) return res.status(400).json({ error: 'slug is required' });
    const id = await products.upsertProduct(slug, req.body);
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/products/:slug', async (req, res) => {
  try {
    const item = await products.getProduct(req.params.slug);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/products/:slug', verifyRole(['admin', 'manager']), async (req, res) => {
  try { await products.upsertProduct(req.params.slug, req.body); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/products/:slug', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const permanent = req.query.permanent === 'true';
    await products.softDeleteProduct(req.params.slug, permanent);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/products/:slug/restore', verifyRole(['admin', 'manager']), async (req, res) => {
  try { await products.restoreProduct(req.params.slug); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Customers ─────────────────────────────────────
app.get('/api/customers', async (req, res) => {
  try { res.json(await pos.listCustomers()); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/customers', verifyRole(['admin', 'manager', 'cashier']), async (req, res) => {
  try { await pos.createCustomer(req.body); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/customers/:id', verifyRole(['admin', 'manager', 'cashier']), async (req, res) => {
  try { await pos.updateCustomer(req.params.id, req.body); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/customers/:id', verifyRole(['admin', 'manager', 'cashier']), async (req, res) => {
  try { await pos.deleteCustomer(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Orders ────────────────────────────────────────
// (orderItems/payments are embedded in each order doc, not separate
// collections — kept as flat endpoints below for pharmacy-pos's frontend
// compatibility, derived from the orders list.)
app.get('/api/orders', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json(await pos.listOrders());
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/orderItems', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const orders = await pos.listOrders();
    const items = orders.flatMap(o => (o.items || []).map((it, idx) => ({
      id: `${o.id}-${idx}`, orderId: o.id, productId: it.slug,
      productName: it.productName || it.name, variationName: it.variationName || '',
      qty: it.qty ?? it.quantity, unitPrice: it.unitPrice ?? it.price,
      total: it.total ?? ((it.unitPrice ?? it.price) * (it.qty ?? it.quantity)),
    })));
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/payments', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const orders = await pos.listOrders();
    // orderId MUST come from the parent order doc. Each stored payment also carries
    // an `orderId` — but that is the id the browser invented when the sale was rung
    // up, not the Firestore document id. Spreading `...p` last let that stale id
    // win, so no payment ever matched its order and every screen that joins
    // payments to orders (dashboard, reports, sales list, receipts, edit order)
    // showed ৳0.
    const payments = orders.flatMap(o => (o.payments || []).map((p, idx) => ({ ...p, id: `${o.id}-pay-${idx}`, orderId: o.id })));
    res.json(payments);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/orders/:id', verifyRole(['admin']), async (req, res) => {
  try { await pos.deleteOrder(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/orders', async (req, res) => {
  try {
    const { order, items, payments } = req.body;
    const result = await pos.createOrder({ order, items, payments });
    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/orders/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const { order, items, payments } = req.body;
    const result = await pos.updateOrder(req.params.id, { order, items, payments });
    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Returns ───────────────────────────────────────
app.get('/api/returns', async (req, res) => {
  try { res.json(await pos.listReturns()); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/returnItems', async (req, res) => {
  try {
    const returns = await pos.listReturns();
    const items = returns.flatMap(r => (r.items || []).map((it, idx) => ({ id: `${r.id}-${idx}`, returnId: r.id, orderId: r.orderId, productId: it.slug, productName: it.productName, qty: it.qty, unitPrice: it.unitPrice, returnAmount: it.returnAmount })));
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/returns', async (req, res) => {
  try {
    const { returnRecord, items } = req.body;
    const id = await pos.createReturn({ returnRecord, items });
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Online Store (prescriptions, customer orders, site users) ─────
app.get('/api/prescriptions', verifyRole(['admin', 'manager']), async (req, res) => {
  try { res.json(await pos.listPrescriptions()); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/prescriptions/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    if (!req.body.status) return res.status(400).json({ error: 'status is required' });
    await pos.updatePrescriptionStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/online-orders', verifyRole(['admin', 'manager']), async (req, res) => {
  try { res.json(await pos.listOnlineOrders()); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/online-orders/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    if (!req.body.status) return res.status(400).json({ error: 'status is required' });
    await pos.updateOnlineOrderStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/site-users', verifyRole(['admin', 'manager']), async (req, res) => {
  try { res.json(await pos.listSiteUsers()); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Backup ────────────────────────────────────────
app.get('/api/backup/export', verifyRole(['admin']), async (req, res) => {
  try { res.json(await pos.exportBackup()); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/backup/import', verifyRole(['admin']), async (req, res) => {
  try { await pos.importBackup(req.body); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
// Any unmatched route falls through to a plain 404 — the actual UI pages
// (index.html, login.html) are served separately as static files from
// public/pos/ (see vercel.json), not by this Express app.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global safety net — Express 4 does NOT automatically catch errors thrown
// inside an async route handler (only Express 5 does). If something throws
// outside a route's own try/catch — or a serverless cold-start issue kills
// the response mid-flight — this is what stands between that and the
// browser getting an empty body it can't parse as JSON. Must be registered
// LAST, with all four arguments (that's what makes Express treat it as an
// error handler rather than a normal middleware).
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err?.message || 'Unexpected server error' });
});

// Listener — only runs when this file is executed directly (local dev / a
// traditional host). On Vercel, api/pos/[...path].js imports `app` instead
// and Vercel handles invocation, so this block is skipped there.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
