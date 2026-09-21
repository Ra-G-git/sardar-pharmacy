// Covers everything server.js needs besides products/inventory (see
// productsFirestore.js for that). Collections used, all prefixed `pos_`
// except `orders`, which is the SAME collection your existing site's
// Checkout.js/POSPage.js already write to (orderType: 'pos' vs whatever
// customer orders use) — so sales history stays unified across both apps.
//
//   pos_users              — login accounts (username/password/role) —
//                             kept as pharmacy-pos's OWN login system
//                             (not Firebase Auth), so none of its frontend
//                             files need editing; just swaps MySQL for Firestore.
//   pos_password_resets    — password recovery tokens
//   pos_settings           — single doc, key-value store
//   pos_coupons            — keyed by code
//   pos_expenses / pos_expense_categories
//   pos_categories         — product category tags (separate from the CSV's
//                             own category_name field)
//   pos_customers          — customer directory (a new feature vs. the
//                             current site, which doesn't save customers)
//   pos_counters           — single doc, invoice/return numbering
//   orders                 — shared with the rest of the site (see above)
//   pos_returns            — return records, items embedded as an array

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db, admin } = require('./firebaseAdmin');
const { deductStock } = require('./productsFirestore');

// ── Auth / Users ──────────────────────────────────────────────
const USERS = 'pos_users';
const RESETS = 'pos_password_resets';

async function ensureDefaultAdmin() {
  const snap = await db.collection(USERS).limit(1).get();
  if (!snap.empty) return;
  const hash = await bcrypt.hash('admin123', 10);
  await db.collection(USERS).doc('u-admin').set({
    username: 'admin', password: hash, name: 'Admin', role: 'admin',
    email: 'razeesardar@gmail.com',
  });
  console.log('[pos_users] No users found — created default admin/admin123, linked to razeesardar@gmail.com for Google Sign-In. Change the password immediately after first login.');
}

// Google Sign-In login — verifies the Firebase ID token server-side (via
// the same Firebase project the React site uses) and looks up a pos_users
// account by the VERIFIED email, not a client-supplied one. Trusting a
// plain email string from the request body would let anyone log in as
// admin just by POSTing {email: "admin@..."} — verifying the token closes
// that.
async function googleLogin(idToken) {
  if (!idToken) return null;
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return null; // invalid/expired token
  }
  const email = decoded.email;
  if (!email) return null;
  // The customer site shares this Firebase project and lets people sign up with
  // ANY email (unverified). Without these two checks, someone could register
  // staff@example.com there, and this would treat their token as that staff
  // member's Google login. Require a verified Google-provider identity.
  if (decoded.email_verified !== true) return null;
  if (!decoded.firebase || decoded.firebase.sign_in_provider !== 'google.com') return null;

  await ensureDefaultAdmin();
  const snap = await db.collection(USERS).where('email', '==', email.toLowerCase().trim()).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const user = doc.data();
  return { id: doc.id, username: user.username, name: user.name, role: user.role, email: user.email };
}

async function login(username, password) {
  await ensureDefaultAdmin();
  const snap = await db.collection(USERS).where('username', '==', username).limit(1).get();
  let userDoc = snap.docs[0];
  if (!userDoc) {
    const byEmail = await db.collection(USERS).where('email', '==', username).limit(1).get();
    userDoc = byEmail.docs[0];
  }
  if (!userDoc) return null;
  const user = userDoc.data();
  const match = await bcrypt.compare(password, user.password || '');
  if (!match) return null;
  return { id: userDoc.id, username: user.username, name: user.name, role: user.role, email: user.email };
}

