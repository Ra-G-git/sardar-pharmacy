import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

const ADMIN_EMAIL = "razeesardar@gmail.com";

function AdminDashboard({ onClose }) {
  const [activeTab, setActiveTab] = useState("prescriptions");
  const [prescriptions, setPrescriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;

useEffect(() => {
    if (user && user.email === ADMIN_EMAIL) {
      fetchData();
    }
  }, []);

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div style={styles.overlay}>
        <div style={styles.box}>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
          <h2 style={styles.denied}>🚫 Access Denied</h2>
          <p style={styles.deniedText}>You are not authorized to view this page.</p>
        </div>
      </div>
    );
  }

  async function fetchData() {
    setLoading(true);
    try {
      const prescSnap = await getDocs(collection(db, "prescriptions"));
      setPrescriptions(prescSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const ordersSnap = await getDocs(collection(db, "orders"));
      setOrders(ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const usersSnap = await getDocs(collection(db, "users"));
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function updatePrescriptionStatus(id, status) {
    await updateDoc(doc(db, "prescriptions", id), { status });
    fetchData();
  }

  async function updateOrderStatus(id, status) {
    await updateDoc(doc(db, "orders", id), { status });
    fetchData();
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.dashboard}>
        <div style={styles.header}>
          <h2 style={styles.title}>🔧 Admin Dashboard</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.tabs}>
          {["prescriptions", "orders", "users"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tab,
                backgroundColor: activeTab === tab ? "#2563eb" : "#f1f5f9",
                color: activeTab === tab ? "white" : "#1e293b",
              }}
            >
              {tab === "prescriptions" && "📋 Prescriptions"}
              {tab === "orders" && "🛒 Orders"}
              {tab === "users" && "👤 Users"}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={styles.loading}>Loading...</p>
        ) : (
          <div style={styles.content}>

            {activeTab === "prescriptions" && (
              <div>
                <h3 style={styles.sectionTitle}>
                  Prescriptions ({prescriptions.length})
                </h3>
                {prescriptions.length === 0 ? (
                  <p style={styles.empty}>No prescriptions yet.</p>
                ) : (
                  prescriptions.map((p) => (
                    <div key={p.id} style={styles.card}>
                      <img src={p.imageUrl} alt="prescription" style={styles.prescImg} />
                      <div style={styles.cardInfo}>
                        <p style={styles.cardEmail}>👤 {p.userEmail}</p>
                        <p style={styles.cardDetail}>📅 {p.uploadedAt?.toDate?.().toLocaleString()}</p>
                        {p.note && <p style={styles.cardDetail}>📝 {p.note}</p>}
                        <p style={{
                          ...styles.status,
                          color: p.status === "approved" ? "#16a34a" : p.status === "rejected" ? "#dc2626" : "#d97706"
                        }}>
                          Status: {p.status}
                        </p>
                        <div style={styles.btnRow}>
                          <button
                            onClick={() => updatePrescriptionStatus(p.id, "approved")}
                            style={styles.approveBtn}
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => updatePrescriptionStatus(p.id, "rejected")}
                            style={styles.rejectBtn}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "orders" && (
              <div>
                <h3 style={styles.sectionTitle}>Orders ({orders.length})</h3>
                {orders.length === 0 ? (
                  <p style={styles.empty}>No orders yet.</p>
                ) : (
                  orders.map((o) => (
                    <div key={o.id} style={styles.card}>
                      <div style={styles.cardInfo}>
                        <p style={styles.cardEmail}>👤 {o.userEmail}</p>
                        <p style={styles.cardDetail}>📅 {o.createdAt?.toDate?.().toLocaleString()}</p>
                        <p style={styles.cardDetail}>📞 {o.phone}</p>
                        <p style={styles.cardDetail}>📍 {o.address}</p>
                        <p style={styles.cardDetail}>💳 {o.paymentMethod}</p>
                        <p style={styles.cardDetail}>💰 Total: ৳{o.total}</p>
                        <div style={styles.itemsList}>
                          {o.items?.map((item, i) => (
                            <p key={i} style={styles.orderItem}>
                              💊 {item.name} x{item.quantity} — ৳{(parseFloat(item.price) * item.quantity).toFixed(2)}
                            </p>
                          ))}
                        </div>
                        <p style={{
                          ...styles.status,
                          color: o.status === "delivered" ? "#16a34a" : o.status === "cancelled" ? "#dc2626" : "#d97706"
                        }}>
                          Status: {o.status}
                        </p>
                        <div style={styles.btnRow}>
                          <button
                            onClick={() => updateOrderStatus(o.id, "processing")}
                            style={styles.approveBtn}
                          >
                            🔄 Processing
                          </button>
                          <button
                            onClick={() => updateOrderStatus(o.id, "delivered")}
                            style={styles.approveBtn}
                          >
                            ✅ Delivered
                          </button>
                          <button
                            onClick={() => updateOrderStatus(o.id, "cancelled")}
                            style={styles.rejectBtn}
                          >
                            ❌ Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "users" && (
              <div>
                <h3 style={styles.sectionTitle}>Users ({users.length})</h3>
                {users.length === 0 ? (
                  <p style={styles.empty}>No users yet.</p>
                ) : (
                  users.map((u) => (
                    <div key={u.id} style={styles.card}>
                      <p style={styles.cardEmail}>👤 {u.email}</p>
                      <p style={styles.cardDetail}>📅 Joined: {u.createdAt?.toDate?.().toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 2000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  dashboard: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "30px",
    width: "800px",
    maxHeight: "90vh",
    overflowY: "auto",
    position: "relative",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: {
    fontSize: "22px",
    color: "#1e40af",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#64748b",
  },
  tabs: {
    display: "flex",
    gap: "10px",
    marginBottom: "24px",
  },
  tab: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  },
  content: {
    minHeight: "300px",
  },
  sectionTitle: {
    fontSize: "18px",
    color: "#1e293b",
    marginBottom: "16px",
  },
  card: {
    display: "flex",
    gap: "16px",
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "12px",
    alignItems: "flex-start",
  },
  prescImg: {
    width: "80px",
    height: "80px",
    objectFit: "cover",
    borderRadius: "8px",
  },
  cardInfo: {
    flex: 1,
  },
  cardEmail: {
    fontWeight: "bold",
    color: "#1e293b",
    margin: "0 0 6px 0",
    fontSize: "15px",
  },
  cardDetail: {
    fontSize: "13px",
    color: "#64748b",
    margin: "4px 0",
  },
  status: {
    fontSize: "13px",
    fontWeight: "bold",
    margin: "6px 0",
  },
  btnRow: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
  },
  approveBtn: {
    padding: "6px 14px",
    backgroundColor: "#dcfce7",
    color: "#16a34a",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "bold",
  },
  rejectBtn: {
    padding: "6px 14px",
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "bold",
  },
  loading: {
    textAlign: "center",
    color: "#94a3b8",
    padding: "40px",
  },
  empty: {
    textAlign: "center",
    color: "#94a3b8",
    padding: "40px",
  },
  denied: {
    textAlign: "center",
    color: "#dc2626",
    fontSize: "24px",
  },
  deniedText: {
    textAlign: "center",
    color: "#64748b",
  },
  box: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "40px",
    width: "400px",
    position: "relative",
    textAlign: "center",
  },
  itemsList: {
  backgroundColor: "#f1f5f9",
  borderRadius: "8px",
  padding: "10px",
  margin: "8px 0",
},
orderItem: {
  fontSize: "13px",
  color: "#1e293b",
  margin: "4px 0",
},
};

export default AdminDashboard;