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
  const matches = all.filter((r) =>
    r.medicine_name?.toLowerCase().includes(q) ||
    r.generic_name?.toLowerCase().includes(q) ||
    r.category_name?.toLowerCase().includes(q)
  );

  res.status(200).json({
    total: matches.length,
    truncated: matches.length > MAX_RESULTS,
    results: matches.slice(0, MAX_RESULTS).map(publicRow),
  });
};
