// Shared helpers for talking to the storefront catalog API (Vercel
// functions at /api/catalog/*, not Render) and for remembering, in this
// browser only, which medicines the visitor last looked at or added.

export async function fetchCatalog(path, params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/catalog/${path}${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Catalog request failed: ${res.status}`);
  return res.json();
}

const RECENT_KEY = "sp_recent_v1";

export function getRecents() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

// Stored compactly: s = slug, g = generic, c = category, n = name.
export function pushRecent(med) {
  if (!med || !med.slug) return;
  try {
    const next = [
      { s: med.slug, g: med.generic_name || "", c: med.concern || med.category_name || "", n: med.medicine_name || "" },
      ...getRecents().filter((r) => r.s !== med.slug),
    ].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch (e) {
    // Storage can be blocked (private mode); suggestions just won't personalise.
  }
}
