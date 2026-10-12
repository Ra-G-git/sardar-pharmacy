import Reveal from "./Reveal";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { useCart } from "./CartContext";
import { fetchCatalog, pushRecent } from "./catalogApi";
import { MedicineCard, AltBrandsModal } from "./MedicineCard";
import Discover from "./Discover";

// Catalog data comes from rate-limited Vercel functions (api/catalog/*.js),
// not a downloadable medicines.csv and not Render — see catalogApi.js.
const PREVIEW_LIMIT = 12;

function MedicineList() {
  const [inventory, setInventory] = useState({});
  const [search, setSearch] = useState("");
  const [committed, setCommitted] = useState(false);
  const [invLoading, setInvLoading] = useState(true);
  const [searchResults, setSearchResults] = useState({ results: [], total: 0, truncated: false });
  const [searchLoading, setSearchLoading] = useState(false);
  const [altModal, setAltModal] = useState(null);
  const [altAlternatives, setAltAlternatives] = useState([]);
  const { addToCart, cart } = useCart();
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const snap = await getDocs(collection(db, "inventory"));
        const map = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          map[d.id] = { price: data.price, stock: data.stock ?? null };
        });
        setInventory(map);
      } catch (err) {
        console.error("Failed to load inventory:", err);
      }
      setInvLoading(false);
    }
    fetchInventory();
  }, []);

  const applyInventory = useCallback(
    (med) => {
      const inv = inventory[med.slug];
      if (!inv) return med;
      return { ...med, price: inv.price ?? med.price, stock: inv.stock };
    },
    [inventory]
  );

  // Applies Firestore prices and orders a list: best name match first (the
  // server's rank, when present), then medicines with real Firestore data
  // (the tracked ones) before catalog-only entries. Used by search results
  // and by every row on the landing view.
  const decorate = useCallback(
    (list) =>
      list.map(applyInventory).sort((a, b) => {
        const rankDiff = (a.rank ?? 0) - (b.rank ?? 0);
        if (rankDiff !== 0) return rankDiff;
        return (inventory[b.slug] ? 1 : 0) - (inventory[a.slug] ? 1 : 0);
      }),
    [applyInventory, inventory]
  );

  // Debounced server-side search as the user types (preview mode), and an
  // immediate full search on Enter (committed mode).
  useEffect(() => {
    setCommitted(false);
    clearTimeout(debounceRef.current);
    if (!search || search.trim().length < 2) {
      requestIdRef.current++; // invalidate any in-flight request
      setSearchResults({ results: [], total: 0, truncated: false });
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      // Ignore responses that arrive out of order: if an older, broader
      // query ("dex") resolves after a newer one ("dextac"), it must not
      // overwrite the newer results.
      const myId = ++requestIdRef.current;
      try {
        const data = await fetchCatalog("search", { q: search.trim() });
        if (myId !== requestIdRef.current) return;
        setSearchResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      }
      if (myId === requestIdRef.current) setSearchLoading(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const showDiscover = search.trim().length < 2;

  const displayed = useMemo(() => {
    const source = searchResults.results;
    return decorate(committed ? source : source.slice(0, PREVIEW_LIMIT));
  }, [committed, searchResults, decorate]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && search) setCommitted(true);
  }

  function handleClear() {
    setSearch("");
    setCommitted(false);
  }

  const getCartItem = useCallback(
    (med) => cart.find((item) => item.slug === med.slug) || null,
    [cart]
  );

  // Remember what the visitor adds so "Suggested for you" can personalise.
  const trackedAdd = useCallback(
    (item) => {
      if (!item.decrement && !item.setQuantity) pushRecent(item);
      addToCart(item);
    },
    [addToCart]
  );

  const handleCardClick = useCallback(
    async (med) => {
      pushRecent(med);
      setAltModal({ medicine: med, loading: true });
      setAltAlternatives([]);
      if (!med.generic_name) {
        setAltModal({ medicine: med, loading: false });
        return;
      }
      try {
        const data = await fetchCatalog("alternatives", {
          generic: med.generic_name,
          exclude: med.medicine_name,
        });
        setAltAlternatives((data.results || []).map(applyInventory));
      } catch (err) {
        console.error("Failed to load alternatives:", err);
      }
      setAltModal({ medicine: med, loading: false });
    },
    [applyInventory]
  );

  const searchHint = useMemo(() => {
    if (!search || search.trim().length < 2) return null;
    if (searchLoading) return "Searching…";
    const { total, truncated, results } = searchResults;
    if (total === 0) return null;
    const label = `${total} result${total !== 1 ? "s" : ""}`;
    if (committed) {
      return truncated ? `${label} for "${search}" (showing first ${results.length})` : `${label} for "${search}"`;
    }
    // Only offer "press Enter" when Enter would actually reveal more.
    if (total > PREVIEW_LIMIT) return `${label} — press Enter to see all`;
    return `${label} for "${search}"`;
  }, [search, committed, searchResults, searchLoading]);

  return (
    <div style={styles.container}>
      <div style={styles.header} className="medlist-header">
        <div style={styles.headerText}>
          <h2 style={styles.heading}>Our medicines</h2>
          <p style={styles.subheading}>Browse by category or search the catalogue</p>
        </div>
        <div>
          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search by name, generic or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              style={styles.input}
            />
            {search && (
              <button style={styles.clearBtn} onClick={handleClear}>✕</button>
            )}
          </div>
          {searchHint && (
            <p style={{ ...styles.resultCount, color: committed ? "#24512F" : "#94a3b8" }}>
              {searchHint}
            </p>
          )}
        </div>
      </div>

      {invLoading ? (
        <div style={styles.loadingWrap}>
          <p style={styles.loadingText}>⏳ Loading medicines...</p>
        </div>
      ) : showDiscover ? (
        <Discover
          decorate={decorate}
          onCardClick={handleCardClick}
          addToCart={trackedAdd}
          getCartItem={getCartItem}
        />
      ) : displayed.length === 0 && !searchLoading ? (
        <div style={styles.noResult}>
          <p style={styles.noResultText}>😕 No medicines found for "{search}"</p>
          <p style={styles.noResultSub}>Try a different name or category</p>
        </div>
      ) : (
        <div style={styles.grid} className="medicine-grid">
          {displayed.map((med, index) => (
            <Reveal key={med.slug || index} delay={(index % 4) * 70} style={{ height: "100%" }}>
              <MedicineCard
                med={med}
                addToCart={trackedAdd}
                cartItem={getCartItem(med)}
                onCardClick={handleCardClick}
              />
            </Reveal>
          ))}
        </div>
      )}

      {altModal && (
        <AltBrandsModal
          medicine={altModal.medicine}
          alternatives={altAlternatives}
          loading={altModal.loading}
          onClose={() => setAltModal(null)}
          addToCart={trackedAdd}
          cart={cart}
        />
      )}
    </div>
  );
}

const styles = {
  container: { padding: "72px 24px", backgroundColor: "#FFFFFF" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "24px", marginBottom: "36px", maxWidth: "1200px", margin: "0 auto 36px" },
  headerText: { flexShrink: 0 },
  heading: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(26px, 4vw, 34px)", color: "#16241A", fontWeight: "700", marginBottom: "6px", letterSpacing: "-0.5px" },
  subheading: { color: "#5B6B60", fontSize: "15px" },
  searchWrapper: { position: "relative", width: "380px", maxWidth: "100%", display: "flex", alignItems: "center" },
  searchIcon: { position: "absolute", left: "16px", fontSize: "16px", opacity: 0.6 },
  input: { width: "100%", padding: "13px 44px", fontSize: "14px", borderRadius: "12px", border: "1.5px solid #E4ECE0", outline: "none", backgroundColor: "#FAF7F1", transition: "border-color 0.15s" },
  clearBtn: { position: "absolute", right: "14px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "16px" },
  resultCount: { marginTop: "10px", fontSize: "13px", fontWeight: "600", transition: "color 0.2s", textAlign: "right" },
  // Fixed column count (set via the .medicine-grid class in App.css) so every
  // row starts flush left regardless of how many items are in it.
  grid: { maxWidth: "1200px", margin: "0 auto" },
  loadingWrap: { textAlign: "center", padding: "60px 20px" },
  loadingText: { fontSize: "18px", color: "#94a3b8" },
  noResult: { textAlign: "center", padding: "60px 20px" },
  noResultText: { fontSize: "20px", color: "#16241A", fontWeight: "600", marginBottom: "8px" },
  noResultSub: { color: "#94a3b8", fontSize: "14px" },
};

export default MedicineList;
