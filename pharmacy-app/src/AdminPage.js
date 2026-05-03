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

  // Sorting
  const [prescSort, setPrescSort] = useState("newest");
  const [orderSort, setOrderSort] = useState("newest");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

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

  function sortByDate(arr, field, direction) {
    return [...arr].sort((a, b) => {
      const aTime = a[field]?.toDate?.()?.getTime() || 0;
      const bTime = b[field]?.toDate?.()?.getTime() || 0;
      return direction === "newest" ? bTime - aTime : aTime - bTime;
    });
  }

  const sortedPrescriptions = (() => {
    let list = [...prescriptions];
    if (prescSort === "pending") list = list.filter(p => p.status === "pending");
    else if (prescSort === "approved") list = list.filter(p => p.status === "approved");
    else if (prescSort === "rejected") list = list.filter(p => p.status === "rejected");
    else list = sortByDate(list, "uploadedAt", prescSort);
    return list;
  })();

  const sortedOrders = (() => {
    let list = orderStatusFilter === "all"
      ? [...orders]
      : orders.filter(o => o.status === orderStatusFilter);
    list = sortByDate(list, "createdAt", orderSort);
    return list;
  })();

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
    { id: "prescriptions", label: "📋 Rx", fullLabel: "📋 Prescriptions", count: prescriptions.length },
    { id: "orders", label: "🛒 Orders", fullLabel: "🛒 Orders", count: orders.length },
    { id: "inventory", label: "📦 Stock", fullLabel: "📦 Inventory", count: inventory.length, alert: lowStockItems.length > 0 },
    { id: "users", label: "👤 Users", fullLabel: "👤 Users", count: users.length },
  ];

  const SortBar = ({ value, onChange, options }) => (
    <div style={styles.sortBar}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            ...styles.sortBtn,
            backgroundColor: value === opt.value ? "#1e40af" : "#f1f5f9",
            color: value === opt.value ? "white" : "#64748b",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🔧 Admin</h1>
          <p style={styles.subtitle}>Sardar Pharmacy</p>
        </div>
        <button onClick={() => window.close()} style={styles.closeBtn}>✕</button>
      </div>

      <div style={styles.body}>
        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <p style={styles.statNum}>{orders.length}</p>
            <p style={styles.statLabel}>Orders</p>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: "#fffbeb" }}>
            <p style={{ ...styles.statNum, color: "#d97706" }}>{pendingOrders}</p>
            <p style={styles.statLabel}>Pending</p>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: "#fef2f2" }}>
            <p style={{ ...styles.statNum, color: "#dc2626" }}>{pendingPrescriptions}</p>
            <p style={styles.statLabel}>Rx</p>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: "#f0fdf4" }}>
            <p style={{ ...styles.statNum, color: "#16a34a" }}>৳{totalRevenue.toFixed(0)}</p>
            <p style={styles.statLabel}>Revenue</p>
          </div>
          {lowStockItems.length > 0 && (
            <div style={{ ...styles.statCard, backgroundColor: "#fff7ed" }}>
              <p style={{ ...styles.statNum, color: "#ea580c" }}>{lowStockItems.length}</p>
              <p style={styles.statLabel}>Low ⚠️</p>
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
              <span className="tab-full">{tab.fullLabel}</span>
              <span className="tab-short" style={{ display: "none" }}>{tab.label}</span>
              <span style={{ ...styles.tabBadge, backgroundColor: activeTab === tab.id ? "rgba(255,255,255,0.3)" : "#e2e8f0", color: activeTab === tab.id ? "white" : "#64748b" }}>
                {tab.count}
              </span>
              {tab.alert && <span style={styles.alertDot} />}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}><p style={{ fontSize: "48px" }}>⏳</p><p>Loading...</p></div>
          ) : (
            <>
              {/* Prescriptions Tab */}
              {activeTab === "prescriptions" && (
                <div>
                  <SortBar
                    value={prescSort}
                    onChange={setPrescSort}
                    options={[
                      { value: "newest", label: "Newest" },
                      { value: "oldest", label: "Oldest" },
                      { value: "pending", label: "⏳ Pending" },
                      { value: "approved", label: "✅ Approved" },
                      { value: "rejected", label: "❌ Rejected" },
                    ]}
                  />
                  {sortedPrescriptions.length === 0 ? (
                    <div style={styles.empty}><p style={{ fontSize: "48px" }}>📋</p><p style={styles.emptyText}>No prescriptions</p></div>
                  ) : (
                    sortedPrescriptions.map((p) => {
                      const statusStyle = getStatusColor(p.status);
                      return (
                        <div key={p.id} style={styles.card}>
                          <div style={{ flexShrink: 0 }}>
                            <img src={p.imageUrl} alt="prescription" style={{ ...styles.prescImg, cursor: "zoom-in" }} onClick={() => setSelectedImage(p.imageUrl)} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
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
                  <div style={styles.orderSortWrap}>
                    <SortBar
                      value={orderSort}
                      onChange={setOrderSort}
                      options={[
                        { value: "newest", label: "Newest" },
                        { value: "oldest", label: "Oldest" },
                      ]}
                    />
                    <SortBar
                      value={orderStatusFilter}
                      onChange={setOrderStatusFilter}
                      options={[
                        { value: "all", label: "All" },
                        { value: "pending", label: "⏳ Pending" },
                        { value: "processing", label: "🔄 Processing" },
                        { value: "delivered", label: "✅ Delivered" },
                        { value: "cancelled", label: "❌ Cancelled" },
                      ]}
                    />
                  </div>
                  {sortedOrders.length === 0 ? (
                    <div style={styles.empty}><p style={{ fontSize: "48px" }}>🛒</p><p style={styles.emptyText}>No orders</p></div>
                  ) : (
                    sortedOrders.map((o) => {
                      const statusStyle = getStatusColor(o.status);
                      const orderPrescriptions = prescriptions.filter((p) => p.orderId === o.id);
                      const userOtherPrescriptions = prescriptions.filter((p) => p.userEmail === o.userEmail && p.orderId !== o.id);
                      const isExpanded = expandedUserPresc === o.id;
                      const receiptData = {
                        id: o.id, name: o.name, phone: o.phone, address: o.address,
                        paymentMethod: o.paymentMethod, items: o.items, total: o.total,
                        subtotal: o.subtotal, discount: o.discount, note: o.note,
                        status: o.status, createdAt: o.createdAt?.toDate?.().toLocaleString(),
                      };
                      return (
                        <div key={o.id} style={styles.card}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={styles.cardHeader}>
                              <div style={{ minWidth: 0 }}>
                                <p style={styles.cardEmail}>👤 {o.name || o.userEmail}</p>
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
                                  {getMedicineEmoji(item.category)} {item.name}
                                  {item.byPiece ? " (Piece)" : item.unit_size > 1 ? ` (${item.unit})` : ""}
                                  {" "}×{item.quantity} — ৳{(parseFloat(item.price) * item.quantity).toFixed(2)}
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
                            </div>
                            <div style={styles.btnRow}>
                              <button onClick={() => updateOrderStatus(o.id, "processing")} style={styles.processBtn}>🔄</button>
                              <button onClick={() => updateOrderStatus(o.id, "delivered")} style={styles.approveBtn}>✅ Delivered</button>
                              <button onClick={() => updateOrderStatus(o.id, "cancelled")} style={styles.rejectBtn}>❌</button>
                            </div>
                            <div style={styles.btnRow}>
                              <button onClick={() => printReceipt(receiptData)} style={styles.printBtn}>🖨️ Print</button>
                              <button onClick={() => downloadReceipt(receiptData)} style={styles.downloadBtn}>📥 PDF</button>
                              <button onClick={() => whatsappReceipt(receiptData)} style={styles.whatsappBtn}>💬 WA</button>
                              {userOtherPrescriptions.length > 0 && (
                                <button onClick={() => setExpandedUserPresc(isExpanded ? null : o.id)} style={styles.morePrescBtn}>
                                  📋 {isExpanded ? "Hide" : `+${userOtherPrescriptions.length} Rx`}
                                </button>
                              )}
                            </div>
                            {isExpanded && (
                              <div style={styles.userPrescBlock}>
                                <p style={styles.prescBlockLabel}>📋 All other Rx from {o.userEmail}</p>
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
                      <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                        {inventory.length} medicines • Prices override CSV
                      </p>
                      {lowStockItems.length > 0 && (
                        <p style={{ fontSize: "12px", color: "#ea580c", margin: "4px 0 0 0", fontWeight: "600" }}>
                          ⚠️ {lowStockItems.length} low stock (≤{LOW_STOCK_THRESHOLD})
                        </p>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={invSearch}
                      onChange={(e) => setInvSearch(e.target.value)}
                      style={styles.invSearchInput}
                    />
                  </div>
                  {inventory.length === 0 ? (
                    <div style={styles.empty}>
                      <p style={{ fontSize: "48px" }}>📦</p>
                      <p style={styles.emptyText}>No inventory yet</p>
                      <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "8px" }}>Go to POS → add medicine → ✏️ to set price & stock</p>
                    </div>
                  ) : (
                    <div style={styles.invGrid}>
                      {filteredInventory.map((item) => {
                        const isLow = (item.stock || 0) <= LOW_STOCK_THRESHOLD;
                        const isEditing = editingInv?.id === item.id;
                        return (
                          <div key={item.id} style={{ ...styles.invCard, border: isLow ? "1.5px solid #fed7aa" : "1px solid #e2e8f0" }}>
                            <div style={styles.invCardTop}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                <span style={{ fontSize: "22px", flexShrink: 0 }}>{getMedicineEmoji(item.category_name)}</span>
                                <div style={{ minWidth: 0 }}>
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
                                  <p style={styles.invStatLabel}>Stock</p>
                                </div>
                                <div style={styles.invActions}>
                                  <button onClick={() => { setEditingInv(item); setEditInvPrice(item.price); setEditInvStock(item.stock || 0); }} style={styles.invEditBtn}>✏️</button>
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
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ ...styles.cardEmail, wordBreak: "break-all" }}>👤 {u.email}</p>
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
        <div onClick={() => setSelectedImage(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999, cursor: "zoom-out", padding: "20px" }}>
          <img src={selectedImage} alt="full prescription" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: "12px", objectFit: "contain" }} />
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "16px" }}>Tap anywhere to close</p>
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          .tab-full { display: none !important; }
          .tab-short { display: inline !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Inter', sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "linear-gradient(135deg, #0f172a, #1e293b)", position: "sticky", top: 0, zIndex: 100 },
  title: { color: "white", fontSize: "20px", fontWeight: "800", margin: 0 },
  subtitle: { color: "rgba(255,255,255,0.6)", fontSize: "12px", margin: "2px 0 0 0" },
  closeBtn: { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: "14px", fontWeight: "700", cursor: "pointer", borderRadius: "10px", padding: "8px 14px" },
  body: { maxWidth: "900px", margin: "0 auto", padding: "16px 12px" },
  statsRow: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" },
  statCard: { flex: 1, minWidth: "60px", backgroundColor: "#eff6ff", borderRadius: "12px", padding: "12px 8px", textAlign: "center" },
  statNum: { fontSize: "20px", fontWeight: "800", color: "#1e40af", margin: 0 },
  statLabel: { fontSize: "11px", color: "#64748b", margin: "2px 0 0 0", fontWeight: "600" },
  tabs: { display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "nowrap", overflowX: "auto" },
  tab: { padding: "9px 14px", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s", position: "relative", whiteSpace: "nowrap", flexShrink: 0 },
  tabBadge: { padding: "2px 6px", borderRadius: "50px", fontSize: "11px", fontWeight: "700" },
  alertDot: { width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ea580c", position: "absolute", top: "6px", right: "6px" },
  content: { backgroundColor: "white", borderRadius: "16px", padding: "16px", border: "1px solid #e2e8f0", minHeight: "300px" },
  loading: { textAlign: "center", padding: "60px", color: "#94a3b8" },
  empty: { textAlign: "center", padding: "40px 20px" },
  emptyText: { fontSize: "16px", fontWeight: "600", color: "#94a3b8" },
  // Sort bar
  sortBar: { display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" },
  sortBtn: { padding: "6px 12px", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  orderSortWrap: { marginBottom: "14px", display: "flex", flexDirection: "column", gap: "6px" },
  // Cards
  card: { display: "flex", gap: "12px", backgroundColor: "#f8fafc", borderRadius: "14px", padding: "14px", marginBottom: "10px", border: "1px solid #e2e8f0" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px", gap: "8px" },
  cardEmail: { fontWeight: "700", color: "#1e293b", fontSize: "14px", margin: 0, wordBreak: "break-all" },
  cardDetail: { fontSize: "12px", color: "#64748b", margin: "3px 0" },
  cardNote: { fontSize: "12px", color: "#1e293b", backgroundColor: "white", padding: "6px 10px", borderRadius: "8px", margin: "6px 0", border: "1px solid #e2e8f0" },
  statusBadge: { padding: "3px 10px", borderRadius: "50px", fontSize: "11px", fontWeight: "700", textTransform: "capitalize", whiteSpace: "nowrap", flexShrink: 0 },
  prescImg: { width: "80px", height: "80px", objectFit: "cover", borderRadius: "10px", border: "2px solid #e2e8f0", display: "block" },
  btnRow: { display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" },
  approveBtn: { padding: "6px 12px", backgroundColor: "#dcfce7", color: "#16a34a", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  rejectBtn: { padding: "6px 12px", backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  processBtn: { padding: "6px 12px", backgroundColor: "#eff6ff", color: "#2563eb", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  printBtn: { padding: "6px 12px", backgroundColor: "#f1f5f9", color: "#1e293b", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  downloadBtn: { padding: "6px 12px", backgroundColor: "#eff6ff", color: "#2563eb", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  whatsappBtn: { padding: "6px 12px", backgroundColor: "#dcfce7", color: "#16a34a", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  morePrescBtn: { padding: "6px 12px", backgroundColor: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  prescBlock: { backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "10px", marginBottom: "10px" },
  userPrescBlock: { backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "10px", marginTop: "8px" },
  prescBlockLabel: { fontSize: "11px", fontWeight: "700", color: "#374151", margin: "0 0 8px 0" },
  prescRow: { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-start" },
  prescDot: { position: "absolute", top: "4px", right: "4px", width: "10px", height: "10px", borderRadius: "50%", border: "2px solid white" },
  prescActions: { display: "flex", gap: "4px", marginTop: "4px" },
  prescApprove: { padding: "3px 6px", backgroundColor: "#dcfce7", color: "#16a34a", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  prescReject: { padding: "3px 6px", backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  itemsList: { backgroundColor: "white", borderRadius: "10px", padding: "8px 10px", margin: "6px 0", border: "1px solid #f1f5f9" },
  orderItem: { fontSize: "12px", color: "#1e293b", margin: "3px 0", fontWeight: "500" },
  orderFooter: { marginTop: "8px" },
  orderTotal: { fontSize: "16px", color: "#1e40af" },
  userAvatar: { width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#1e40af", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "800", flexShrink: 0 },
  // Inventory
  invTopBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap", gap: "10px" },
  invSearchInput: { padding: "9px 12px", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "14px", outline: "none", width: "180px", fontFamily: "Inter, sans-serif" },
  invGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" },
  invCard: { backgroundColor: "#f8fafc", borderRadius: "12px", padding: "12px" },
  invCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" },
  invName: { fontSize: "13px", fontWeight: "700", color: "#1e293b", margin: 0, wordBreak: "break-word" },
  invGeneric: { fontSize: "10px", color: "#94a3b8", margin: "2px 0 0 0" },
  lowBadge: { backgroundColor: "#fff7ed", color: "#ea580c", fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "50px", whiteSpace: "nowrap", flexShrink: 0 },
  invStatsRow: { display: "flex", gap: "6px", alignItems: "center" },
  invStat: { flex: 1, backgroundColor: "#eff6ff", borderRadius: "8px", padding: "6px 8px", textAlign: "center" },
  invStatNum: { fontSize: "15px", fontWeight: "800", color: "#1e40af", margin: 0 },
  invStatLabel: { fontSize: "10px", color: "#94a3b8", margin: "1px 0 0 0", fontWeight: "600" },
  invActions: { display: "flex", gap: "4px" },
  invEditBtn: { padding: "6px 10px", backgroundColor: "#eff6ff", color: "#2563eb", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  invDeleteBtn: { padding: "6px 8px", backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" },
  invEditRow: { display: "flex", gap: "6px", alignItems: "flex-end" },
  invEditLabel: { display: "block", fontSize: "10px", fontWeight: "600", color: "#374151", marginBottom: "3px" },
  invEditInput: { width: "100%", padding: "7px 8px", borderRadius: "8px", border: "2px solid #2563eb", fontSize: "13px", outline: "none", boxSizing: "border-box", fontWeight: "600" },
  invSaveBtn: { padding: "7px 10px", backgroundColor: "#1e40af", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  invCancelBtn: { padding: "7px 8px", backgroundColor: "#f1f5f9", color: "#64748b", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" },
  deniedPage: { minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  deniedBox: { backgroundColor: "white", borderRadius: "24px", padding: "40px 28px", textAlign: "center", maxWidth: "400px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" },
  deniedIcon: { fontSize: "56px", marginBottom: "12px" },
  deniedTitle: { fontSize: "24px", fontWeight: "800", color: "#dc2626", marginBottom: "10px" },
  deniedText: { color: "#64748b", fontSize: "14px", marginBottom: "24px" },
  deniedBtn: { padding: "12px 28px", backgroundColor: "#f1f5f9", color: "#1e293b", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: "pointer" },
};

export default AdminPage;