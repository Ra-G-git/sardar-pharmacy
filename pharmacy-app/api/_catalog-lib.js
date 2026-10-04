// Shared by the /api/catalog/* functions below. Deliberately has NO
// dependency on firebase-admin or server.js — this is the whole point:
// catalog search only ever needs the CSV, so it runs on Vercel's own fast
// functions instead of being routed to Render. Render is free-tier and
// sleeps after 15 minutes idle (30-60s cold start) — fine for POS, where
// only staff wait on it, but not something customers browsing the
// storefront should ever hit.

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
  cache = { all };
  return cache;
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
// casual/scripted scraping, but it's NOT a hard guarantee — a cold start
// resets the counter, and traffic can land on more than one instance
// under real load. For a strict guarantee, swap this for Vercel KV or
// Upstash Redis (a few lines once you have one connected).
const hits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_HITS = 120;

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_HITS;
}

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? fwd.split(',')[0].trim() : req.socket?.remoteAddress) || 'unknown';
}

module.exports = { loadCatalog, publicRow, isRateLimited, getIp };
