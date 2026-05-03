import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { collection, getDocs, updateDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getMedicineEmoji } from "./medicineUtils";
import { downloadReceipt, printReceipt, whatsappReceipt } from "./Receipt";

const ADMIN_EMAIL = "razeesardar@gmail.com";
const LOW_STOCK_THRESHOLD = 10;

function AdminPage() {
  const [activeTab, setActiveTab] = useState("prescriptions");
  const [prescriptions, setPrescriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [user, setUser] = useState(null);
  const [expandedUserPresc, setExpandedUserPresc] = useState(null);

  // Inventory edit state
  const [editingInv, setEditingInv] = useState(null);
  const [editInvPrice, setEditInvPrice] = useState("");
  const [editInvStock, setEditInvStock] = useState("");
  const [invSearch, setInvSearch] = useState("");
  const [savingInv, setSavingInv] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u && u.email === ADMIN_EMAIL) fetchData();
      else setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [prescSnap, ordersSnap, usersSnap, invSnap] = await Promise.all([
        getDocs(collection(db, "prescriptions")),
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "inventory")),
      ]);
      setPrescriptions(prescSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setOrders(ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setInventory(invSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
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

  async function saveInventoryEdit() {
    if (!editingInv) return;
    setSavingInv(true);
    try {
      const updateData = {
        price: parseFloat(editInvPrice).toFixed(2),
        stock: parseInt(editInvStock) || 0,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, "inventory", editingInv.id), updateData);
      setInventory((prev) => prev.map((item) =>
        item.id === editingInv.id ? { ...item, ...updateData } : item
      ));
      setEditingInv(null);
    } catch (err) { console.error(err); }
    setSavingInv(false);
  }

  async function deleteInventoryItem(id) {
    if (!window.confirm("Remove this medicine from inventory?")) return;
    await deleteDoc(doc(db, "inventory", id));
    setInventory((prev) => prev.filter((item) => item.id !== id));
  }

  function getStatusColor(status) {
    switch (status) {
      case "approved": case "delivered": return { bg: "#f0fdf4", color: "#16a34a" };
      case "processing": return { bg: "#eff6ff", color: "#2563eb" };
      case "rejected": case "cancelled": return { bg: "#fef2f2", color: "#dc2626" };
      default: return { bg: "#fffbeb", color: "#d97706" };
    }
  }

  if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
    return (
      <div style={styles.deniedPage}>
        <div style={styles.deniedBox}>
          <p style={styles.deniedIcon}>🚫</p>
          <h2 style={styles.deniedTitle}>Access Denied</h2>
          <p style={styles.deniedText}>You must be logged in as admin to view this page.</p>
          <button onClick={() => window.close()} style={styles.deniedBtn}>Close Tab</button>
        </div>
      </div>
    );
  }

  const lowStockItems = inventory.filter((item) => (item.stock || 0) <= LOW_STOCK_THRESHOLD);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const pendingPrescriptions = prescriptions.filter((p) => p.status === "pending").length;
  const totalRevenue = orders.filter((o) => o.status === "delivered").reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

  const filteredInventory = inventory.filter((item) =>
    item.medicine_name?.toLowerCase().includes(invSearch.toLowerCase()) ||
    item.generic_name?.toLowerCase().includes(invSearch.toLowerCase())
  );

  const tabs = [
    { id: "prescriptions", label: "📋 Prescriptions", count: prescriptions.length },
    { id: "orders", label: "🛒 Orders", count: orders.length },
    { id: "inventory", label: "📦 Inventory", count: inventory.length, alert: lowStockItems.length > 0 },
    { id: "users", label: "👤 Users", count: users.length },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🔧 Admin Dashboard</h1>
          <p style={styles.subtitle}>Sardar Pharmacy Management</p>
        </div>
        <button onClick={() => window.close()} style={styles.closeBtn}>✕ Close Tab</button>
      </div>

      <div style={styles.body}>
        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <p style={styles.statNum}>{orders.length}</p>
            <p style={styles.statLabel}>Total Orders</p>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: "#fffbeb" }}>
            <p style={{ ...styles.statNum, color: "#d97706" }}>{pendingOrders}</p>
            <p style={styles.statLabel}>Pending Orders</p>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: "#fef2f2" }}>
            <p style={{ ...styles.statNum, color: "#dc2626" }}>{pendingPrescriptions}</p>
            <p style={styles.statLabel}>Pending Rx</p>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: "#f0fdf4" }}>
            <p style={{ ...styles.statNum, color: "#16a34a" }}>৳{totalRevenue.toFixed(0)}</p>
            <p style={styles.statLabel}>Revenue</p>
          </div>
          {lowStockItems.length > 0 && (
            <div style={{ ...styles.statCard, backgroundColor: "#fff7ed" }}>
              <p style={{ ...styles.statNum, color: "#ea580c" }}>{lowStockItems.length}</p>
              <p style={styles.statLabel}>Low Stock ⚠️</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              ...styles.tab,
              backgroundColor: activeTab === tab.id ? "#1e40af" : "#f1f5f9",
              color: activeTab === tab.id ? "white" : "#64748b",
            }}>
              {tab.label}
              <span style={{ ...styles.tabBadge, backgroundColor: activeTab === tab.id ? "rgba(255,255,255,0.3)" : "#e2e8f0", color: activeTab === tab.id ? "white" : "#64748b" }}>
                {tab.count}
              </span>
              {tab.alert && <span style={styles.alertDot} />}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}><p style={{ fontSize: "48px" }}>⏳</p><p>Loading data...</p></div>
          ) : (
            <>
              {/* Prescriptions Tab */}
              {activeTab === "prescriptions" && (
                <div>
                  {prescriptions.length === 0 ? (
                    <div style={styles.empty}><p style={{ fontSize: "48px" }}>📋</p><p style={styles.emptyText}>No prescriptions yet</p></div>
                  ) : (
                    prescriptions.map((p) => {
                      const statusStyle = getStatusColor(p.status);
                      return (
                        <div key={p.id} style={styles.card}>
                          <div style={{ flexShrink: 0 }}>
                            <img src={p.imageUrl} alt="prescription" style={{ ...styles.prescImg, cursor: "zoom-in" }} onClick={() => setSelectedImage(p.imageUrl)} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={styles.cardHeader}>
                              <p style={styles.cardEmail}>👤 {p.userEmail}</p>
                              <span style={{ ...styles.statusBadge, backgroundColor: statusStyle.bg, color: statusStyle.color }}>{p.status}</span>
                            </div>
                            <p style={styles.cardDetail}>📅 {p.uploadedAt?.toDate?.().toLocaleString()}</p>
                            {p.note && <p style={styles.cardNote}>📝 {p.note}</p>}
                            <div style={styles.btnRow}>
                              <button onClick={() => updatePrescriptionStatus(p.id, "approved")} style={styles.approveBtn}>✅ Approve</button>
                              <button onClick={() => updatePrescriptionStatus(p.id, "rejected")} style={styles.rejectBtn}>❌ Reject</button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === "orders" && (
                <div>
                  {orders.length === 0 ? (
                    <div style={styles.empty}><p style={{ fontSize: "48px" }}>🛒</p><p style={styles.emptyText}>No orders yet</p></div>
                  ) : (
                    orders.map((o) => {
                      const statusStyle = getStatusColor(o.status);
                      const orderPrescriptions = prescriptions.filter((p) => p.orderId === o.id);
                      const userOtherPrescriptions = prescriptions.filter((p) => p.userEmail === o.userEmail && p.orderId !== o.id);
                      const isExpanded = expandedUserPresc === o.id;
                      return (
                        <div key={o.id} style={styles.card}>
                          <div style={{ flex: 1 }}>
                            <div style={styles.cardHeader}>
                              <div>
                                <p style={styles.cardEmail}>👤 {o.userEmail}</p>
                                <p style={styles.cardDetail}>#{o.id.slice(0, 8).toUpperCase()}</p>
                              </div>
                              <span style={{ ...styles.statusBadge, backgroundColor: statusStyle.bg, color: statusStyle.color }}>{o.status}</span>
                            </div>
                            <p style={styles.cardDetail}>📅 {o.createdAt?.toDate?.().toLocaleString()}</p>
                            <p style={styles.cardDetail}>📞 {o.phone} • 📍 {o.address}</p>
                            <p style={styles.cardDetail}>💳 {o.paymentMethod}</p>
                            <div style={styles.itemsList}>
                              {o.items?.map((item, i) => (
                                <p key={i} style={styles.orderItem}>
                                  {getMedicineEmoji(item.category)} {item.name} ×{item.quantity} — ৳{(parseFloat(item.price) * item.quantity).toFixed(2)}
                                </p>
                              ))}
                            </div>
                            {orderPrescriptions.length > 0 && (
                              <div style={styles.prescBlock}>
                                <p style={styles.prescBlockLabel}>📋 Prescriptions with this order</p>
                                <div style={styles.prescRow}>
                                  {orderPrescriptions.map((p) => {
                                    const ps = getStatusColor(p.status);
                                    return (
                                      <div key={p.id} style={{ position: "relative" }}>
                                        <img src={p.imageUrl} alt="prescription" style={{ ...styles.prescImg, cursor: "zoom-in" }} onClick={() => setSelectedImage(p.imageUrl)} />
                                        <span style={{ ...styles.prescDot, backgroundColor: ps.color }} title={p.status} />
                                        <div style={styles.prescActions}>
                                          <button onClick={() => updatePrescriptionStatus(p.id, "approved")} style={styles.prescApprove}>✅</button>
                                          <button onClick={() => updatePrescriptionStatus(p.id, "rejected")} style={styles.prescReject}>❌</button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <div style={styles.orderFooter}>
                              <strong style={styles.orderTotal}>Total: ৳{o.total}</strong>
                              <div style={styles.btnRow}>
                                <button onClick={() => updateOrderStatus(o.id, "processing")} style={styles.processBtn}>🔄 Processing</button>
                                <button onClick={() => updateOrderStatus(o.id, "delivered")} style={styles.approveBtn}>✅ Delivered</button>
                                <button onClick={() => updateOrderStatus(o.id, "cancelled")} style={styles.rejectBtn}>❌ Cancel</button>
                              </div>
                              <div style={styles.btnRow}>
                                <button onClick={() => printReceipt({ id: o.id, name: o.name, phone: o.phone, address: o.address, paymentMethod: o.paymentMethod, items: o.items, total: o.total, status: o.status, createdAt: o.createdAt?.toDate?.().toLocaleString() })} style={styles.printBtn}>🖨️ Print</button>
                                <button onClick={() => downloadReceipt({ id: o.id, name: o.name, phone: o.phone, address: o.address, paymentMethod: o.paymentMethod, items: o.items, total: o.total, status: o.status, createdAt: o.createdAt?.toDate?.().toLocaleString() })} style={styles.downloadBtn}>📥 PDF</button>
                                <button onClick={() => whatsappReceipt({ id: o.id, name: o.name, phone: o.phone, address: o.address, paymentMethod: o.paymentMethod, items: o.items, total: o.total, status: o.status, createdAt: o.createdAt?.toDate?.().toLocaleString() })} style={styles.whatsappBtn}>💬 WhatsApp</button>
                                {userOtherPrescriptions.length > 0 && (
                                  <button onClick={() => setExpandedUserPresc(isExpanded ? null : o.id)} style={styles.morePrescBtn}>
                                    📋 {isExpanded ? "Hide" : `${userOtherPrescriptions.length} more from user`}
                                  </button>
                                )}
                              </div>
                            </div>
                            {isExpanded && (
                              <div style={styles.userPrescBlock}>
                                <p style={styles.prescBlockLabel}>📋 All other prescriptions from {o.userEmail}</p>
                                <div style={styles.prescRow}>
                                  {userOtherPrescriptions.map((p) => {
                                    const ps = getStatusColor(p.status);
                                    return (
                                      <div key={p.id} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                        <img src={p.imageUrl} alt="prescription" style={{ ...styles.prescImg, cursor: "zoom-in" }} onClick={() => setSelectedImage(p.imageUrl)} />
                                        <span style={{ ...styles.prescDot, backgroundColor: ps.color }} title={p.status} />
                                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>{p.uploadedAt?.toDate?.().toLocaleDateString()}</span>
                                        <div style={styles.prescActions}>
                                          <button onClick={() => updatePrescriptionStatus(p.id, "approved")} style={styles.prescApprove}>✅</button>
                                          <button onClick={() => updatePrescriptionStatus(p.id, "rejected")} style={styles.prescReject}>❌</button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Inventory Tab */}
              {activeTab === "inventory" && (
                <div>
                  <div style={styles.invTopBar}>
                    <div>
                      <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                        {inventory.length} medicines in your inventory • Prices override CSV
                      </p>
                      {lowStockItems.length > 0 && (
                        <p style={{ fontSize: "13px", color: "#ea580c", margin: "4px 0 0 0", fontWeight: "600" }}>
                          ⚠️ {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} low on stock (≤{LOW_STOCK_THRESHOLD} units)
                        </p>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Search inventory..."
                      value={invSearch}
                      onChange={(e) => setInvSearch(e.target.value)}
                      style={styles.invSearchInput}
                    />
                  </div>

                  {inventory.length === 0 ? (
                    <div style={styles.empty}>
                      <p style={{ fontSize: "48px" }}>📦</p>
                      <p style={styles.emptyText}>No inventory yet</p>
                      <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "8px" }}>
                        Go to POS → add a medicine to cart → click ✏️ to set price & stock
                      </p>
                    </div>
                  ) : (
                    <div style={styles.invGrid}>
                      {filteredInventory.map((item) => {
                        const isLow = (item.stock || 0) <= LOW_STOCK_THRESHOLD;
                        const isEditing = editingInv?.id === item.id;
                        return (
                          <div key={item.id} style={{ ...styles.invCard, border: isLow ? "1.5px solid #fed7aa" : "1px solid #e2e8f0" }}>
                            <div style={styles.invCardTop}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "24px" }}>{getMedicineEmoji(item.category_name)}</span>
                                <div>
                                  <p style={styles.invName}>{item.medicine_name}</p>
                                  <p style={styles.invGeneric}>{item.generic_name}{item.strength ? ` • ${item.strength}` : ""}</p>
                                </div>
                              </div>
                              {isLow && <span style={styles.lowBadge}>⚠️ Low</span>}
                            </div>

                            {isEditing ? (
                              <div style={styles.invEditRow}>
                                <div style={{ flex: 1 }}>
                                  <label style={styles.invEditLabel}>Price (৳)</label>
                                  <input type="number" min="0" step="0.01" value={editInvPrice} onChange={(e) => setEditInvPrice(e.target.value)} style={styles.invEditInput} autoFocus />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={styles.invEditLabel}>Stock</label>
                                  <input type="number" min="0" value={editInvStock} onChange={(e) => setEditInvStock(e.target.value)} style={styles.invEditInput} />
                                </div>
                                <div style={{ display: "flex", gap: "6px", alignSelf: "flex-end" }}>
                                  <button onClick={saveInventoryEdit} disabled={savingInv} style={styles.invSaveBtn}>{savingInv ? "..." : "💾"}</button>
                                  <button onClick={() => setEditingInv(null)} style={styles.invCancelBtn}>✕</button>
                                </div>
                              </div>
                            ) : (
                              <div style={styles.invStatsRow}>
                                <div style={styles.invStat}>
                                  <p style={styles.invStatNum}>৳{item.price}</p>
                                  <p style={styles.invStatLabel}>Price</p>
                                </div>
                                <div style={{ ...styles.invStat, backgroundColor: isLow ? "#fff7ed" : "#f0fdf4" }}>
                                  <p style={{ ...styles.invStatNum, color: isLow ? "#ea580c" : "#16a34a" }}>{item.stock || 0}</p>
                                  <p style={styles.invStatLabel}>In Stock</p>
                                </div>
                                <div style={styles.invActions}>
                                  <button onClick={() => { setEditingInv(item); setEditInvPrice(item.price); setEditInvStock(item.stock || 0); }} style={styles.invEditBtn}>✏️ Edit</button>
                                  <button onClick={() => deleteInventoryItem(item.id)} style={styles.invDeleteBtn}>🗑️</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Users Tab */}
              {activeTab === "users" && (
                <div>
                  {users.length === 0 ? (
                    <div style={styles.empty}><p style={{ fontSize: "48px" }}>👤</p><p style={styles.emptyText}>No users yet</p></div>
                  ) : (
                    users.map((u) => (
                      <div key={u.id} style={{ ...styles.card, alignItems: "center" }}>
                        <div style={styles.userAvatar}>{u.email?.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <p style={styles.cardEmail}>👤 {u.email}</p>
                          <p style={styles.cardDetail}>📅 Joined: {u.createdAt?.toDate?.().toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div onClick={() => setSelectedImage(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, cursor: "zoom-out" }}>
          <img src={selectedImage} alt="full prescription" style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: "12px", objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Inter', sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 40px", background: "linear-gradient(135deg, #0f172a, #1e293b)", position: "sticky", top: 0, zIndex: 100 },
  title: { color: "white", fontSize: "24px", fontWeight: "800", margin: 0 },
  subtitle: { color: "rgba(255,255,255,0.6)", fontSize: "13px", margin: "4px 0 0 0" },
  closeBtn: { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer", borderRadius: "10px", padding: "8px 16px" },
  body: { maxWidth: "900px", margin: "0 auto", padding: "32px 24px" },
  statsRow: { display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" },
  statCard: { flex: 1, minWidth: "100px", backgroundColor: "#eff6ff", borderRadius: "12px", padding: "16px", textAlign: "center" },
  statNum: { fontSize: "26px", fontWeight: "800", color: "#1e40af", margin: 0 },
  statLabel: { fontSize: "12px", color: "#64748b", margin: "4px 0 0 0", fontWeight: "600" },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" },
  tab: { padding: "10px 18px", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s", position: "relative" },
  tabBadge: { padding: "2px 8px", borderRadius: "50px", fontSize: "12px", fontWeight: "700" },
  alertDot: { width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ea580c", position: "absolute", top: "6px", right: "6px" },
  content: { backgroundColor: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", minHeight: "400px" },
  loading: { textAlign: "center", padding: "60px", color: "#94a3b8" },
  empty: { textAlign: "center", padding: "60px" },
  emptyText: { fontSize: "18px", fontWeight: "600", color: "#94a3b8" },
  card: { display: "flex", gap: "16px", backgroundColor: "#f8fafc", borderRadius: "16px", padding: "18px", marginBottom: "12px", border: "1px solid #e2e8f0" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" },
  cardEmail: { fontWeight: "700", color: "#1e293b", fontSize: "15px", margin: 0 },
  cardDetail: { fontSize: "12px", color: "#64748b", margin: "4px 0" },
  cardNote: { fontSize: "13px", color: "#1e293b", backgroundColor: "white", padding: "8px 12px", borderRadius: "8px", margin: "8px 0", border: "1px solid #e2e8f0" },
  statusBadge: { padding: "4px 12px", borderRadius: "50px", fontSize: "12px", fontWeight: "700", textTransform: "capitalize", whiteSpace: "nowrap" },
  prescImg: { width: "90px", height: "90px", objectFit: "cover", borderRadius: "12px", border: "2px solid #e2e8f0" },
  btnRow: { display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" },
  approveBtn: { padding: "7px 14px", backgroundColor: "#dcfce7", color: "#16a34a", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  rejectBtn: { padding: "7px 14px", backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  processBtn: { padding: "7px 14px", backgroundColor: "#eff6ff", color: "#2563eb", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  printBtn: { padding: "7px 14px", backgroundColor: "#f1f5f9", color: "#1e293b", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  downloadBtn: { padding: "7px 14px", backgroundColor: "#eff6ff", color: "#2563eb", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  whatsappBtn: { padding: "7px 14px", backgroundColor: "#dcfce7", color: "#16a34a", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  morePrescBtn: { padding: "7px 14px", backgroundColor: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  prescBlock: { backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "12px", marginBottom: "12px" },
  userPrescBlock: { backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px", padding: "12px", marginTop: "10px" },
  prescBlockLabel: { fontSize: "12px", fontWeight: "700", color: "#374151", margin: "0 0 10px 0" },
  prescRow: { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-start" },
  prescDot: { position: "absolute", top: "4px", right: "4px", width: "10px", height: "10px", borderRadius: "50%", border: "2px solid white" },
  prescActions: { display: "flex", gap: "4px", marginTop: "4px" },
  prescApprove: { padding: "3px 6px", backgroundColor: "#dcfce7", color: "#16a34a", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  prescReject: { padding: "3px 6px", backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  itemsList: { backgroundColor: "white", borderRadius: "10px", padding: "10px 12px", margin: "8px 0", border: "1px solid #f1f5f9" },
  orderItem: { fontSize: "13px", color: "#1e293b", margin: "4px 0", fontWeight: "500" },
  orderFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" },
  orderTotal: { fontSize: "18px", color: "#1e40af" },
  userAvatar: { width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#1e40af", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "800", flexShrink: 0 },
  // Inventory styles
  invTopBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "12px" },
  invSearchInput: { padding: "10px 14px", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "14px", outline: "none", width: "220px", fontFamily: "Inter, sans-serif" },
  invGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" },
  invCard: { backgroundColor: "#f8fafc", borderRadius: "14px", padding: "14px" },
  invCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" },
  invName: { fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: 0 },
  invGeneric: { fontSize: "11px", color: "#94a3b8", margin: "2px 0 0 0" },
  lowBadge: { backgroundColor: "#fff7ed", color: "#ea580c", fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "50px", whiteSpace: "nowrap" },
  invStatsRow: { display: "flex", gap: "8px", alignItems: "center" },
  invStat: { flex: 1, backgroundColor: "#eff6ff", borderRadius: "10px", padding: "8px 10px", textAlign: "center" },
  invStatNum: { fontSize: "16px", fontWeight: "800", color: "#1e40af", margin: 0 },
  invStatLabel: { fontSize: "10px", color: "#94a3b8", margin: "2px 0 0 0", fontWeight: "600" },
  invActions: { display: "flex", gap: "6px" },
  invEditBtn: { padding: "7px 12px", backgroundColor: "#eff6ff", color: "#2563eb", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  invDeleteBtn: { padding: "7px 10px", backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px" },
  invEditRow: { display: "flex", gap: "8px", alignItems: "flex-end" },
  invEditLabel: { display: "block", fontSize: "11px", fontWeight: "600", color: "#374151", marginBottom: "4px" },
  invEditInput: { width: "100%", padding: "8px 10px", borderRadius: "8px", border: "2px solid #2563eb", fontSize: "14px", outline: "none", boxSizing: "border-box", fontWeight: "600" },
  invSaveBtn: { padding: "8px 12px", backgroundColor: "#1e40af", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "700" },
  invCancelBtn: { padding: "8px 10px", backgroundColor: "#f1f5f9", color: "#64748b", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" },
  deniedPage: { minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" },
  deniedBox: { backgroundColor: "white", borderRadius: "24px", padding: "48px 40px", textAlign: "center", maxWidth: "400px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" },
  deniedIcon: { fontSize: "64px", marginBottom: "16px" },
  deniedTitle: { fontSize: "28px", fontWeight: "800", color: "#dc2626", marginBottom: "12px" },
  deniedText: { color: "#64748b", fontSize: "15px", marginBottom: "28px" },
  deniedBtn: { padding: "14px 32px", backgroundColor: "#f1f5f9", color: "#1e293b", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "700", cursor: "pointer" },
};

export default AdminPage;