import Reveal from "./Reveal";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { useCart } from "./CartContext";
import { getMedicineEmoji, getUnitLabel, getUnitShort } from "./medicineUtils";

// The catalog now lives behind a rate-limited search instead of a
// downloadable medicines.csv. This deliberately does NOT go through Render
// (that's only for Firestore-backed routes like orders/auth, and its free
// tier sleeps after 15min idle — fine for POS staff, not for customers).
// It hits Vercel's own serverless functions at api/catalog/*.js instead —
// same origin, no cold-start wait, no Firebase dependency.
async function fetchCatalog(path, params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/catalog/${path}${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Catalog request failed: ${res.status}`);
  return res.json();
}

// ─── Alt Brands Modal ────────────────────────────────────────────────────────

function AltBrandsModal({ medicine, alternatives, loading, onClose, addToCart, cart }) {
  const allOptions = [medicine, ...alternatives];

  function getCartQty(slug) {
    const item = cart.find((i) => i.slug === slug);
    return item ? item.quantity : 0;
  }

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.box} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={modalStyles.header}>
          <div>
            <p style={modalStyles.headerLabel}>Alternative Brands</p>
            <h2 style={modalStyles.headerTitle}>{medicine.generic_name || medicine.medicine_name}</h2>
            {medicine.strength && (
              <p style={modalStyles.headerSub}>{medicine.strength}</p>
            )}
          </div>
          <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
        </div>

        {/* List */}
        <div style={modalStyles.list}>
          {loading ? (
            <div style={modalStyles.empty}>
              <p style={{ fontSize: "32px", marginBottom: "8px" }}>⏳</p>
              <p style={{ color: "#5B6B60", fontSize: "14px" }}>Looking for alternative brands…</p>
            </div>
          ) : alternatives.length === 0 ? (
            <div style={modalStyles.empty}>
              <p style={{ fontSize: "32px", marginBottom: "8px" }}>🔍</p>
              <p style={{ color: "#64748b", fontSize: "14px" }}>No alternative brands found for this generic.</p>
            </div>
          ) : (
            allOptions.map((med, i) => {
              const qty = getCartQty(med.slug);
              const isOriginal = i === 0;
              return (
                <div
                  key={med.slug}
                  style={{
                    ...modalStyles.row,
                    background: isOriginal ? "#F1F6EF" : "#fff",
                    border: isOriginal ? "1.5px solid #C7D9C4" : "1.5px solid #f1f5f9",
                  }}
                >
                  <div style={modalStyles.rowLeft}>
                    <span style={modalStyles.rowEmoji}>{getMedicineEmoji(med.category_name)}</span>
                    <div>
                      <div style={modalStyles.rowName}>
                        {med.medicine_name}
                        {isOriginal && (
                          <span style={modalStyles.originalBadge}>Selected</span>
                        )}
                      </div>
                      <div style={modalStyles.rowMeta}>{med.manufacturer_name}</div>
                      {med.unit_size && (
                        <div style={modalStyles.rowMeta}>{getUnitLabel(med)}</div>
                      )}
                    </div>
                  </div>
                  <div style={modalStyles.rowRight}>
                    <div style={modalStyles.rowPrice}>৳{parseFloat(med.price || 0).toFixed(2)}</div>
                    {qty === 0 ? (
                      <button
                        style={modalStyles.addBtn}
                        onClick={() => addToCart({ ...med, quantity: 1 })}
                      >
                        + Add
                      </button>
                    ) : (
                      <div style={modalStyles.qtyRow}>
                        <button
                          style={modalStyles.qtyBtn}
                          onClick={() => addToCart({ ...med, quantity: -1, decrement: true })}
                        >−</button>
                        <span style={modalStyles.qtyNum}>{qty}</span>
                        <button
                          style={modalStyles.qtyBtn}
                          onClick={() => addToCart(med)}
                        >+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Medicine Card ────────────────────────────────────────────────────────────

function MedicineCard({ med, addToCart, cartItem, onCardClick }) {
  const qty = cartItem ? cartItem.quantity : 0;
  const added = qty > 0;
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");

  function handleAdd(e) {
    e.stopPropagation();
    addToCart({ ...med, quantity: 1 });
  }

  function handleIncrement(e) {
    e.stopPropagation();
    addToCart(med);
  }

  function handleDecrement(e) {
    e.stopPropagation();
    addToCart({ ...med, quantity: -1, decrement: true });
  }

  function handleQtyClick(e) {
    e.stopPropagation();
    setInputVal(String(qty));
    setEditing(true);
  }

  function handleQtyBlur(e) {
    commitEdit(e.target.value);
  }

  function handleQtyKeyDown(e) {
    if (e.key === "Enter") e.target.blur();
    if (e.key === "Escape") setEditing(false);
  }

  function commitEdit(val) {
    const parsed = parseInt(val ?? inputVal, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed !== qty) {
      addToCart({ ...med, setQuantity: true, quantity: parsed });
    }
    setEditing(false);
  }

  return (
    <div style={styles.card} className="medicine-card" onClick={() => onCardClick(med)}>
      <div style={styles.cardTop}>
        <span style={styles.categoryBadge}>{med.category_name}</span>
        <span style={styles.emoji}>{getMedicineEmoji(med.category_name)}</span>
      </div>

      <h3 style={styles.name}>{med.medicine_name}</h3>
      <p style={styles.generic}>{med.generic_name}</p>

      <div style={styles.details}>
        {med.strength && <span style={styles.detail}>💪 {med.strength}</span>}
        <span style={styles.detail}>🏭 {med.manufacturer_name}</span>
        <span style={styles.detail}>📦 {getUnitLabel(med)}</span>
        {/* Stock is intentionally NOT shown to public customers */}
      </div>

      <div style={styles.cardBottom}>
        <div>
          <span style={styles.price}>৳{(parseFloat(med.price) * (qty || 1)).toFixed(2)}</span>
          <p style={styles.unitPrice}>৳{med.price} / {getUnitShort(med)}</p>
        </div>

        {!added ? (
          <button style={styles.addBtn} onClick={handleAdd}>
            + Add
          </button>
        ) : (
          <div style={styles.qtyControls} onClick={(e) => e.stopPropagation()}>
            <button style={styles.qtyBtn} onClick={handleDecrement}>−</button>
            {editing ? (
              <input
                autoFocus
                type="number"
                min="0"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onBlur={handleQtyBlur}
                onKeyDown={handleQtyKeyDown}
                style={styles.qtyInput}
              />
            ) : (
              <span
                style={styles.qtyNum}
                onClick={handleQtyClick}
                title="Click to edit quantity"
              >
                {qty}
              </span>
            )}
            <button style={styles.qtyBtn} onClick={handleIncrement}>+</button>
          </div>
        )}
      </div>

      <div style={styles.clickHint}>🔍 Tap to see alternative brands</div>
    </div>
  );
}

// ─── Main MedicineList ────────────────────────────────────────────────────────

function MedicineList() {
  const [inventory, setInventory] = useState({});
  const [randomSample, setRandomSample] = useState([]);
  const [search, setSearch] = useState("");
  const [committed, setCommitted] = useState(false);
  const [invLoading, setInvLoading] = useState(true);
  const [sampleLoading, setSampleLoading] = useState(true);
  const [searchResults, setSearchResults] = useState({ results: [], total: 0, truncated: false });
  const [searchLoading, setSearchLoading] = useState(false);
  const [altModal, setAltModal] = useState(null);
  const { addToCart, cart } = useCart();
  const debounceRef = useRef(null);

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

  // Initial, unsearched view: a small random sample from the backend
  // instead of the full catalog downloaded client-side.
  useEffect(() => {
    async function fetchSample() {
      try {
        const data = await fetchCatalog("sample");
        setRandomSample(data.results || []);
      } catch (err) {
        console.error("Failed to load sample:", err);
      }
      setSampleLoading(false);
    }
    fetchSample();
  }, []);

  function applyInventory(med) {
    const inv = inventory[med.slug];
    if (!inv) return med;
    return { ...med, price: inv.price ?? med.price, stock: inv.stock };
  }

  // Debounced server-side search as the user types (preview mode), and an
  // immediate full search on Enter (committed mode) — mirrors the old
  // client-side behavior but now goes through the rate-limited endpoint.
  useEffect(() => {
    setCommitted(false);
    clearTimeout(debounceRef.current);
    if (!search || search.trim().length < 2) {
      setSearchResults({ results: [], total: 0, truncated: false });
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await fetchCatalog("search", { q: search.trim() });
        setSearchResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const displayed = useMemo(() => {
    const source = !search ? randomSample : searchResults.results;
    const sliced = !search || committed ? source : source.slice(0, 12);
    return sliced.map(applyInventory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, committed, randomSample, searchResults, inventory]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && search) setCommitted(true);
  }

  function handleClear() {
    setSearch("");
    setCommitted(false);
  }

  function getCartItem(med) {
    return cart.find((item) => item.slug === med.slug) || null;
  }

  const [altAlternatives, setAltAlternatives] = useState([]);

  const handleCardClick = useCallback(async (med) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory]);

  const searchHint = useMemo(() => {
    if (!search || search.trim().length < 2) return null;
    if (searchLoading) return "Searching…";
    if (committed) return `${searchResults.total} result${searchResults.total !== 1 ? "s" : ""} for "${search}"${searchResults.truncated ? ` (showing first ${searchResults.results.length})` : ""}`;
    if (searchResults.total === 0) return null;
    return `${searchResults.total} result${searchResults.total !== 1 ? "s" : ""} — press Enter to see all`;
  }, [search, committed, searchResults, searchLoading]);

  return (
    <div style={styles.container}>
      <div style={styles.header} className="medlist-header">
        <div style={styles.headerText}>
          <h2 style={styles.heading}>Our medicines</h2>
          <p style={styles.subheading}>Browse from 20,000+ genuine medicines</p>
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

      {invLoading || (sampleLoading && !search) ? (
        <div style={styles.loadingWrap}>
          <p style={styles.loadingText}>⏳ Loading medicines...</p>
        </div>
      ) : displayed.length === 0 && search && search.trim().length >= 2 && !searchLoading ? (
        <div style={styles.noResult}>
          <p style={styles.noResultText}>😕 No medicines found for "{search}"</p>
          <p style={styles.noResultSub}>Try a different name or category</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {displayed.map((med, index) => (
            <Reveal key={med.slug || index} delay={(index % 4) * 70} style={{ height: "100%" }}>
              <MedicineCard
                med={med}
                addToCart={addToCart}
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
          addToCart={addToCart}
          cart={cart}
        />
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px", maxWidth: "1200px", margin: "0 auto" },
  loadingWrap: { textAlign: "center", padding: "60px 20px" },
  loadingText: { fontSize: "18px", color: "#94a3b8" },
  card: {
    position: "relative",
    backgroundColor: "#FFFFFF",
    borderRadius: "14px",
    padding: "20px",
    border: "1px solid #EFEDE5",
    borderTop: "3px solid #24512F",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    cursor: "pointer",
    height: "100%",
    transition: "box-shadow 0.2s ease, transform 0.15s ease",
  },
  altBadge: {
    position: "absolute",
    top: "12px",
    right: "12px",
    backgroundColor: "#E8A33D",
    color: "#16241A",
    fontSize: "10px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "20px",
    letterSpacing: "0.3px",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  categoryBadge: { backgroundColor: "#E4ECE0", color: "#24512F", fontSize: "11px", fontWeight: "600", padding: "4px 10px", borderRadius: "6px", letterSpacing: "0.2px" },
  emoji: { fontSize: "28px" },
  name: { fontSize: "16px", fontWeight: "700", color: "#16241A", marginTop: "4px" },
  generic: { fontSize: "13px", color: "#5B6B60" },
  details: { display: "flex", flexDirection: "column", gap: "4px", padding: "10px 0", borderTop: "1px solid #F5F3EC", borderBottom: "1px solid #F5F3EC" },
  detail: { fontSize: "12px", color: "#94a3b8" },
  cardBottom: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "4px" },
  price: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "20px", fontWeight: "700", color: "#16241A", display: "block" },
  unitPrice: { fontSize: "11px", color: "#94a3b8", margin: "2px 0 0 0" },
  addBtn: { backgroundColor: "#24512F", color: "white", border: "none", padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  qtyControls: { display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#E4ECE0", borderRadius: "10px", padding: "4px" },
  qtyBtn: { width: "32px", height: "32px", borderRadius: "7px", border: "none", backgroundColor: "#24512F", color: "white", fontSize: "18px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  qtyNum: { fontSize: "16px", fontWeight: "700", color: "#16241A", minWidth: "24px", textAlign: "center", cursor: "text", borderBottom: "1px dashed #9BB59B", paddingBottom: "1px" },
  qtyInput: { width: "40px", textAlign: "center", fontSize: "15px", fontWeight: "700", color: "#16241A", border: "none", borderBottom: "2px solid #24512F", backgroundColor: "transparent", outline: "none", MozAppearance: "textfield" },
  clickHint: { fontSize: "11px", color: "#94a3b8", textAlign: "center", marginTop: "4px" },
  noResult: { textAlign: "center", padding: "60px 20px" },
  noResultText: { fontSize: "20px", color: "#16241A", fontWeight: "600", marginBottom: "8px" },
  noResultSub: { color: "#94a3b8", fontSize: "14px" },
};

const modalStyles = {
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(20,29,22,0.55)", zIndex: 4000, display: "flex", justifyContent: "center", alignItems: "center", backdropFilter: "blur(4px)", padding: "20px" },
  box: { backgroundColor: "white", borderRadius: "20px", width: "100%", maxWidth: "520px", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" },
  header: { background: "linear-gradient(135deg, #14291A, #24512F)", padding: "22px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 },
  headerLabel: { color: "rgba(255,255,255,0.7)", fontSize: "12px", fontWeight: "600", letterSpacing: "0.4px", margin: "0 0 4px 0" },
  headerTitle: { fontFamily: "'Space Grotesk', sans-serif", color: "white", fontSize: "18px", fontWeight: "700", margin: 0 },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: "13px", margin: "4px 0 0 0" },
  closeBtn: { background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: "50%", width: "32px", height: "32px", fontSize: "16px", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  list: { overflowY: "auto", flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "10px" },
  empty: { textAlign: "center", padding: "40px 20px" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "12px", padding: "14px", gap: "12px" },
  rowLeft: { display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 },
  rowEmoji: { fontSize: "28px", flexShrink: 0 },
  rowName: { fontWeight: "700", fontSize: "14px", color: "#16241A", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" },
  originalBadge: { backgroundColor: "#E8A33D", color: "#16241A", fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "20px" },
  rowMeta: { fontSize: "12px", color: "#94a3b8", marginTop: "2px" },
  rowRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 },
  rowPrice: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: "700", fontSize: "16px", color: "#16241A" },
  addBtn: { backgroundColor: "#24512F", color: "white", border: "none", padding: "7px 14px", borderRadius: "9px", fontSize: "13px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap" },
  qtyRow: { display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#E4ECE0", borderRadius: "9px", padding: "3px" },
  qtyBtn: { width: "28px", height: "28px", borderRadius: "6px", border: "none", backgroundColor: "#24512F", color: "white", fontSize: "16px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  qtyNum: { fontSize: "14px", fontWeight: "700", color: "#16241A", minWidth: "20px", textAlign: "center" },
};

export default MedicineList;