const { loadCatalog, sampleN, publicRow, isRateLimited, getIp } = require('../_catalog-lib');

// One call for the whole storefront landing view: the category tabs plus a
// small random row for each of the biggest categories. Random on purpose —
// there is no popularity data, so nothing here claims "best seller".
module.exports = (req, res) => {
  if (isRateLimited(getIp(req))) {
    res.status(429).json({ error: 'Too many requests — please slow down.' });
    return;
  }

  const { cats } = loadCatalog();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    categories: cats.slice(0, 12).map((c) => ({ name: c.name, count: c.count })),
    rows: cats.slice(0, 4).map((c) => ({
      category: c.name,
      count: c.count,
      results: sampleN(c.rows, 10).map(publicRow),
    })),
  });
};
