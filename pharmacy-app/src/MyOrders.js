import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getMedicineEmoji } from "./medicineUtils";
import { downloadReceipt } from "./Receipt";

function MyOrders({ onClose }) {
  const [orders, setOrders] = useState([]);
  const [allPrescriptions, setAllPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null); // orderId whose "more prescriptions" is open
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    if (!auth.currentUser) { setLoading(false); return; }

    const [ordersSnap, prescSnap] = await Promise.all([
      getDocs(query(collection(db, "orders"), where("userId", "==", auth.currentUser.uid))),
      getDocs(query(collection(db, "prescriptions"), where("userId", "==", auth.currentUser.uid))),
    ]);

    setOrders(ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setAllPrescriptions(prescSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  function getStatusColor(status) {
    switch (status) {
      case "delivered": return { bg: "#f0fdf4", color: "#16a34a" };
      case "processing": return { bg: "#eff6ff", color: "#2563eb" };
      case "cancelled": return { bg: "#fef2f2", color: "#dc2626" };
      default: return { bg: "#fffbeb", color: "#d97706" };
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case "delivered": return "✅";
      case "processing": return "🔄";
      case "cancelled": return "❌";
      default: return "⏳";
    }
  }

  // Prescriptions linked to a specific order
  function getOrderPrescriptions(orderId) {
    return allPrescriptions.filter((p) => p.orderId === orderId);
  }

  // All OTHER prescriptions NOT linked to this order (standalone or other orders)
  function getOtherPrescriptions(orderId) {
    return allPrescriptions.filter((p) => p.orderId !== orderId);
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>My Orders</h2>
            <p style={styles.subtitle}>{orders.length} order{orders.length !== 1 ? "s" : ""} found</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          {!auth.currentUser ? (
            <div style={styles.empty}>
              <p style={styles.emptyIcon}>🔒</p>
              <p style={styles.emptyText}>Please login to view your orders</p>
            </div>
          ) : loading ? (
            <div style={styles.empty}>
              <p style={styles.emptyIcon}>⏳</p>
              <p style={styles.emptyText}>Loading your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyIcon}>📦</p>
              <p style={styles.emptyText}>No orders yet</p>
              <p style={styles.emptySub}>Start shopping to place your first order!</p>
            </div>
          ) : (
            orders.map((o) => {
              const statusStyle = getStatusColor(o.status);
              const orderPrescriptions = getOrderPrescriptions(o.id);
              const otherPrescriptions = getOtherPrescriptions(o.id);
              const isExpanded = expandedOrder === o.id;

              return (
                <div key={o.id} style={styles.card}>
                  {/* Order Header */}
                  <div style={styles.cardHeader}>
                    <div>
                      <p style={styles.orderId}>Order #{o.id.slice(0, 8).toUpperCase()}</p>
                      <p style={styles.orderDate}>📅 {o.createdAt?.toDate?.().toLocaleString()}</p>
                    </div>
                    <span style={{ ...styles.statusBadge, backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                      {getStatusIcon(o.status)} {o.status}
                    </span>
                  </div>

                  {/* Items */}
                  <div style={styles.itemsList}>
                    {o.items?.map((item, i) => (
                      <div key={i} style={styles.item}>
                        <span style={styles.itemName}>{getMedicineEmoji(item.category)} {item.name} {item.unit_size > 1 ? `(${item.unit})` : ""}</span>
                        <span style={styles.itemQty}>×{item.quantity}</span>
                        <span style={styles.itemPrice}>৳{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Prescriptions attached to this order */}
                  {orderPrescriptions.length > 0 && (
                    <div style={styles.prescSection}>
                      <p style={styles.prescLabel}>📋 Prescriptions with this order</p>
                      <div style={styles.prescRow}>
                        {orderPrescriptions.map((p) => (
                          <div key={p.id} style={styles.prescThumbWrap}>
                            <img
                              src={p.imageUrl}
                              alt="prescription"
                              style={styles.prescThumb}
                              onClick={() => setSelectedImage(p.imageUrl)}
                            />
                            <span style={{
                              ...styles.prescStatusDot,
                              backgroundColor:
                                p.status === "approved" ? "#16a34a" :
                                p.status === "rejected" ? "#dc2626" : "#d97706",
                            }} title={p.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div style={styles.cardFooter}>
                    <div style={styles.deliveryInfo}>
                      <p style={styles.deliveryText}>📍 {o.address}</p>
                      <p style={styles.deliveryText}>📞 {o.phone}</p>
                      <p style={styles.deliveryText}>💳 {o.paymentMethod}</p>
                    </div>
                    <div style={styles.totalBox}>
                      <p style={styles.totalLabel}>Total</p>
                      <p style={styles.totalAmt}>৳{o.total}</p>
                    </div>
                  </div>

                  {/* Receipt + More Prescriptions buttons */}
                  <div style={styles.receiptBtns}>
                    <button style={styles.downloadBtn} onClick={() => downloadReceipt({ id: o.id, name: o.name, phone: o.phone, address: o.address, paymentMethod: o.paymentMethod, items: o.items, total: o.total, status: o.status, createdAt: o.createdAt?.toDate?.().toLocaleString() })}>
                      📥 PDF
                    </button>
                    {otherPrescriptions.length > 0 && (
                      <button
                        style={styles.morePrescBtn}
                        onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                      >
                        📋 {isExpanded ? "Hide" : `${otherPrescriptions.length} more prescription${otherPrescriptions.length > 1 ? "s" : ""}`}
                      </button>
                    )}
                  </div>

                  {/* Expandable: all other prescriptions from this user */}
                  {isExpanded && (
                    <div style={styles.morePrescSection}>
                      <p style={styles.prescLabel}>📋 Your other uploaded prescriptions</p>
                      <div style={styles.prescRow}>
                        {otherPrescriptions.map((p) => (
                          <div key={p.id} style={styles.prescThumbWrap}>
                            <img
                              src={p.imageUrl}
                              alt="prescription"
                              style={styles.prescThumb}
                              onClick={() => setSelectedImage(p.imageUrl)}
                            />
                            <span style={{
                              ...styles.prescStatusDot,
                              backgroundColor:
                                p.status === "approved" ? "#16a34a" :
                                p.status === "rejected" ? "#dc2626" : "#d97706",
                            }} title={p.status} />
                            <p style={styles.prescDate}>
                              {p.uploadedAt?.toDate?.().toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div onClick={() => setSelectedImage(null)} style={styles.lightbox}>
          <img src={selectedImage} alt="prescription" style={styles.lightboxImg} />
          <p style={styles.lightboxHint}>Tap anywhere to close</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 2000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(4px)",
    padding: "20px",
  },
  box: {
    backgroundColor: "white",
    borderRadius: "24px",
    width: "100%",
    maxWidth: "560px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 28px",
    background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
  },
  title: { color: "white", fontSize: "22px", fontWeight: "800", margin: 0 },
  subtitle: { color: "rgba(255,255,255,0.75)", fontSize: "13px", margin: "4px 0 0 0" },
  closeBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    color: "white",
    fontSize: "16px",
    cursor: "pointer",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: "20px", overflowY: "auto", flex: 1 },
  empty: { textAlign: "center", padding: "60px 20px" },
  emptyIcon: { fontSize: "56px", marginBottom: "16px" },
  emptyText: { fontSize: "18px", fontWeight: "700", color: "#1e293b", marginBottom: "8px" },
  emptySub: { fontSize: "14px", color: "#94a3b8" },
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: "16px",
    padding: "18px",
    marginBottom: "14px",
    border: "1px solid #e2e8f0",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" },
  orderId: { fontWeight: "800", color: "#1e293b", fontSize: "15px", margin: "0 0 4px 0" },
  orderDate: { fontSize: "12px", color: "#94a3b8", margin: 0 },
  statusBadge: { padding: "6px 12px", borderRadius: "50px", fontSize: "12px", fontWeight: "700", textTransform: "capitalize" },
  itemsList: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "12px",
    marginBottom: "14px",
    border: "1px solid #f1f5f9",
  },
  item: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f8fafc" },
  itemName: { fontSize: "13px", color: "#1e293b", flex: 1, fontWeight: "500" },
  itemQty: { fontSize: "13px", color: "#64748b", margin: "0 12px" },
  itemPrice: { fontSize: "13px", color: "#2563eb", fontWeight: "700" },
  // Prescription styles
  prescSection: {
    backgroundColor: "#f0fdf4",
    borderRadius: "12px",
    padding: "12px",
    marginBottom: "12px",
    border: "1px solid #bbf7d0",
  },
  morePrescSection: {
    backgroundColor: "#fffbeb",
    borderRadius: "12px",
    padding: "12px",
    marginTop: "10px",
    border: "1px solid #fde68a",
  },
  prescLabel: { fontSize: "12px", fontWeight: "700", color: "#374151", margin: "0 0 10px 0" },
  prescRow: { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-start" },
  prescThumbWrap: { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" },
  prescThumb: {
    width: "64px",
    height: "64px",
    objectFit: "cover",
    borderRadius: "10px",
    border: "2px solid #e2e8f0",
    cursor: "zoom-in",
  },
  prescStatusDot: {
    position: "absolute",
    top: "4px",
    right: "4px",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    border: "2px solid white",
  },
  prescDate: { fontSize: "10px", color: "#94a3b8", margin: 0, textAlign: "center" },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
  deliveryInfo: { flex: 1 },
  deliveryText: { fontSize: "12px", color: "#64748b", margin: "3px 0" },
  totalBox: { textAlign: "right" },
  totalLabel: { fontSize: "11px", color: "#94a3b8", margin: "0 0 2px 0", textTransform: "uppercase", fontWeight: "600" },
  totalAmt: { fontSize: "22px", fontWeight: "800", color: "#1e40af", margin: 0 },
  receiptBtns: { display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" },
  printBtn: { padding: "8px 16px", backgroundColor: "#1e293b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  downloadBtn: { padding: "8px 16px", backgroundColor: "#1e40af", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  morePrescBtn: { padding: "8px 16px", backgroundColor: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  lightbox: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "zoom-out",
  },
  lightboxImg: { maxWidth: "92%", maxHeight: "85vh", borderRadius: "12px", objectFit: "contain" },
  lightboxHint: { color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "16px" },
};

export default MyOrders;