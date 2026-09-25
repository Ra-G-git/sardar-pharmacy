// ONE-TIME SCRIPT — finds your tracked (sold/edited) medicines in Firestore
// and renames each one to match the new medicines.csv (the new file uses
// different slugs, so this reconnects them to search/cart).
//
// "Renaming" a Firestore doc isn't a real operation — a doc's ID can't be
// changed in place, so this does the only equivalent: copies the record to
// a new doc under the new slug, then deletes the old one. Net effect is a
// rename.
//
// Matches by the record's own saved name + strength (every tracked doc
// already stores these — see productsFirestore.js), with manufacturer as
// a tiebreaker. Anything with more than one possible match, or no match
// at all, is left untouched and printed at the end for you to handle
// by hand — there's no safe way to guess those automatically.
//
// HOW TO RUN (from pharmacy-pos-backend/, where serviceAccountKey.json
// already lives, and the NEW medicines.csv is already sitting):
//
//   node rename-slugs.js

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { db, admin } = require('./firebaseAdmin');

function normalize(str) {
  return (str || '').toString().toLowerCase().replace(/[.,()]/g, '').replace(/\s+/g, ' ').trim();
}
function normalizeStrength(str) {
  return (str || '').toString().toLowerCase().replace(/\s+/g, '').trim();
}

function loadNewCatalog() {
  const raw = fs.readFileSync(path.join(__dirname, 'medicines.csv'), 'utf8');
  return Papa.parse(raw, { header: true, skipEmptyLines: true }).data.filter(r => r.medicine_name && r.slug);
}

async function main() {
  const newRows = loadNewCatalog();

  const byNameStrength = new Map();
  const byNameOnly = new Map();
  for (const row of newRows) {
    const fullKey = normalize(row.medicine_name) + '|' + normalizeStrength(row.strength);
    const nameKey = normalize(row.medicine_name);
    if (!byNameStrength.has(fullKey)) byNameStrength.set(fullKey, []);
    byNameStrength.get(fullKey).push(row);
    if (!byNameOnly.has(nameKey)) byNameOnly.set(nameKey, []);
    byNameOnly.get(nameKey).push(row);
  }

  const invSnap = await db.collection('inventory').get();
  console.log(`Checking ${invSnap.docs.length} tracked record(s)...\n`);

  const renamed = [];
  const skipped = [];
  const batch = db.batch();

  for (const doc of invSnap.docs) {
    const data = doc.data();
    const oldSlug = doc.id;
    const nameKey = normalize(data.medicine_name);
    const strKey = normalizeStrength(data.strength);
    const mfgKey = normalize(data.manufacturer_name);

    let match = null;
    const exact = byNameStrength.get(nameKey + '|' + strKey) || [];
    if (exact.length === 1) match = exact[0];
    else if (exact.length > 1) {
      const byMfg = exact.filter(r => normalize(r.manufacturer_name) === mfgKey);
      if (byMfg.length === 1) match = byMfg[0];
    }
    if (!match) {
      const byName = byNameOnly.get(nameKey) || [];
      if (byName.length === 1) match = byName[0];
      else if (byName.length > 1) {
        const byMfg = byName.filter(r => normalize(r.manufacturer_name) === mfgKey);
        if (byMfg.length === 1) match = byMfg[0];
      }
    }

    if (!match || match.slug === oldSlug) {
      if (!match) skipped.push({ oldSlug, data, reason: 'no confident match in new catalog' });
      continue; // already correct slug, or nothing to do
    }

    batch.set(db.collection('inventory').doc(match.slug), {
      slug: match.slug,
      medicine_name: match.medicine_name,
      generic_name: match.generic_name || '',
      category_name: match.category_name || '',
      strength: match.strength || '',
      manufacturer_name: match.manufacturer_name || '',
      unit: match.unit || '',
      unit_size: match.unit_size || '1',
      price: match.price,
      stock: data.stock ?? 0,
      barcode: data.barcode || null,
      image: data.image || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.delete(db.collection('inventory').doc(oldSlug));

    renamed.push({ oldSlug, newSlug: match.slug, name: data.medicine_name, oldPrice: data.price, newPrice: match.price });
  }

  if (renamed.length) {
    await batch.commit();
    console.log(`Renamed ${renamed.length} record(s):`);
    renamed.forEach(r => console.log(`  "${r.name}"  [${r.oldSlug}] -> [${r.newSlug}]   price ${r.oldPrice} -> ${r.newPrice}`));
  } else {
    console.log('Nothing needed renaming.');
  }

  if (skipped.length) {
    console.log(`\n${skipped.length} record(s) left untouched — no confident match found, handle these by hand:`);
    skipped.forEach(s => console.log(`  [${s.oldSlug}] "${s.data.medicine_name}" ${s.data.strength || ''} (${s.data.manufacturer_name || 'no manufacturer'}) — stock: ${s.data.stock}`));
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
