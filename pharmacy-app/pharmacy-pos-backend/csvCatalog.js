// Loads medicines.csv once per server instance and keeps it in memory —
// this is the same file your React app serves from public/medicines.csv,
// copied here so the Express/serverless backend can read it directly.
// (~20,000 rows; parsing once and caching avoids re-parsing on every request.)

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

let cache = null; // { all: [...], bySlug: Map }

function loadCatalog() {
  if (cache) return cache;
  const csvPath = path.join(__dirname, 'medicines.csv');
  const raw = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true });
  const all = parsed.data.filter(r => r.medicine_name && r.slug);
  const bySlug = new Map();
  for (const row of all) bySlug.set(row.slug, row);
  cache = { all, bySlug };
  return cache;
}

module.exports = { loadCatalog };
