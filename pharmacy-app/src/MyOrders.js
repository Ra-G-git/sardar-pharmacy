import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function MyOrders({ onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "orders"),
      where("userId", "==", auth.currentUser.uid)
    );
    const snap = await getDocs(q);
    setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
        <h2 style={styles.title}>🛒 My Orders</h2>

        {!auth.currentUser ? (
          <p style={styles.empty}>Please login to view your orders.</p>
        ) : loading ? (
          <p style={styles.empty}>Loading...</p>
        ) : orders.length === 0 ? (
          <p style={styles.empty}>You have no orders yet.</p>
        ) : (
          orders.map((o) => (
            <div key={o.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.date}>📅 {o.createdAt?.toDate?.().toLocaleString()}</span>
                <span style={{
                  ...styles.status,
                  color: o.status === "delivered" ? "#16a34a" : o.status === "cancelled" ? "#dc2626" : "#d97706"
                }}>
                  {o.status}
                </span>
              </div>
              {o.items?.map((item, i) => (
                <p key={i} style={styles.item}>
                  💊 {item.name} x{item.quantity} — ৳{(parseFloat(item.price) * item.quantity).toFixed(2)}
                </p>
              ))}
              <p style={styles.total}>Total: ৳{o.total}</p>
              <p style={styles.address}>📍 {o.address}</p>
              <p style={styles.address}>💳 {o.paymentMethod}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0, left: 0,
    width: "100%", height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 2000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "40px",
    width: "500px",
    maxHeight: "90vh",
    overflowY: "auto",
    position: "relative",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  },
  closeBtn: {
    position: "absolute",
    top: "16px", right: "16px",
    background: "none", border: "none",
    fontSize: "20px", cursor: "pointer",
    color: "#64748b",
  },
  title: {
    fontSize: "22px",
    color: "#1e40af",
    marginBottom: "20px",
    textAlign: "center",
  },
  empty: {
    textAlign: "center",
    color: "#94a3b8",
    padding: "40px",
  },
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "12px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
  },
  date: {
    fontSize: "13px",
    color: "#64748b",
  },
  status: {
    fontSize: "13px",
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  item: {
    fontSize: "14px",
    color: "#1e293b",
    margin: "4px 0",
  },
  total: {
    fontSize: "15px",
    fontWeight: "bold",
    color: "#1e40af",
    marginTop: "10px",
  },
  address: {
    fontSize: "13px",
    color: "#64748b",
    margin: "4px 0",
  },
};

export default MyOrders;