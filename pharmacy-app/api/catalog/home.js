const { loadCatalog, sampleN, publicRow, isRateLimited, getIp } = require('../_catalog-lib');

// One call for the whole storefront landing view: the health-need shelves
// (skin care, diabetes ...) plus a small random row for a few of them.
// Random on purpose — there is no popularity data, so nothing here claims
// "best seller".
const ROW_IDS = ['skin', 'vitamins', 'diabetes', 'pain', 'cold'];

module.exports = (req, res) => {
  if (isRateLimited(getIp(req))) {
    res.status(429).json({ error: 'Too many requests — please slow down.' });
    return;
  }

  const { cats } = loadCatalog();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    categories: cats.map((c) => ({ id: c.id, name: c.name, icon: c.icon, tone: c.tone, count: c.count })),
    rows: ROW_IDS.map((id) => cats.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => ({
        id: c.id,
        category: c.name,
        count: c.count,
        results: sampleN(c.rows, 10).map(publicRow),
      })),
  });
};
