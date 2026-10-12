// Shared by the /api/catalog/* functions. Deliberately has NO dependency on
// firebase-admin or server.js — catalog browsing only ever needs the CSV, so
// it runs on Vercel's own fast functions instead of Render (free tier sleeps
// after 15 min idle; fine for POS staff, not for customers browsing).

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

let cache = null;

function loadCatalog() {
  if (cache) return cache;
  const csvPath = path.join(__dirname, '..', 'pharmacy-pos-backend', 'medicines.csv');
  const raw = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true });
  const all = parsed.data.filter((r) => r.medicine_name && r.slug);

  // Group by category once, so category browsing is a map lookup.
  const catMap = new Map();
  for (const r of all) {
    const name = (r.category_name || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    let c = catMap.get(key);
    if (!c) {
      c = { name, count: 0, rows: [] };
      catMap.set(key, c);
    }
    c.rows.push(r);
    c.count++;
  }
  const cats = [...catMap.values()].sort((a, b) => b.count - a.count);

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
