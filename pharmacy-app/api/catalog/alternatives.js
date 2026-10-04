const { loadCatalog, publicRow, isRateLimited, getIp } = require('../_catalog-lib');

module.exports = (req, res) => {
  if (isRateLimited(getIp(req))) {
    res.status(429).json({ error: 'Too many requests — please slow down.' });
    return;
  }

  const generic = String(req.query.generic || '').trim().toLowerCase();
  const exclude = String(req.query.exclude || '');
  if (!generic) {
    res.status(200).json({ results: [] });
    return;
  }

  const { all } = loadCatalog();
  const matches = all.filter(
    (r) => r.generic_name?.toLowerCase().trim() === generic && r.medicine_name !== exclude
  );
  res.status(200).json({ results: matches.slice(0, 20).map(publicRow) });
};