async function changePassword(userId, oldPassword, newPassword) {
  const ref = db.collection(USERS).doc(userId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('User not found');
  const match = await bcrypt.compare(oldPassword, doc.data().password || '');
  if (!match) throw new Error('Incorrect old password');
  const hash = await bcrypt.hash(newPassword, 10);
  await ref.update({ password: hash });
}

async function forgotPassword(identity) {
  const byUsername = await db.collection(USERS).where('username', '==', identity).limit(1).get();
  const userDoc = byUsername.docs[0] || (await db.collection(USERS).where('email', '==', identity).limit(1).get()).docs[0];
  if (!userDoc) return { found: false };
  const user = userDoc.data();
  if (!user.email) return { found: true, hasEmail: false };

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 3600000;
  await db.collection(RESETS).doc(token).set({ email: user.email, expiresAt });
  return { found: true, hasEmail: true, email: user.email, name: user.name, token };
}

async function resetPassword(token, newPassword) {
  const ref = db.collection(RESETS).doc(token);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Invalid or expired password recovery token');
  const { email, expiresAt } = doc.data();
  if (Date.now() > expiresAt) {
    await ref.delete();
    throw new Error('This password recovery link has expired');
  }
  const userSnap = await db.collection(USERS).where('email', '==', email).limit(1).get();
  if (userSnap.empty) throw new Error('Account no longer exists');
  const hash = await bcrypt.hash(newPassword, 10);
  await userSnap.docs[0].ref.update({ password: hash });
  await ref.delete();
}

async function listUsers() {
  const snap = await db.collection(USERS).get();
  return snap.docs.map(d => { const { password, ...rest } = d.data(); return { id: d.id, ...rest }; });
}

async function createUser({ id, username, password, name, role, email }) {
  const hash = await bcrypt.hash(password, 10);
  const docId = id || 'u-' + Math.random().toString(36).slice(2, 10);
  await db.collection(USERS).doc(docId).set({ username, password: hash, name, role, email: email ? email.toLowerCase().trim() : null });
}

async function updateUser(id, { username, password, name, role, email }) {
  const data = { username, name, role, email: email ? email.toLowerCase().trim() : null };
  if (password) data.password = await bcrypt.hash(password, 10);
  await db.collection(USERS).doc(id).set(data, { merge: true });
}

async function deleteUser(id) {
  if (id === 'u-admin') throw new Error('Cannot delete primary admin account');
  await db.collection(USERS).doc(id).delete();
}

// ── Settings ──────────────────────────────────────────────────
// Defaults matching the real pharmacy — used only where a value hasn't been
// explicitly set via the Settings page, so a fresh setup isn't blank/wrong.
const SETTINGS_DEFAULTS = {
  store_name: 'Sardar Pharmacy',
  store_address: '10/1 Pallabi, Mirpur-11½, Dhaka-1216',
  store_phone: '01559084327',
  store_website: 'https://sardar-pharmacy.vercel.app',
  invoice_logo: '/pos/img/logo.svg',
};

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`[timeout] ${label} did not respond within ${ms}ms`)), ms)
    ),
  ]);
}

async function getSettings() {
  console.log('[getSettings] starting Firestore read...');
  const doc = await withTimeout(
    db.collection('pos_settings').doc('config').get(),
    8000,
    'db.collection(pos_settings).doc(config).get()'
  );
  console.log('[getSettings] Firestore read completed, doc.exists =', doc.exists);
  const stored = doc.exists ? doc.data() : {};
  const merged = { ...SETTINGS_DEFAULTS };
  // Only an explicit non-empty value overrides a default — an empty string
  // already sitting in Firestore (e.g. from opening the Settings page once
  // without filling it in) shouldn't silently blank out the real branding.
  for (const [key, value] of Object.entries(stored)) {
    if (value !== undefined && value !== null && value !== '') merged[key] = value;
  }
  return merged;
}
async function updateSettings(settings) {
  await db.collection('pos_settings').doc('config').set(settings, { merge: true });
}

// ── Coupons ───────────────────────────────────────────────────
async function listCoupons() {
  const snap = await db.collection('pos_coupons').orderBy('code').get();
  return snap.docs.map(d => ({ code: d.id, ...d.data() }));
}
async function createCoupon({ code, discountType, discountValue }) {
  const clean = code.trim().toUpperCase();
  await db.collection('pos_coupons').doc(clean).set({ discountType, discountValue });
}
async function deleteCoupon(code) {
  await db.collection('pos_coupons').doc(code.toUpperCase()).delete();
}

