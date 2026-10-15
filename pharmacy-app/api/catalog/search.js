const { loadCatalog, publicRow, isRateLimited, getIp } = require('../_catalog-lib');

const MAX_RESULTS = 60;

module.exports = (req, res) => {
  if (isRateLimited(getIp(req))) {
    res.status(429).json({ error: 'Too many requests — please slow down.' });
    return;
  }

  const q = String(req.query.q || '').trim().toLowerCase();
  if (q.length < 2) {
    res.status(400).json({ error: 'Search query must be at least 2 characters.' });
    return;
  }

  const { all } = loadCatalog();
  // Search every field (name, generic, category, shelf) but rank by where
  // the match was found, so the medicine name always wins:
  // 0 exact name, 1 name starts with, 2 name contains, 3 generic,
  // 4 category / shelf (e.g. "skin", "dental", "diabetes").
  const ranked = [];
  for (const r of all) {
    const name = (r.medicine_name || '').toLowerCase();
    let rank = -1;
    if (name === q) rank = 0;
    else if (name.startsWith(q)) rank = 1;
    else if (name.includes(q)) rank = 2;
    else if ((r.generic_name || '').toLowerCase().includes(q)) rank = 3;
    else if (
      (r.category_name || '').toLowerCase().includes(q) ||
      (r.concern || '').toLowerCase().includes(q)
    ) rank = 4;
    if (rank >= 0) ranked.push({ r, rank, len: name.length });
  }
  ranked.sort((a, b) => a.rank - b.rank || a.len - b.len);
  const matches = ranked;

  res.status(200).json({
    total: matches.length,
    truncated: matches.length > MAX_RESULTS,
    results: matches.slice(0, MAX_RESULTS).map((m) => ({ ...publicRow(m.r), rank: m.rank })),
  });
};
