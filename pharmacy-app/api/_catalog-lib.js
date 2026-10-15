// Shared by the /api/catalog/* functions. Deliberately has NO dependency on
// firebase-admin or server.js — catalog browsing only ever needs the CSV, so
// it runs on Vercel's own fast functions instead of Render (free tier sleeps
// after 15 min idle; fine for POS staff, not for customers browsing).

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { CONCERNS, concernOf } = require('./_concerns');

let cache = null;

function loadCatalog() {
  if (cache) return cache;
  const csvPath = path.join(__dirname, '..', 'pharmacy-pos-backend', 'medicines.csv');
  const raw = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true });
  const all = parsed.data.filter((r) => r.medicine_name && r.slug);

  // Group by what the customer is shopping for (skin care, diabetes ...),
  // not by dosage form. Done once per warm instance, so browsing a shelf is
  // a map lookup.
  const byId = new Map(CONCERNS.map((c) => [c.id, { ...c, name: c.label, count: 0, rows: [] }]));
  for (const r of all) {
    const c = byId.get(concernOf(r));
    r.concern = c.label;
    c.rows.push(r);
    c.count++;
  }
  const catMap = new Map();
  const cats = [];
  for (const def of CONCERNS) {
    const c = byId.get(def.id);
    if (c.count === 0) continue;
    catMap.set(c.name.toLowerCase(), c);
    cats.push(c); // CONCERNS order = display order ("More Medicines" last)
  }

  cache = { all, catMap, cats };
  return cache;
}

function getCategory(name) {
  const key = String(name || '').trim().toLowerCase();
  if (!key || key.length > 80) return null;
  return loadCatalog().catMap.get(key) || null;
}

// n distinct random items without shuffling the whole array.
function sampleN(arr, n) {
  if (arr.length <= n) return [...arr].sort(() => Math.random() - 0.5);
  const picked = new Set();
  while (picked.size < n) picked.add(Math.floor(Math.random() * arr.length));
  return [...picked].map((i) => arr[i]);
}

function publicRow(r) {
  return {
    slug: r.slug,
    medicine_name: r.medicine_name,
    generic_name: r.generic_name,
    category_name: r.category_name,
    concern: r.concern,
    manufacturer_name: r.manufacturer_name,
    strength: r.strength,
    unit_size: r.unit_size,
    price: r.price,
  };
}

// Best-effort rate limiting: an in-memory counter per warm instance.
// Vercel reuses warm instances for bursts of traffic, so this blunts
// casual/scripted scraping, but it is NOT a hard guarantee — a cold start
// resets the counter, and traffic can land on more than one instance. For a
// strict guarantee, swap this for Vercel KV or Upstash Redis.
const hits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_HITS = 120;

function isRateLimited(ip) {
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    }
  }
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_HITS;
}

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? fwd.split(',')[0].trim() : req.socket?.remoteAddress) || 'unknown';
}

module.exports = { loadCatalog, getCategory, sampleN, publicRow, isRateLimited, getIp };
