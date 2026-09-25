// READ-ONLY — just prints what's currently sitting in these two records
// so you can decide how to fix them. Nothing is written or deleted.
//
// Run from pharmacy-pos-backend/:
//   node inspect.js

const { db } = require('./firebaseAdmin');

async function main() {
  for (const slug of ['bizoran-tablet', 'valmor-50-mg-tablet']) {
    const doc = await db.collection('inventory').doc(slug).get();
    if (!doc.exists) {
      console.log(`[${slug}] does not exist`);
      continue;
    }
    console.log(`[${slug}]`);
    console.log(JSON.stringify(doc.data(), null, 2));
    console.log('');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
