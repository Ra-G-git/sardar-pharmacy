const { loadCatalog, getCategory, sampleN, publicRow, isRateLimited, getIp } = require('../_catalog-lib');

// "Suggested for you": the browser sends the few medicines it last opened or
// added (as compact seeds), and we return other brands of the same generic
// first, then more from the same categories. Nothing is stored server-side.
module.exports = (req, res) => {
  if (isRateLimited(getIp(req))) {
    res.status(429).json({ error: 'Too many requests — please slow down.' });
    return;
  }

  let seeds = [];
  const raw = String(req.query.seeds || '');
  if (raw.length > 0 && raw.length <= 2000) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        seeds = parsed.slice(0, 5).filter((s) => s && typeof s === 'object');
      }
    } catch (e) {
      seeds = [];
    }
  }
  if (seeds.length === 0) {
    res.status(200).json({ results: [] });
    return;
  }

  const exclude = new Set(seeds.map((s) => String(s.s || '')));
  const generics = new Set(
    seeds.map((s) => String(s.g || '').trim().toLowerCase()).filter(Boolean)
  );
  const catNames = [...new Set(seeds.map((s) => String(s.c || '').trim().toLowerCase()).filter(Boolean))];

  const { all } = loadCatalog();
  const sameGeneric = generics.size
    ? all.filter(
        (r) => !exclude.has(r.slug) && generics.has((r.generic_name || '').trim().toLowerCase())
      )
    : [];
  const first = sampleN(sameGeneric, 6);
  const taken = new Set([...exclude, ...first.map((r) => r.slug)]);

  const sameCategory = [];
  for (const name of catNames) {
    const cat = getCategory(name);
    if (cat) sameCategory.push(...cat.rows.filter((r) => !taken.has(r.slug)));
  }
  const rest = sampleN(sameCategory, 12 - first.length);

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ results: [...first, ...rest].map(publicRow) });
};