// ── Expenses ──────────────────────────────────────────────────
async function listExpenses() {
  const snap = await db.collection('pos_expenses').orderBy('date', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function createExpense({ id, name, category, amount, date, status, image, note }) {
  const docId = id || 'exp_' + Math.random().toString(36).slice(2, 11);
  await db.collection('pos_expenses').doc(docId).set({
    name, category: category || 'Other', amount, date: new Date(date).toISOString(),
    status: status || 'Paid', image: image || '', note: note || '',
  });
}
async function deleteExpense(id) {
  await db.collection('pos_expenses').doc(id).delete();
}
async function listExpenseCategories() {
  const snap = await db.collection('pos_expense_categories').orderBy('name').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function createExpenseCategory({ id, name }) {
  const docId = id || 'exp_cat_' + Math.random().toString(36).slice(2, 11);
  await db.collection('pos_expense_categories').doc(docId).set({ name: name.trim() });
}
async function deleteExpenseCategory(id) {
  await db.collection('pos_expense_categories').doc(id).delete();
}

// ── Product categories ───────────────────────────────────────
async function listCategories() {
  const snap = await db.collection('pos_categories').orderBy('name').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function createCategory({ id, name }) {
  const docId = id || 'cat_' + Math.random().toString(36).slice(2, 11);
  await db.collection('pos_categories').doc(docId).set({ name });
}
async function deleteCategory(id) {
  await db.collection('pos_categories').doc(id).delete();
}

// ── Customers ─────────────────────────────────────────────────
async function listCustomers() {
  const snap = await db.collection('pos_customers').orderBy('name').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function createCustomer({ id, name, phone, email, label, customDiscount, address }) {
  const docId = id || 'cust_' + Math.random().toString(36).slice(2, 11);
  await db.collection('pos_customers').doc(docId).set({ name, phone, email, label, customDiscount, address });
}
async function updateCustomer(id, { name, phone, email, label, customDiscount, address }) {
  await db.collection('pos_customers').doc(id).set({ name, phone, email, label, customDiscount, address }, { merge: true });
}
async function deleteCustomer(id) {
  await db.collection('pos_customers').doc(id).delete();
}

// ── Invoice/return counters ──────────────────────────────────
async function nextCounter(prefix) {
  const key = prefix.toUpperCase() === 'INV-' ? 'invoice' : 'return';
  const ref = db.collection('pos_counters').doc('main');
  const next = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const current = doc.exists ? (doc.data()[key] || 0) : 0;
    const val = current + 1;
    tx.set(ref, { [key]: val }, { merge: true });
    return val;
  });
  return prefix.toUpperCase() + String(next).padStart(4, '0');
}

// ── Orders (shared `orders` collection with the rest of the site) ─────
// Note: variation-level stock (pharmacy-pos's productId+variationName qty
// conversion) isn't modeled — see MIGRATION_PLAN.md. Stock is deducted per
// item by `slug` + `quantity` directly.

async function listOrders() {
  // No .orderBy() here on purpose — combining a where() filter with
  // orderBy() on a different field requires a Firestore composite index.
  // If that index doesn't exist yet, this query throws, the API returns a
  // 500, and the frontend silently treats that as "no orders" — which is
  // almost certainly why Sales List and Dashboard were showing nothing
  // despite the order actually being saved. Sorting in JS avoids needing
  // that index at all.
  const snap = await db.collection('orders').where('orderType', '==', 'pos').get();
  const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  orders.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return orders;
}

async function getOrder(id) {
  const doc = await db.collection('orders').doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function createOrder({ order, items, payments }) {
  const invoiceId = order.invoiceId || await nextCounter('INV-');
  const docData = {
    userId: order.userId || 'pos', userEmail: order.userEmail || 'pos',
    name: order.customerName || 'Walk-in Customer', phone: order.customerPhone || 'N/A',
    address: order.address || 'In-store purchase', paymentMethod: order.paymentMethod || (() => {
      // Was always 'cash' unless the client sent one — so a bKash sale printed
      // "Payment: cash" on the main site's Admin receipt. Use what was really paid.
      const used = [...new Set((payments || []).filter(p => (parseFloat(p.amount) || 0) > 0).map(p => p.method).filter(Boolean))];
      return used.length ? used.join(' + ') : 'cash';
    })(),
    orderType: 'pos', invoiceId, customerId: order.customerId || null,
    // Matches exactly what new-order.js sends: discountType is
    // 'percentage' or 'amount', discountValue is the raw number entered.
    // (Sales List reads these three field names directly.)
    discountType: order.discountType || 'percentage',
    discountValue: order.discountValue || 0,
    discountAmount: order.discountType === 'amount'
      ? (order.discountValue || 0)
      : ((order.subtotal || 0) * (order.discountValue || 0) / 100),
    note: order.note || '', subtotal: order.subtotal, total: order.grandTotal ?? order.total,
    // pharmacy-pos's own screens (dashboard.js, sales-list.js) read
    // `grandTotal`, not `total` — stored alongside so both this POS and
    // your site's dashboard read correctly from the same doc.
    grandTotal: order.grandTotal ?? order.total,
    date: order.date || new Date().toISOString(),
    taxPercent: order.taxPercent || 0, taxAmount: order.taxAmount || 0,
    paidAmount: order.paidAmount ?? order.grandTotal ?? order.total,
    dueAmount: order.dueAmount || 0, returnedAmount: 0,
    status: order.status || 'delivered',
    items: (items || []).map(i => {
      const qty = i.qty ?? i.quantity ?? 0;
      const unitPrice = i.unitPrice ?? i.price ?? 0;
      const itemDiscount = parseFloat(i.itemDiscount) || 0;
      // Use the client's computed total when given — it already accounts
      // for this item's own discount (see New Order's per-item Disc %
      // field). Recomputing price*qty here would silently drop that
      // discount from the stored order.
      const total = i.total !== undefined ? i.total : unitPrice * qty;
      return {
        slug: i.productId || i.slug, name: i.productName || i.name, category: i.category || '',
        price: unitPrice, quantity: qty, unit: i.unit || '',
        unit_size: i.unit_size || '1', strength: i.strength || '', byPiece: i.byPiece || false,
        itemDiscount,
        // pharmacy-pos's own screens read `qty`/`unitPrice`/`total`/
        // `productName` per item, not `quantity`/`price`/`name` — same
        // reason as grandTotal above.
        qty, unitPrice, total,
        productName: i.productName || i.name, variationName: i.variationName || '',
      };
    }),
    payments: payments || [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  const ref = await db.collection('orders').add(docData);
  await deductStock(docData.items.filter(i => i.slug).map(i => ({ slug: i.slug, quantity: i.quantity })));
  return { id: ref.id, invoiceId };
}

async function restoreStockForOrder(orderId) {
  const doc = await db.collection('orders').doc(orderId).get();
  if (!doc.exists) return;
  const items = doc.data().items || [];
  const restore = items.filter(i => i.slug).map(i => ({ slug: i.slug, quantity: -i.quantity }));
  await deductStock(restore); // negative quantity = adds back
}

async function deleteOrder(id) {
  await restoreStockForOrder(id);
  await db.collection('orders').doc(id).delete();
}

async function updateOrder(id, payload) {
  await restoreStockForOrder(id);
  await db.collection('orders').doc(id).delete();
  return createOrder(payload); // re-create with new data; new doc id (matches original's delete+recreate approach)
}

// ── Returns ───────────────────────────────────────────────────
async function listReturns() {
  const snap = await db.collection('pos_returns').orderBy('date', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function createReturn({ returnRecord, items }) {
  const returnId = returnRecord.returnId || await nextCounter('RET-');
  const docData = {
    returnId, orderId: returnRecord.orderId, invoiceId: returnRecord.invoiceId,
    customerName: returnRecord.customerName, customerPhone: returnRecord.customerPhone,
    date: new Date(returnRecord.date).toISOString(),
    returnTotal: returnRecord.returnTotal, status: returnRecord.status || 'completed',
    items: (items || []).map(i => ({
      slug: i.productId || i.slug, productName: i.productName, qty: i.qty, unitPrice: i.unitPrice, returnAmount: i.returnAmount,
    })),
  };
  const ref = await db.collection('pos_returns').add(docData);
  await deductStock(docData.items.filter(i => i.slug).map(i => ({ slug: i.slug, quantity: -i.qty })));
  if (returnRecord.orderId) {
    await db.collection('orders').doc(returnRecord.orderId).update({
      returnedAmount: admin.firestore.FieldValue.increment(returnRecord.returnTotal || 0),
    }).catch(() => {}); // ignore if the order doc doesn't have this field yet
  }
  return ref.id;
}

// ── Backup ────────────────────────────────────────────────────
async function exportBackup() {
  const collections = ['pos_categories', 'inventory', 'pos_customers', 'orders', 'pos_returns', 'pos_counters', 'pos_coupons', 'pos_expenses', 'pos_expense_categories'];
  const result = {};
  for (const name of collections) {
    const snap = await db.collection(name).get();
    result[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  const users = await listUsers();
  result.pos_users = users;
  return result;
}

async function importBackup(data) {
  const collections = ['pos_categories', 'inventory', 'pos_customers', 'orders', 'pos_returns', 'pos_counters', 'pos_coupons', 'pos_expenses', 'pos_expense_categories'];
  for (const name of collections) {
    if (!Array.isArray(data[name])) continue;
    const batch = db.batch();
    for (const item of data[name]) {
      const { id, ...rest } = item;
      batch.set(db.collection(name).doc(id || undefined), rest);
    }
    await batch.commit();
  }
  // Users are re-imported with their existing hashed passwords as-is (no plaintext fallback)
  if (Array.isArray(data.pos_users)) {
    const batch = db.batch();
    for (const u of data.pos_users) {
      const { id, ...rest } = u;
      if (id) batch.set(db.collection(USERS).doc(id), rest, { merge: true });
    }
    await batch.commit();
  }
}

// ── Prescriptions (uploaded by customers on the main site) ──────
async function listPrescriptions() {
  const snap = await db.collection('prescriptions').get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const at = a.uploadedAt?.toMillis?.() || 0;
    const bt = b.uploadedAt?.toMillis?.() || 0;
    return bt - at;
  });
  return list;
}
async function updatePrescriptionStatus(id, status) {
  await db.collection('prescriptions').doc(id).update({ status });
}

// ── Online orders (customer checkout orders — everything in `orders`
// that ISN'T a POS sale, which already has its own listOrders() above) ──
async function listOnlineOrders() {
  const snap = await db.collection('orders').get();
  const list = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(o => o.orderType !== 'pos');
  list.sort((a, b) => {
    const at = a.createdAt?.toMillis?.() || 0;
    const bt = b.createdAt?.toMillis?.() || 0;
    return bt - at;
  });
  return list;
}
async function updateOnlineOrderStatus(id, status) {
  await db.collection('orders').doc(id).update({ status });
}

// ── Site users (customer accounts on the main site — read-only here,
// account management itself stays on the React site) ──
async function listSiteUsers() {
  const snap = await db.collection('users').get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const at = a.createdAt?.toMillis?.() || 0;
    const bt = b.createdAt?.toMillis?.() || 0;
    return bt - at;
  });
  return list;
}

module.exports = {
  login, googleLogin, changePassword, forgotPassword, resetPassword, listUsers, createUser, updateUser, deleteUser,
  getSettings, updateSettings,
  listCoupons, createCoupon, deleteCoupon,
  listExpenses, createExpense, deleteExpense, listExpenseCategories, createExpenseCategory, deleteExpenseCategory,
  listCategories, createCategory, deleteCategory,
  listCustomers, createCustomer, updateCustomer, deleteCustomer,
  nextCounter,
  listOrders, getOrder, createOrder, deleteOrder, updateOrder,
  listReturns, createReturn,
  exportBackup, importBackup,
  listPrescriptions, updatePrescriptionStatus,
  listOnlineOrders, updateOnlineOrderStatus,
  listSiteUsers,
};
