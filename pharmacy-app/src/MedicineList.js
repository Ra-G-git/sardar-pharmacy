import { useState, useEffect } from "react";
import Papa from "papaparse";
import { useCart } from "./CartContext";

function MedicineList() {
    const { addToCart } = useCart();
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);

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
      <h2 style={styles.heading}>Our Medicines</h2>
      <div style={styles.searchBox}>
        <input
          type="text"
          placeholder="Search by name, generic or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />
      </div>
      <div style={styles.grid}>
        {filtered.map((med, index) => (
          <div key={index} style={styles.card}>
            <div style={styles.emoji}>💊</div>
            <h3 style={styles.name}>{med.medicine_name}</h3>
            <p style={styles.category}>{med.category_name}</p>
            <p style={styles.generic}>{med.generic_name}</p>
            <p style={styles.strength}>{med.strength}</p>
            <p style={styles.manufacturer}>{med.manufacturer_name}</p>
            <p style={styles.price}>৳{med.price}</p>
            <button
                style={styles.button}
                onClick={() => addToCart(med)}
                >
                    Add to Cart
            </button>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <p style={styles.noResult}>No medicines found. Try a different search.</p>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "40px 16px",
    backgroundColor: "#f8fafc",
  },
  heading: {
    textAlign: "center",
    fontSize: "28px",
    color: "#1e40af",
    marginBottom: "20px",
  },
  searchBox: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "30px",
  },
  input: {
    padding: "12px 20px",
    fontSize: "16px",
    width: "400px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    outline: "none",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "20px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  emoji: {
    fontSize: "40px",
    marginBottom: "10px",
  },
  name: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#1e293b",
    margin: "6px 0",
  },
  category: {
    fontSize: "13px",
    color: "#2563eb",
    fontWeight: "bold",
    margin: "4px 0",
  },
  generic: {
    fontSize: "12px",
    color: "#64748b",
    margin: "4px 0",
  },
  strength: {
    fontSize: "12px",
    color: "#94a3b8",
    margin: "4px 0",
  },
  manufacturer: {
    fontSize: "11px",
    color: "#94a3b8",
    margin: "4px 0",
  },
  price: {
    fontSize: "15px",
    color: "#16a34a",
    fontWeight: "bold",
    margin: "8px 0",
  },
  button: {
    marginTop: "10px",
    padding: "10px 20px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    width: "100%",
    cursor: "pointer",
  },
  noResult: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "16px",
    marginTop: "40px",
  },
};

export default MedicineList;