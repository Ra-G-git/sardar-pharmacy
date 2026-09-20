// Mirrors the pattern already used in POSPage.js / MedicineList.js:
//   - medicines.csv is the base catalog (~20k items): name, generic, category,
//     strength, manufacturer, unit, unit_size, base price — keyed by `slug`
//   - Firestore `inventory` collection holds ONLY items that have been edited
//     or sold at least once. Where a doc exists, its price/stock/barcode/unit
//     override the CSV values. Where it doesn't, the item is still fully
//     searchable/sellable at the CSV base price, just with no stock tracking
//     ("untracked" — matches the current site's behavior exactly).
//   - Editing or selling an item is what makes it "tracked": that's the
//     moment it starts counting toward dashboard totals, low-stock alerts,
//     and reports in pharmacy-pos's other screens.

const { db, admin } = require('./firebaseAdmin');
const { loadCatalog } = require('./csvCatalog');
const COLLECTION = 'inventory';

function mergeRecord(csvRow, invDoc) {
  const inv = invDoc && invDoc.exists ? invDoc.data() : null;
  const slug = csvRow.slug;
  return {
    id: slug,
    slug,
    tracked: !!inv, // false = never edited/sold, CSV data only
    // A value saved from the Edit Product form (stored on the Firestore doc) wins
    // over the CSV's; otherwise edits to these fields were saved but never shown.
    medicine_name: (inv && inv.medicine_name) || csvRow.medicine_name,
    generic_name: (inv && inv.generic_name) || csvRow.generic_name,
    category_name: (inv && inv.category_name) || csvRow.category_name,
    strength: (inv && inv.strength) || csvRow.strength || '',
    manufacturer_name: (inv && inv.manufacturer_name) || csvRow.manufacturer_name || '',
    unit: (inv && inv.unit) || csvRow.unit || '',
    unit_size: csvRow.unit_size || '1',
    price: (inv && inv.price) || csvRow.price,
    stock: inv ? (inv.stock ?? 0) : null, // null = untracked, not "zero"
    barcode: (inv && inv.barcode) || null,
    image: (inv && inv.image) || null,
    name: (inv && inv.medicine_name) || csvRow.medicine_name,
    generic: (inv && inv.generic_name) || csvRow.generic_name,
    brand: (inv && inv.manufacturer_name) || csvRow.manufacturer_name,
    sku: slug,
    sellingPrice: (inv && inv.price) || csvRow.price,
  };
}

async function listProducts({ search } = {}) {
  const { all } = loadCatalog();
  let rows = all;

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter(r =>
      r.medicine_name?.toLowerCase().includes(q) ||
      r.generic_name?.toLowerCase().includes(q) ||
      r.category_name?.toLowerCase().includes(q)
    );
  }

  const invSnap = await db.collection(COLLECTION).get();
  const invMap = new Map();
  invSnap.docs.forEach(d => invMap.set(d.id, d));

  return rows.map(r => mergeRecord(r, invMap.get(r.slug)));
}

// Same output shape as mergeRecord(), for a tracked item that has no CSV
// counterpart (a manually-added product, or one auto-created by deductStock
// the first time an untracked item was sold). Every consumer of product
// data (Medicine page, cart, etc.) expects these fields to always exist —
// returning a partial object here was crashing the Medicine page whenever
// one of these existed.
function shapeUntrackedRecord(id, data) {
  return {
    id, slug: id, tracked: true,
    medicine_name: data.medicine_name || '',
    generic_name: data.generic_name || '',
    category_name: data.category_name || '',
    strength: data.strength || '',
    manufacturer_name: data.manufacturer_name || '',
    unit: data.unit || '',
    unit_size: data.unit_size || '1',
    price: data.price || '0',
    stock: data.stock ?? 0,
    barcode: data.barcode || null,
    image: data.image || null,
    name: data.medicine_name || '',
    generic: data.generic_name || '',
    brand: data.manufacturer_name || '',
    sku: id,
    sellingPrice: data.price || '0',
  };
}

async function listTrackedProducts() {
  const { bySlug } = loadCatalog();
  const invSnap = await db.collection(COLLECTION).get();
  return invSnap.docs.map(d => {
    const csvRow = bySlug.get(d.id);
    if (csvRow) return mergeRecord(csvRow, d);
    return shapeUntrackedRecord(d.id, d.data());
  });
}

async function getProduct(slug) {
  const { bySlug } = loadCatalog();
  const csvRow = bySlug.get(slug);
  const invDoc = await db.collection(COLLECTION).doc(slug).get();
  if (!csvRow && !invDoc.exists) return null;
  if (!csvRow) {
    return shapeUntrackedRecord(slug, invDoc.data());
  }
  return mergeRecord(csvRow, invDoc);
}

