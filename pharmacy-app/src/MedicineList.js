import { useState, useEffect } from "react";
import Papa from "papaparse";
import { useCart } from "./CartContext";
import { getMedicineEmoji, getUnitLabel, getUnitShort } from "./medicineUtils";

function MedicineCard({ med, addToCart }) {
  const [qty, setQty] = useState(0);
  const [added, setAdded] = useState(false);


  function handleAdd() {
    setQty(1);
    addToCart({ ...med, quantity: 1 });
    setAdded(true);
  }

  function handleIncrement() {
    const newQty = qty + 1;
    setQty(newQty);
    addToCart(med);
  }

  function handleDecrement() {
    if (qty <= 1) {
      setQty(0);
      setAdded(false);
    } else {
      setQty(qty - 1);
    }
  }

  return (
    <div style={styles.card}>
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
          <div style={styles.qtyControls}>
            <button style={styles.qtyBtn} onClick={handleDecrement}>−</button>
            <span style={styles.qtyNum}>{qty}</span>
            <button style={styles.qtyBtn} onClick={handleIncrement}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MedicineList() {
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    Papa.parse("/medicines.csv", {
      download: true,
      header: true,
      complete: (result) => {
        setMedicines(result.data);
        setFiltered(result.data.slice(0, 12));
      },
    });
  }, []);

  useEffect(() => {
    if (search === "") {
      setFiltered(medicines.slice(0, 12));
    } else {
      const results = medicines.filter((med) =>
        med.medicine_name?.toLowerCase().includes(search.toLowerCase()) ||
        med.generic_name?.toLowerCase().includes(search.toLowerCase()) ||
        med.category_name?.toLowerCase().includes(search.toLowerCase())
      );
      setFiltered(results.slice(0, 12));
    }
  }, [search, medicines]);

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
            style={styles.input}
          />
          {search && (
            <button style={styles.clearBtn} onClick={() => setSearch("")}>✕</button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={styles.noResult}>
          <p style={styles.noResultText}>😕 No medicines found for "{search}"</p>
          <p style={styles.noResultSub}>Try a different name or category</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((med, index) => (
            <MedicineCard key={index} med={med} addToCart={addToCart} />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "60px 24px",
    backgroundColor: "#f8fafc",
    minHeight: "60vh",
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
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