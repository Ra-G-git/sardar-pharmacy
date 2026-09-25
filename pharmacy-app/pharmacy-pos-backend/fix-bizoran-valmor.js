// FINAL FIX for the last 2 items — resolved by looking up both barcodes
// against real Bangladeshi pharmacy listings:
//
//   Bizoran: barcode 8941100357699 is registered to Bizoran 5/40 (not
//   5/20 as the corrupted record currently shows) -> bizoran-540-tablet,
//   stock 43 kept (it belongs with this barcode).
//
//   Valmor: the new catalog's price (85.0) for Valmor 50 is simply
//   wrong — 4 independent BD pharmacy listings confirm Valmor 50
//   (24mg+26mg) is ৳450/10-pack, which is exactly what you already had.
//   Keeping your existing price, just relinking to the new slug for
//   consistency. -> valmor-50-tablet, price stays 450.00.
//
// Run from pharmacy-pos-backend/:
//   node fix-bizoran-valmor.js

const { db, admin } = require('./firebaseAdmin');

async function main() {
  const batch = db.batch();

  // --- Bizoran: bizoran-tablet -> bizoran-540-tablet ---
  const bizDoc = await db.collection('inventory').doc('bizoran-tablet').get();
  if (bizDoc.exists) {
    const d = bizDoc.data();
    batch.set(db.collection('inventory').doc('bizoran-540-tablet'), {
      slug: 'bizoran-540-tablet',
      medicine_name: 'Bizoran 5/40',
      generic_name: 'Amlodipine + Olmesartan Medoxomil',
      category_name: 'Tablet',
      strength: '5mg + 40mg',
      manufacturer_name: 'Beximco Pharmaceuticals Ltd.',
      unit: 'Piece',
      unit_size: '1',
      price: 20.0,
      stock: d.stock ?? 0,
      barcode: d.barcode,
      image: d.image || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: false });
    batch.delete(db.collection('inventory').doc('bizoran-tablet'));
    console.log(`Bizoran: [bizoran-tablet] -> [bizoran-540-tablet]  price 180.0 -> 20.0  stock kept: ${d.stock}`);
  } else {
    console.log('Bizoran: bizoran-tablet not found — already handled?');
  }

  // --- Valmor: valmor-50-mg-tablet -> valmor-50-tablet (price kept at 450) ---
  const valDoc = await db.collection('inventory').doc('valmor-50-mg-tablet').get();
  if (valDoc.exists) {
    const d = valDoc.data();
    batch.set(db.collection('inventory').doc('valmor-50-tablet'), {
      slug: 'valmor-50-tablet',
      medicine_name: 'Valmor 50',
      generic_name: 'Sacubitril + Valsartan',
      category_name: 'Tablet',
      strength: '24mg + 26mg',
      manufacturer_name: 'Square Pharmaceuticals PLC.',
      unit: d.unit || "10's pack",
      unit_size: d.unit_size || '10',
      price: 450.0, // keeping your verified real price, not the new file's wrong 85.0
      stock: d.stock ?? 0,
      barcode: d.barcode,
      image: d.image || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: false });
    batch.delete(db.collection('inventory').doc('valmor-50-mg-tablet'));
    console.log(`Valmor: [valmor-50-mg-tablet] -> [valmor-50-tablet]  price kept at 450.0  stock kept: ${d.stock}`);
  } else {
    console.log('Valmor: valmor-50-mg-tablet not found — already handled?');
  }

  await batch.commit();
  console.log('\nDone.');
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
