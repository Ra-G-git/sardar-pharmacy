import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { useCart } from "./CartContext";
import { getMedicineEmoji, getUnitLabel, getUnitShort } from "./medicineUtils";

function MedicineCard({ med, addToCart, cartItem }) {
  const qty = cartItem ? cartItem.quantity : 0;
  const added = qty > 0;
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");

  function handleAdd() {
    addToCart({ ...med, quantity: 1 });
  }

  function handleIncrement() {
    addToCart(med);
  }

  function handleDecrement() {
    addToCart({ ...med, quantity: -1, decrement: true });
  }

  function handleQtyClick() {
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

  const outOfStock = med.stock !== undefined && med.stock !== null && med.stock <= 0;

  return (
    <div style={{ ...styles.card, opacity: outOfStock ? 0.6 : 1 }}>
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
        {med.stock !== undefined && med.stock !== null && (
          <span style={{ ...styles.detail, color: med.stock <= 10 ? "#ea580c" : "#16a34a", fontWeight: "600" }}>
            {med.stock <= 0 ? "❌ Out of Stock" : med.stock <= 10 ? `⚠️ Only ${med.stock} left` : `✅ In Stock (${med.stock})`}
          </span>
        )}
      </div>

      <div style={styles.cardBottom}>
        <div>
          <span style={styles.price}>৳{(parseFloat(med.price) * (qty || 1)).toFixed(2)}</span>
          <p style={styles.unitPrice}>৳{med.price} / {getUnitShort(med)}</p>
        </div>

        {!added ? (
          <button
            style={{ ...styles.addBtn, opacity: outOfStock ? 0.5 : 1, cursor: outOfStock ? "not-allowed" : "pointer" }}
            onClick={outOfStock ? undefined : handleAdd}
            disabled={outOfStock}
          >
            {outOfStock ? "Out of Stock" : "+ Add"}
          </button>
        ) : (
          <div style={styles.qtyControls}>
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
    </div>
  );
}

function MedicineList() {
  const [medicines, setMedicines] = useState([]);
  const [inventory, setInventory] = useState({});   // slug → { price, stock }
  const [randomSample, setRandomSample] = useState([]);
  const [search, setSearch] = useState("");
  const [committed, setCommitted] = useState(false);
  const [invLoading, setInvLoading] = useState(true);
  const { addToCart, cart } = useCart();

  // Fetch inventory overrides from Firestore once
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

  // Load CSV
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

  // Merge CSV medicines with inventory overrides
  const mergedMedicines = useMemo(() => {
    return medicines.map((med) => {
      const inv = inventory[med.slug];
      if (!inv) return med;
      return {
        ...med,
        price: inv.price ?? med.price,
        stock: inv.stock,
      };
    });
  }, [medicines, inventory]);

  // Pick 12 random once medicines and inventory are both ready
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "60px 24px",
  },
  header: {
    textAlign: "center",
    marginBottom: "40px",
  },
  heading: {
    fontSize: "clamp(26px, 4vw, 36px)",
    color: "#1e293b",
    fontWeight: "800",
    marginBottom: "8px",
  },
  subheading: {
    color: "#64748b",
    fontSize: "15px",
    marginBottom: "28px",
  },
  searchWrapper: {
    position: "relative",
    maxWidth: "500px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "16px",
    fontSize: "18px",
  },
  input: {
    width: "100%",
    padding: "14px 48px",
    fontSize: "15px",
    borderRadius: "50px",
    border: "2px solid #e2e8f0",
    outline: "none",
    backgroundColor: "white",
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
  },
  clearBtn: {
    position: "absolute",
    right: "16px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
    fontSize: "16px",
  },
  resultCount: {
    marginTop: "10px",
    fontSize: "13px",
    fontWeight: "600",
    transition: "color 0.2s",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  loadingWrap: {
    textAlign: "center",
    padding: "60px 20px",
  },
  loadingText: {
    fontSize: "18px",
    color: "#94a3b8",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    border: "1px solid #f1f5f9",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    transition: "opacity 0.2s",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "600",
    padding: "4px 10px",
    borderRadius: "50px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  emoji: {
    fontSize: "28px",
  },
  name: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1e293b",
    marginTop: "4px",
  },
  generic: {
    fontSize: "13px",
    color: "#64748b",
  },
  details: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "10px 0",
    borderTop: "1px solid #f1f5f9",
    borderBottom: "1px solid #f1f5f9",
  },
  detail: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  cardBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "8px",
    paddingTop: "4px",
  },
  price: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#1e40af",
    display: "block",
  },
  unitPrice: {
    fontSize: "11px",
    color: "#94a3b8",
    margin: "2px 0 0 0",
  },
  addBtn: {
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  qtyControls: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#eff6ff",
    borderRadius: "12px",
    padding: "4px",
  },
  qtyBtn: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "white",
    fontSize: "18px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyNum: {
    fontSize: "16px",
    fontWeight: "800",
    color: "#1e40af",
    minWidth: "24px",
    textAlign: "center",
    cursor: "text",
    borderBottom: "1px dashed #93c5fd",
    paddingBottom: "1px",
  },
  qtyInput: {
    width: "40px",
    textAlign: "center",
    fontSize: "15px",
    fontWeight: "800",
    color: "#1e40af",
    border: "none",
    borderBottom: "2px solid #2563eb",
    backgroundColor: "transparent",
    outline: "none",
    MozAppearance: "textfield",
  },
  noResult: {
    textAlign: "center",
    padding: "60px 20px",
  },
  noResultText: {
    fontSize: "20px",
    color: "#1e293b",
    fontWeight: "600",
    marginBottom: "8px",
  },
  noResultSub: {
    color: "#94a3b8",
    fontSize: "14px",
  },
};

export default MedicineList;