async function upsertProduct(slug, body) {
  const { bySlug } = loadCatalog();
  const csvRow = bySlug.get(slug) || {};
  const ref = db.collection(COLLECTION).doc(slug);
  const existing = await ref.get();
  const isNew = !existing.exists;

  const data = { slug, updatedAt: admin.firestore.FieldValue.serverTimestamp() };

  // Only write a field if the caller explicitly provided it, OR this is a
  // brand-new record that needs a complete starting point from the CSV.
  // This is the key fix: a partial call (e.g. syncing just the price after
  // checkout) no longer silently resets every other field on an EXISTING
  // record back to its CSV default — previously this wiped barcode to
  // blank and reset generic/category/manufacturer/etc. on every such call.
  const setIfProvidedOrNew = (key, csvFallback) => {
    if (body[key] !== undefined) {
      data[key] = body[key];
    } else if (isNew) {
      data[key] = csvFallback !== undefined ? csvFallback : '';
    }
  };

  setIfProvidedOrNew('medicine_name', csvRow.medicine_name);
  setIfProvidedOrNew('generic_name', csvRow.generic_name);
  setIfProvidedOrNew('category_name', csvRow.category_name);
  setIfProvidedOrNew('strength', csvRow.strength || '');
  setIfProvidedOrNew('manufacturer_name', csvRow.manufacturer_name || '');
  setIfProvidedOrNew('unit', csvRow.unit || '');
  setIfProvidedOrNew('unit_size', csvRow.unit_size || '1');

  if (body.price !== undefined) {
    data.price = parseFloat(body.price).toFixed(2);
  } else if (isNew) {
    data.price = csvRow.price ?? '0';
  }

  if (body.barcode !== undefined) {
    data.barcode = (body.barcode || '').trim();
  } else if (isNew) {
    data.barcode = '';
  }

  // Only touch `image` when the caller actually sent one (including an
  // explicit empty string to clear it) — otherwise leave whatever's
  // already on the doc alone, since {merge:true} won't wipe a field
  // that's simply absent from `data`.
  if (body.image !== undefined) {
    data.image = body.image || null;
  }

  if (body.stock !== undefined && body.stock !== '') {
    data.stock = parseInt(body.stock) || 0;
  } else if (isNew) {
    data.stock = 0;
  }

  if (isNew) data.createdAt = admin.firestore.FieldValue.serverTimestamp();

  await ref.set(data, { merge: true });
  return slug;
}

async function bulkUpsertProducts(items) {
  const batch = db.batch();
  for (const item of items) {
    const slug = item.slug || item.id;
    if (!slug) continue;
    const ref = db.collection(COLLECTION).doc(slug);
    const data = { ...item, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    delete data.id;
    batch.set(ref, data, { merge: true });
  }
  await batch.commit();
}

async function resolveScan(code) {
  const trimmed = String(code).trim();
  const { bySlug } = loadCatalog();

  if (bySlug.has(trimmed)) {
    const invDoc = await db.collection(COLLECTION).doc(trimmed).get();
    return mergeRecord(bySlug.get(trimmed), invDoc);
  }

  const snap = await db.collection(COLLECTION).where('barcode', '==', trimmed).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const csvRow = bySlug.get(doc.id);
  if (csvRow) return mergeRecord(csvRow, doc);
  return shapeUntrackedRecord(doc.id, doc.data());
}

// General stock adjustment (restocking, corrections) — qty can be positive
// or negative. Distinct from deductStock, which is specifically for sales.
async function bulkStockUpdate(updates) {
  const batch = db.batch();
  for (const u of updates) {
    const amount = parseInt(u.qty) || 0;
    if (amount === 0) continue;
    const slug = u.id || u.slug;
    const ref = db.collection(COLLECTION).doc(slug);
    batch.set(ref, { stock: admin.firestore.FieldValue.increment(amount) }, { merge: true });
  }
  await batch.commit();
}

async function deductStock(items) {
  const { bySlug } = loadCatalog();
  const batch = db.batch();
  for (const item of items) {
    const qty = parseInt(item.quantity) || 0;
    if (qty === 0) continue;
    const ref = db.collection(COLLECTION).doc(item.slug);
    const snap = await ref.get();
    if (snap.exists) {
      const current = snap.data().stock || 0;
      batch.update(ref, { stock: Math.max(0, current - qty) });
    } else {
      // First time this item has ever been sold/returned — it was
      // "untracked" (unlimited, per the CSV) up to now. Selling it means
      // it must have been in stock, so start tracking it instead of
      // silently discarding the sale. We don't know the real prior count,
      // so a sale (qty > 0) leaves it at 0; a return with no prior record
      // (qty < 0) starts the count at the returned amount.
      const csvRow = bySlug.get(item.slug) || {};
      batch.set(ref, {
        slug: item.slug,
        medicine_name: csvRow.medicine_name || null,
        generic_name: csvRow.generic_name || null,
        category_name: csvRow.category_name || null,
        strength: csvRow.strength || '',
        manufacturer_name: csvRow.manufacturer_name || '',
        unit: csvRow.unit || '',
        unit_size: csvRow.unit_size || '1',
        price: csvRow.price || '0',
        stock: qty < 0 ? -qty : 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }
  await batch.commit();
}

async function restoreProduct(slug) {
  await db.collection(COLLECTION).doc(slug).update({ deletedAt: admin.firestore.FieldValue.delete() });
}

async function softDeleteProduct(slug, permanent = false) {
  const ref = db.collection(COLLECTION).doc(slug);
  if (permanent) {
    await ref.delete();
  } else {
    await ref.update({ deletedAt: admin.firestore.FieldValue.serverTimestamp() });
  }
}

module.exports = {
  listProducts, listTrackedProducts, getProduct, upsertProduct, bulkUpsertProducts,
  resolveScan, deductStock, bulkStockUpdate, restoreProduct, softDeleteProduct,
};
