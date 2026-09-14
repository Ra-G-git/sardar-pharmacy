// Run with: node check-orders.js
// (from inside pharmacy-pos-backend/, same folder as serviceAccountKey.json)
//
// Prints every order in Firestore's `orders` collection with orderType
// 'pos', so we can see directly whether they're actually being saved,
// what their `date` field looks like, etc. — instead of guessing from
// what the UI shows.

const { db } = require('./firebaseAdmin');

(async () => {
  try {
    const snap = await db.collection('orders').where('orderType', '==', 'pos').get();
    console.log(`Found ${snap.size} POS order(s) in Firestore:\n`);
    snap.docs.forEach(doc => {
      const d = doc.data();
      console.log(`--- ${doc.id} ---`);
      console.log('  invoiceId:', d.invoiceId);
      console.log('  date:', d.date);
      console.log('  name/phone:', d.name, '/', d.phone);
      console.log('  total:', d.total, ' grandTotal:', d.grandTotal);
      console.log('  discountAmount:', d.discountAmount);
      console.log('  payments:', JSON.stringify(d.payments));
      console.log('  items:', (d.items || []).length);
      console.log('  createdAt:', d.createdAt ? d.createdAt.toDate?.() || d.createdAt : null);
      console.log('');
    });
    process.exit(0);
  } catch (err) {
    console.error('ERROR querying orders:', err.message);
    process.exit(1);
  }
})();
