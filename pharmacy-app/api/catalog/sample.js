const { loadCatalog, publicRow, isRateLimited, getIp } = require('../_catalog-lib');

module.exports = (req, res) => {
  if (isRateLimited(getIp(req))) {
    res.status(429).json({ error: 'Too many requests — please slow down.' });
    return;
  }

  const { all } = loadCatalog();
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  res.status(200).json({ results: shuffled.slice(0, 12).map(publicRow) });
};
