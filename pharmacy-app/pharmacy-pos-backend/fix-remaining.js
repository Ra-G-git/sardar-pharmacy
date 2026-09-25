// FOLLOW-UP SCRIPT — resolves 4 of the 9 items reset-to-new-catalog.js
// left untouched, now that they've been checked by hand:
//
//   Angilock Plus (50mg+12.5mg)  -> angilock-plus-50125   price 10.0
//   Viglimet (50mg+500mg)        -> viglimet-50500-tablet price 20.0
//   Dermasol-N                   -> dermasol-n            price 100.0
//   Entacyd Plus (400/400/30 tab)-> entacyd-plus-tablet   price 2.5
//   Saloride (100ml bottle)      -> saloride-iv-iv-nfusion price 48.06
//       (this slug has 3 duplicate rows in the new CSV with different
//        prices — 48.06 is the one whose price exactly matches what
//        you were already charging, so that's the one used)
//
// Left alone on purpose, not touched by this script either:
//   - Adovas, MaxiMilk        — genuinely not in the new catalog at all
//   - Bizoran                 — needs a manual stock decision (see earlier)
//   - Valmor                  — the name/dose matches (Valmor 50), but the
//     new price (85.0) is a lot lower than what you had (450.0) with a
//     different pack size (10-pack vs single piece) — worth confirming
//     with your supplier before trusting it, so left for you to move
//     by hand once you're sure.
//
// Run from pharmacy-pos-backend/, same as before:
//   node fix-remaining.js

const { db, admin } = require('./firebaseAdmin');

const FIXES = [
  { oldSlug: 'angilock-plus-50-mg-12-5-mg-tablet', newSlug: 'angilock-plus-50125' },
  { oldSlug: 'viglimet-50-mg-500-mg-tablet',        newSlug: 'viglimet-50500-tablet' },
  { oldSlug: 'dermasol-n-25-gm-cream',               newSlug: 'dermasol-n' },
  { oldSlug: 'entacyd-plus-400-mg-400-mg-30-mg-tablet', newSlug: 'entacyd-plus-tablet' },
  { oldSlug: 'saloride-0-9-iv-infusion',              newSlug: 'saloride-iv-iv-nfusion' },
];

const NEW_DATA = {
  'angilock-plus-50125': { medicine_name: 'Angilock Plus 50/12.5', generic_name: 'Hydrochlorothiazide + Losartan Potassium', category_name: 'Tablet', strength: '12.5mg + 50mg', manufacturer_name: 'Square Pharmaceuticals PLC.', unit: 'Piece', unit_size: '1', price: 10.0 },
  'viglimet-50500-tablet': { medicine_name: 'Viglimet 50/500', generic_name: 'Metformin Hydrochloride + Vildagliptin', category_name: 'Tablet', strength: '500 mg + 50 mg', manufacturer_name: 'Square Pharmaceuticals PLC.', unit: 'Piece', unit_size: '1', price: 20.0 },
  'dermasol-n': { medicine_name: 'Dermasol N', generic_name: 'Clobetasol Propionate + Neomycin Sulphate + Nystatin topical', category_name: 'Cream', strength: '50 mg + 500 mg + 100 Lac', manufacturer_name: 'Square Pharmaceuticals PLC.', unit: '25 gm tube', unit_size: '1', price: 100.0 },
  'entacyd-plus-tablet': { medicine_name: 'Entacyd PLUS', generic_name: 'Aluminium Hydroxide + Magnesium Hydroxide + Simethicone', category_name: 'Tablet', strength: '400 mg + 400 mg + 30 mg', manufacturer_name: 'Square Pharmaceuticals Ltd.', unit: 'piece', unit_size: '1', price: 2.5 },
  'saloride-iv-iv-nfusion': { medicine_name: 'Saloride IV', generic_name: 'Sodium Chloride 0.9% IV prep', category_name: 'IV infusion', strength: '0.90%', manufacturer_name: 'Beximco Pharmaceuticals Ltd.', unit: '100 ml bottle: 250 ml bottle: 1000 ml bag', unit_size: '1', price: 48.06 },
};

async function main() {
  const batch = db.batch();
  let applied = 0;

  for (const { oldSlug, newSlug } of FIXES) {
    const doc = await db.collection('inventory').doc(oldSlug).get();
    if (!doc.exists) {
      console.log(`[skip] ${oldSlug} — no longer exists (already handled?)`);
      continue;
    }
    const data = doc.data();
    const nd = NEW_DATA[newSlug];

    batch.set(db.collection('inventory').doc(newSlug), {
      slug: newSlug,
      medicine_name: nd.medicine_name,
      generic_name: nd.generic_name,
      category_name: nd.category_name,
      strength: nd.strength,
      manufacturer_name: nd.manufacturer_name,
      unit: nd.unit,
      unit_size: nd.unit_size,
      price: nd.price,
      stock: data.stock ?? 0,
      barcode: data.barcode,
      image: data.image || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: false });
    batch.delete(db.collection('inventory').doc(oldSlug));

    console.log(`"${data.medicine_name}"  [${oldSlug}] -> [${newSlug}]   price ${data.price} -> ${nd.price}   stock kept: ${data.stock ?? 0}`);
    applied++;
  }

  if (applied) {
    await batch.commit();
    console.log(`\nApplied ${applied} fix(es).`);
  } else {
    console.log('\nNothing to apply.');
  }
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
