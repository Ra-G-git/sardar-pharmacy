const { getCategory, sampleN, publicRow, isRateLimited, getIp } = require('../_catalog-lib');

// A random selection from one category. Deliberately NOT paginated: an
// ordered, pageable listing is exactly what a scraper wants. People looking
// for a specific medicine use search; this is for browsing.
module.exports = (req, res) => {
  if (isRateLimited(getIp(req))) {
    res.status(429).json({ error: 'Too many requests — please slow down.' });
    return;
  }

  const cat = getCategory(req.query.category);
  if (!cat) {
    res.status(404).json({ error: 'Unknown category.' });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    category: cat.name,
    count: cat.count,
    results: sampleN(cat.rows, 24).map(publicRow),
  });
};
