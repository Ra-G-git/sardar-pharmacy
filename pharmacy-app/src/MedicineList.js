import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { useCart } from "./CartContext";
import { getMedicineEmoji, getUnitLabel, getUnitShort } from "./medicineUtils";

// ─── Alt Brands Modal ────────────────────────────────────────────────────────

function AltBrandsModal({ medicine, alternatives, onClose, addToCart, cart }) {
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
          {alternatives.length === 0 ? (
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
                    background: isOriginal ? "#eff6ff" : "#fff",
                    border: isOriginal ? "1.5px solid #bfdbfe" : "1.5px solid #f1f5f9",
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

function MedicineCard({ med, addToCart, cartItem, onCardClick, altCount }) {
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
    <div style={styles.card} onClick={() => onCardClick(med)}>
      {/* Alt brands badge */}
      {altCount > 0 && (
        <div style={styles.altBadge}>
          {altCount} alt{altCount > 1 ? "s" : ""}
        </div>
      )}

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
  const [medicines, setMedicines] = useState([]);
  const [inventory, setInventory] = useState({});
  const [randomSample, setRandomSample] = useState([]);
  const [search, setSearch] = useState("");
  const [committed, setCommitted] = useState(false);
  const [invLoading, setInvLoading] = useState(true);
  const [altModal, setAltModal] = useState(null);
  const { addToCart, cart } = useCart();

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

  useEffect(() => {
    Papa.parse("/medicines.csv", {
      download: true,
      header: true,
      complete: (result) => {
        const data = result.data.filter((m) => m.medicine_name);
        setMedicines(data);
      },
    });
  }, []);

  const mergedMedicines = useMemo(() => {
    return medicines.map((med) => {
      const inv = inventory[med.slug];
      if (!inv) return med;
      return {
        ...med,
        price: inv.price ?? med.price,
        stock: inv.stock, // kept in data for logic, not displayed on cards
      };
    });
  }, [medicines, inventory]);

  useEffect(() => {
    if (mergedMedicines.length === 0 || invLoading) return;
    const shuffled = [...mergedMedicines].sort(() => Math.random() - 0.5);
    setRandomSample(shuffled.slice(0, 12));
  }, [mergedMedicines, invLoading]);

  const allMatches = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return mergedMedicines.filter((med) =>
      med.medicine_name?.toLowerCase().includes(q) ||
      med.generic_name?.toLowerCase().includes(q) ||
      med.category_name?.toLowerCase().includes(q)
    );
  }, [search, mergedMedicines]);

  useEffect(() => {
    setCommitted(false);
  }, [search]);

  const displayed = useMemo(() => {
    if (!search) return randomSample;
    if (committed) return allMatches;
    return allMatches.slice(0, 12);
  }, [search, committed, allMatches, randomSample]);

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

  function getAlternatives(med) {
    if (!med.generic_name) return [];
    const generic = med.generic_name.toLowerCase().trim();
    return mergedMedicines.filter(
      (m) =>
        m.generic_name?.toLowerCase().trim() === generic &&
        m.medicine_name !== med.medicine_name
    );
  }

  function handleCardClick(med) {
    setAltModal({ medicine: med, alternatives: getAlternatives(med) });
  }

  const searchHint = useMemo(() => {
    if (!search) return null;
    if (committed) return `${allMatches.length} result${allMatches.length !== 1 ? "s" : ""} for "${search}"`;
    if (allMatches.length === 0) return null;
    return `${allMatches.length} result${allMatches.length !== 1 ? "s" : ""} — press Enter to see all`;
  }, [search, committed, allMatches.length]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Our Medicines</h2>
        <p style={styles.subheading}>Browse from 20,000+ genuine medicines</p>
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
          <p style={{ ...styles.resultCount, color: committed ? "#2563eb" : "#94a3b8" }}>
            {searchHint}
          </p>
        )}
      </div>

      {invLoading ? (
        <div style={styles.loadingWrap}>
          <p style={styles.loadingText}>⏳ Loading medicines...</p>
        </div>
      ) : displayed.length === 0 && search ? (
        <div style={styles.noResult}>
          <p style={styles.noResultText}>😕 No medicines found for "{search}"</p>
          <p style={styles.noResultSub}>Try a different name or category</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {displayed.map((med, index) => (
            <MedicineCard
              key={med.slug || index}
              med={med}
              addToCart={addToCart}
              cartItem={getCartItem(med)}
              onCardClick={handleCardClick}
              altCount={getAlternatives(med).length}
            />
          ))}
        </div>
      )}

      {altModal && (
        <AltBrandsModal
          medicine={altModal.medicine}
          alternatives={altModal.alternatives}
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
  container: { padding: "60px 24px" },
  header: { textAlign: "center", marginBottom: "40px" },
  heading: { fontSize: "clamp(26px, 4vw, 36px)", color: "#1e293b", fontWeight: "800", marginBottom: "8px" },
  subheading: { color: "#64748b", fontSize: "15px", marginBottom: "28px" },
  searchWrapper: { position: "relative", maxWidth: "500px", margin: "0 auto", display: "flex", alignItems: "center" },
  searchIcon: { position: "absolute", left: "16px", fontSize: "18px" },
  input: { width: "100%", padding: "14px 48px", fontSize: "15px", borderRadius: "50px", border: "2px solid #e2e8f0", outline: "none", backgroundColor: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" },
  clearBtn: { position: "absolute", right: "16px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "16px" },
  resultCount: { marginTop: "10px", fontSize: "13px", fontWeight: "600", transition: "color 0.2s" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px", maxWidth: "1200px", margin: "0 auto" },
  loadingWrap: { textAlign: "center", padding: "60px 20px" },
  loadingText: { fontSize: "18px", color: "#94a3b8" },
  card: {
    position: "relative",
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    border: "1px solid #f1f5f9",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    cursor: "pointer",
    transition: "box-shadow 0.2s, transform 0.15s",
  },
  altBadge: {
    position: "absolute",
    top: "12px",
    right: "12px",
    backgroundColor: "#2563eb",
    color: "white",
    fontSize: "10px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "20px",
    letterSpacing: "0.3px",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: "52px" },
  categoryBadge: { backgroundColor: "#eff6ff", color: "#2563eb", fontSize: "11px", fontWeight: "600", padding: "4px 10px", borderRadius: "50px", textTransform: "uppercase", letterSpacing: "0.5px" },
  emoji: { fontSize: "28px" },
  name: { fontSize: "16px", fontWeight: "700", color: "#1e293b", marginTop: "4px" },
  generic: { fontSize: "13px", color: "#64748b" },
  details: { display: "flex", flexDirection: "column", gap: "4px", padding: "10px 0", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" },
  detail: { fontSize: "12px", color: "#94a3b8" },
  cardBottom: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "4px" },
  price: { fontSize: "20px", fontWeight: "800", color: "#1e40af", display: "block" },
  unitPrice: { fontSize: "11px", color: "#94a3b8", margin: "2px 0 0 0" },
  addBtn: { backgroundColor: "#2563eb", color: "white", border: "none", padding: "10px 20px", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  qtyControls: { display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#eff6ff", borderRadius: "12px", padding: "4px" },
  qtyBtn: { width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "white", fontSize: "18px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  qtyNum: { fontSize: "16px", fontWeight: "800", color: "#1e40af", minWidth: "24px", textAlign: "center", cursor: "text", borderBottom: "1px dashed #93c5fd", paddingBottom: "1px" },
  qtyInput: { width: "40px", textAlign: "center", fontSize: "15px", fontWeight: "800", color: "#1e40af", border: "none", borderBottom: "2px solid #2563eb", backgroundColor: "transparent", outline: "none", MozAppearance: "textfield" },
  clickHint: { fontSize: "11px", color: "#94a3b8", textAlign: "center", marginTop: "4px" },
  noResult: { textAlign: "center", padding: "60px 20px" },
  noResultText: { fontSize: "20px", color: "#1e293b", fontWeight: "600", marginBottom: "8px" },
  noResultSub: { color: "#94a3b8", fontSize: "14px" },
};

const modalStyles = {
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 4000, display: "flex", justifyContent: "center", alignItems: "center", backdropFilter: "blur(4px)", padding: "20px" },
  box: { backgroundColor: "white", borderRadius: "24px", width: "100%", maxWidth: "520px", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" },
  header: { background: "linear-gradient(135deg, #1e3a8a, #2563eb)", padding: "22px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 },
  headerLabel: { color: "rgba(255,255,255,0.75)", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.8px", margin: "0 0 4px 0" },
  headerTitle: { color: "white", fontSize: "18px", fontWeight: "800", margin: 0 },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: "13px", margin: "4px 0 0 0" },
  closeBtn: { background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: "50%", width: "32px", height: "32px", fontSize: "16px", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  list: { overflowY: "auto", flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "10px" },
  empty: { textAlign: "center", padding: "40px 20px" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "14px", padding: "14px", gap: "12px" },
  rowLeft: { display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 },
  rowEmoji: { fontSize: "28px", flexShrink: 0 },
  rowName: { fontWeight: "700", fontSize: "14px", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" },
  originalBadge: { backgroundColor: "#2563eb", color: "white", fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "20px" },
  rowMeta: { fontSize: "12px", color: "#94a3b8", marginTop: "2px" },
  rowRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 },
  rowPrice: { fontWeight: "800", fontSize: "16px", color: "#1e40af" },
  addBtn: { backgroundColor: "#2563eb", color: "white", border: "none", padding: "7px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap" },
  qtyRow: { display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#eff6ff", borderRadius: "10px", padding: "3px" },
  qtyBtn: { width: "28px", height: "28px", borderRadius: "7px", border: "none", backgroundColor: "#2563eb", color: "white", fontSize: "16px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  qtyNum: { fontSize: "14px", fontWeight: "800", color: "#1e40af", minWidth: "20px", textAlign: "center" },
};

export default MedicineList;