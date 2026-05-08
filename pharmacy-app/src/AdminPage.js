import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { collection, getDocs, updateDoc, doc, deleteDoc, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { getMedicineEmoji } from "./medicineUtils";
import { downloadReceipt, printReceipt, whatsappReceipt } from "./Receipt";
import AddMedicineModal from "./AddMedicineModal";
import Papa from "papaparse";

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

  // Prescription sorting & filtering
  const [prescSort, setPrescSort] = useState("newest");
  const [prescStatusFilter, setPrescStatusFilter] = useState("all");
  const [prescSearch, setPrescSearch] = useState("");

  // Order sorting & filtering
  const [orderSort, setOrderSort] = useState("newest");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("all");

  // User sorting & filtering
  const [userSort, setUserSort] = useState("newest");
  const [userSearch, setUserSearch] = useState("");

  // Inventory
  const [editingInv, setEditingInv] = useState(null);
  const [editInvPrice, setEditInvPrice] = useState("");
  const [editInvStock, setEditInvStock] = useState("");
  const [invSearch, setInvSearch] = useState("");
  const [savingInv, setSavingInv] = useState(false);
  const [invStockFilter, setInvStockFilter] = useState("all");

  // ── Edit Medicine tab ──────────────────────────────────────────
  const [allCsvMedicines, setAllCsvMedicines] = useState([]);
  const [editMedSearch, setEditMedSearch] = useState("");
  const [editMedResults, setEditMedResults] = useState([]);
  const [selectedMed, setSelectedMed] = useState(null);  // medicine being edited
  const [editMedData, setEditMedData] = useState({
    price: "", stock: "", unit: "", barcode: "",
  });
  const [savingMed, setSavingMed] = useState(false);
  const [savedMed, setSavedMed] = useState(false);
  const [showAddMedicine, setShowAddMedicine] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u && u.email === ADMIN_EMAIL) fetchData();
      else setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load CSV for medicine edit search
  useEffect(() => {
    Papa.parse("/medicines.csv", {
      download: true,
      header: true,
      complete: (result) => {
        setAllCsvMedicines(result.data.filter((m) => m.medicine_name));
      },
    });
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

  // ── Edit Medicine search ───────────────────────────────────────
  useEffect(() => {
    if (editMedSearch.trim().length < 2) { setEditMedResults([]); return; }
    const q = editMedSearch.toLowerCase();
    const results = allCsvMedicines.filter((m) =>
      m.medicine_name?.toLowerCase().includes(q) ||
      m.generic_name?.toLowerCase().includes(q) ||
      m.category_name?.toLowerCase().includes(q)
    ).slice(0, 20);
    setEditMedResults(results);
  }, [editMedSearch, allCsvMedicines]);

  async function selectMedicineToEdit(med) {
    setSelectedMed(med);
    setEditMedResults([]);
    setEditMedSearch("");
    setSavedMed(false);
    // Load existing inventory data if present
    try {
      const invSnap = await getDoc(doc(db, "inventory", med.slug));
      if (invSnap.exists()) {
        const d = invSnap.data();
        setEditMedData({
          price: d.price ?? med.price ?? "",
          stock: d.stock ?? "",
          unit: d.unit ?? med.unit ?? "",
          barcode: d.barcode ?? "",
        });
      } else {
        setEditMedData({
          price: med.price ?? "",
          stock: "",
          unit: med.unit ?? "",
          barcode: "",
        });
      }
    } catch (err) {
      setEditMedData({ price: med.price ?? "", stock: "", unit: med.unit ?? "", barcode: "" });
    }
  }

  async function saveMedicineEdit() {
    if (!selectedMed) return;
    setSavingMed(true);
    try {
      const invRef = doc(db, "inventory", selectedMed.slug);
      const invSnap = await getDoc(invRef);
      const payload = {
        slug: selectedMed.slug,
        medicine_name: selectedMed.medicine_name,
        generic_name: selectedMed.generic_name,
        category_name: selectedMed.category_name,
        strength: selectedMed.strength || "",
        manufacturer_name: selectedMed.manufacturer_name || "",
        unit: editMedData.unit.trim() || selectedMed.unit || "",
        unit_size: selectedMed.unit_size || "",
        price: parseFloat(editMedData.price).toFixed(2),
        stock: parseInt(editMedData.stock) || 0,
        barcode: editMedData.barcode.trim(),
        updatedAt: serverTimestamp(),
      };
      if (invSnap.exists()) {
        await updateDoc(invRef, payload);
      } else {
        await setDoc(invRef, payload);
      }
      // Refresh local inventory list
      setInventory((prev) => {
        const exists = prev.find((i) => i.id === selectedMed.slug);
        if (exists) return prev.map((i) => i.id === selectedMed.slug ? { ...i, ...payload, id: selectedMed.slug } : i);
        return [...prev, { ...payload, id: selectedMed.slug }];
      });
      setSavedMed(true);
    } catch (err) { console.error(err); }
    setSavingMed(false);
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
    if (prescStatusFilter !== "all") list = list.filter(p => p.status === prescStatusFilter);
    if (prescSearch.trim()) {
      const q = prescSearch.toLowerCase();
      list = list.filter(p =>
        p.userEmail?.toLowerCase().includes(q) ||
        p.note?.toLowerCase().includes(q)
      );
    }
    list = sortByDate(list, "uploadedAt", prescSort);
    return list;
  })();

  const sortedOrders = (() => {
    let list = [...orders];
    if (orderStatusFilter !== "all") list = list.filter(o => o.status === orderStatusFilter);
    if (orderPaymentFilter !== "all") list = list.filter(o => o.paymentMethod === orderPaymentFilter);
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      list = list.filter(o =>
        o.name?.toLowerCase().includes(q) ||
        o.userEmail?.toLowerCase().includes(q) ||
        o.phone?.includes(q) ||
        o.id?.toLowerCase().includes(q)
      );
    }
    list = sortByDate(list, "createdAt", orderSort);
    return list;
  })();

  const sortedUsers = (() => {
    let list = [...users];
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      list = list.filter(u => u.email?.toLowerCase().includes(q));
    }
    list = sortByDate(list, "createdAt", userSort);
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

  const filteredInventory = (() => {
    let list = inventory.filter((item) =>
      item.medicine_name?.toLowerCase().includes(invSearch.toLowerCase()) ||
      item.generic_name?.toLowerCase().includes(invSearch.toLowerCase())
    );
    if (invStockFilter === "low") list = list.filter(i => (i.stock || 0) <= LOW_STOCK_THRESHOLD);
    if (invStockFilter === "ok") list = list.filter(i => (i.stock || 0) > LOW_STOCK_THRESHOLD);
    return list;
  })();

  const tabs = [
    { id: "prescriptions", label: "📋", fullLabel: "📋 Prescriptions", count: prescriptions.length, alert: pendingPrescriptions > 0 },
    { id: "orders", label: "🛒", fullLabel: "🛒 Orders", count: orders.length, alert: pendingOrders > 0 },
    { id: "inventory", label: "📦", fullLabel: "📦 Inventory", count: inventory.length, alert: lowStockItems.length > 0 },
    { id: "editMedicine", label: "✏️", fullLabel: "✏️ Edit Medicine", count: null },
    { id: "users", label: "👤", fullLabel: "👤 Users", count: users.length },
  ];

  const PillFilter = ({ label, value, onChange, options }) => (
    <div style={styles.filterGroup}>
      {label && <span style={styles.filterLabel}>{label}</span>}
      <div style={styles.pillRow}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              ...styles.pill,
              backgroundColor: value === opt.value ? "#1e40af" : "#f1f5f9",
              color: value === opt.value ? "white" : "#64748b",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  const SearchBar = ({ value, onChange, placeholder }) => (
    <input
      type="text"
      placeholder={placeholder || "Search..."}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={styles.searchBar}
    />
  );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🔧 Admin</h1>
          <p style={styles.subtitle}>Sardar Pharmacy</p>
        </div>
        <div style={styles.headerRight}>
          <button onClick={fetchData} style={styles.refreshBtn}>🔄</button>
          <button onClick={() => window.close()} style={styles.closeBtn}>✕</button>
        </div>
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
              {tab.count !== null && (
                <span style={{ ...styles.tabBadge, backgroundColor: activeTab === tab.id ? "rgba(255,255,255,0.3)" : "#e2e8f0", color: activeTab === tab.id ? "white" : "#64748b" }}>
                  {tab.count}
                </span>
              )}
              {tab.alert && <span style={styles.alertDot} />}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}><p style={{ fontSize: "48px" }}>⏳</p><p>Loading...</p></div>
          ) : (
            <>
              {/* ── Prescriptions Tab ── */}
              {activeTab === "prescriptions" && (
                <div>
                  <div style={styles.filterPanel}>
                    <SearchBar value={prescSearch} onChange={setPrescSearch} placeholder="Search by email or note..." />
                    <PillFilter
                      label="Status"
                      value={prescStatusFilter}
                      onChange={setPrescStatusFilter}
                      options={[
                        { value: "all", label: "All" },
                        { value: "pending", label: "⏳ Pending" },
                        { value: "approved", label: "✅ Approved" },
                        { value: "rejected", label: "❌ Rejected" },
                      ]}
                    />
                    <PillFilter
                      label="Sort"
                      value={prescSort}
                      onChange={setPrescSort}
                      options={[
                        { value: "newest", label: "Newest" },
                        { value: "oldest", label: "Oldest" },
                      ]}
                    />
                    <p style={styles.resultCount}>{sortedPrescriptions.length} result{sortedPrescriptions.length !== 1 ? "s" : ""}</p>
                  </div>

                  {sortedPrescriptions.length === 0 ? (
                    <div style={styles.empty}><p style={{ fontSize: "48px" }}>📋</p><p style={styles.emptyText}>No prescriptions found</p></div>
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

              {/* ── Orders Tab ── */}
              {activeTab === "orders" && (
                <div>
                  <div style={styles.filterPanel}>
                    <SearchBar value={orderSearch} onChange={setOrderSearch} placeholder="Search name, phone, order ID..." />
                    <PillFilter
                      label="Status"
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
                    <PillFilter
                      label="Payment"
                      value={orderPaymentFilter}
                      onChange={setOrderPaymentFilter}
                      options={[
                        { value: "all", label: "All" },
                        { value: "cash", label: "💵 Cash" },
                        { value: "bkash", label: "📱 bKash" },
                        { value: "nagad", label: "📱 Nagad" },
                        { value: "card", label: "💳 Card" },
                      ]}
                    />
                    <PillFilter
                      label="Sort"
                      value={orderSort}
                      onChange={setOrderSort}
                      options={[
                        { value: "newest", label: "Newest" },
                        { value: "oldest", label: "Oldest" },
                      ]}
                    />
                    <p style={styles.resultCount}>{sortedOrders.length} result{sortedOrders.length !== 1 ? "s" : ""}</p>
                  </div>

                  {sortedOrders.length === 0 ? (
                    <div style={styles.empty}><p style={{ fontSize: "48px" }}>🛒</p><p style={styles.emptyText}>No orders found</p></div>
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
                              <button onClick={() => updateOrderStatus(o.id, "processing")} style={styles.processBtn}>🔄 Processing</button>
                              <button onClick={() => updateOrderStatus(o.id, "delivered")} style={styles.approveBtn}>✅ Delivered</button>
                              <button onClick={() => updateOrderStatus(o.id, "cancelled")} style={styles.rejectBtn}>❌ Cancel</button>
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

              {/* ── Inventory Tab ── */}
              {activeTab === "inventory" && (
                <div>
                  <div style={styles.filterPanel}>
                    <SearchBar value={invSearch} onChange={setInvSearch} placeholder="Search medicine..." />
                    <PillFilter
                      label="Stock"
                      value={invStockFilter}
                      onChange={setInvStockFilter}
                      options={[
                        { value: "all", label: "All" },
                        { value: "low", label: "⚠️ Low" },
                        { value: "ok", label: "✅ OK" },
                      ]}
                    />
                    <p style={styles.resultCount}>
                      {filteredInventory.length} medicine{filteredInventory.length !== 1 ? "s" : ""}
                      {lowStockItems.length > 0 && <span style={{ color: "#ea580c", marginLeft: "8px" }}>• {lowStockItems.length} low stock</span>}
                    </p>
                  </div>
                  {filteredInventory.length === 0 ? (
                    <div style={styles.empty}>
                      <p style={{ fontSize: "48px" }}>📦</p>
                      <p style={styles.emptyText}>No inventory found</p>
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
                                  {item.barcode && <p style={styles.invBarcode}>🔖 {item.barcode}</p>}
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

              {/* ── Edit Medicine Tab ── */}
              {activeTab === "editMedicine" && (
                <div>
                  <div style={styles.editMedHeader}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <h3 style={styles.editMedTitle}>✏️ Edit Any Medicine</h3>
                        <p style={styles.editMedSub}>Search from all 20,000+ medicines, update price, stock, unit and barcode. Changes reflect instantly on the customer page and POS.</p>
                      </div>
                      <button
                        style={styles.addNewMedBtn}
                        onClick={() => setShowAddMedicine(true)}
                      >
                        ➕ Add New Medicine
                      </button>
                    </div>
                  </div>

                  {/* Search */}
                  <div style={{ position: "relative", marginBottom: "20px" }}>
                    <input
                      type="text"
                      placeholder="🔍 Search medicine by name, generic or category..."
                      value={editMedSearch}
                      onChange={(e) => { setEditMedSearch(e.target.value); setSelectedMed(null); setSavedMed(false); }}
                      style={styles.editMedSearchInput}
                      autoFocus
                    />
                    {editMedResults.length > 0 && (
                      <div style={styles.editMedDropdown}>
                        {editMedResults.map((med, i) => (
                          <button key={i} style={styles.editMedDropdownItem} onClick={() => selectMedicineToEdit(med)}>
                            <span style={{ fontSize: "20px", minWidth: "28px" }}>{getMedicineEmoji(med.category_name)}</span>
                            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                              <p style={{ margin: 0, fontWeight: "700", fontSize: "13px", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{med.medicine_name}</p>
                              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>{med.generic_name} • {med.strength} • {med.category_name}</p>
                            </div>
                            <span style={{ fontSize: "13px", fontWeight: "800", color: "#1e40af", flexShrink: 0 }}>৳{med.price}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Edit Form */}
                  {selectedMed ? (
                    <div style={styles.editMedForm}>
                      {/* Medicine Info Header */}
                      <div style={styles.editMedInfo}>
                        <span style={{ fontSize: "32px" }}>{getMedicineEmoji(selectedMed.category_name)}</span>
                        <div>
                          <p style={styles.editMedName}>{selectedMed.medicine_name}</p>
                          <p style={styles.editMedGeneric}>{selectedMed.generic_name} • {selectedMed.strength} • {selectedMed.category_name}</p>
                          <p style={styles.editMedMfg}>🏭 {selectedMed.manufacturer_name}</p>
                        </div>
                      </div>

                      {/* Fields */}
                      <div style={styles.editMedFields}>
                        <div style={styles.editMedField}>
                          <label style={styles.editMedLabel}>💰 Price (৳)</label>
                          <p style={styles.editMedHint}>Strip / pack price shown to customers</p>
                          <input
                            type="number" min="0" step="0.01"
                            value={editMedData.price}
                            onChange={(e) => setEditMedData((d) => ({ ...d, price: e.target.value }))}
                            style={styles.editMedInput}
                            placeholder="e.g. 12.50"
                          />
                        </div>

                        <div style={styles.editMedField}>
                          <label style={styles.editMedLabel}>📦 Stock Quantity</label>
                          <p style={styles.editMedHint}>Number of units currently available</p>
                          <input
                            type="number" min="0"
                            value={editMedData.stock}
                            onChange={(e) => setEditMedData((d) => ({ ...d, stock: e.target.value }))}
                            style={styles.editMedInput}
                            placeholder="e.g. 100"
                          />
                        </div>

                        <div style={styles.editMedField}>
                          <label style={styles.editMedLabel}>🏷️ Unit Label</label>
                          <p style={styles.editMedHint}>e.g. Tablet, Capsule, Syrup, Cream</p>
                          <input
                            type="text"
                            value={editMedData.unit}
                            onChange={(e) => setEditMedData((d) => ({ ...d, unit: e.target.value }))}
                            style={styles.editMedInput}
                            placeholder={selectedMed.unit || "e.g. Tablet"}
                          />
                        </div>

                        <div style={styles.editMedField}>
                          <label style={styles.editMedLabel}>🔖 Barcode</label>
                          <p style={styles.editMedHint}>Scan barcode or enter manually for POS lookup</p>
                          <input
                            type="text"
                            value={editMedData.barcode}
                            onChange={(e) => setEditMedData((d) => ({ ...d, barcode: e.target.value }))}
                            style={styles.editMedInput}
                            placeholder="e.g. 8901234567890"
                          />
                        </div>
                      </div>

                      {/* Save */}
                      <div style={styles.editMedActions}>
                        <button onClick={() => { setSelectedMed(null); setSavedMed(false); }} style={styles.editMedCancelBtn}>← Back to Search</button>
                        <button onClick={saveMedicineEdit} disabled={savingMed} style={styles.editMedSaveBtn}>
                          {savingMed ? "Saving..." : "💾 Save Changes"}
                        </button>
                      </div>

                      {savedMed && (
                        <div style={styles.savedBanner}>
                          ✅ Saved! Price, stock, unit and barcode updated. Changes are now live on the customer page and POS.
                        </div>
                      )}
                    </div>
                  ) : (
                    !editMedSearch && (
                      <div style={styles.editMedEmpty}>
                        <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🔍</p>
                        <p style={{ fontSize: "15px", fontWeight: "600", color: "#64748b" }}>Search for a medicine above to edit it</p>
                        <p style={{ fontSize: "13px", color: "#94a3b8" }}>You can update price, stock, unit label and barcode for any medicine</p>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* ── Users Tab ── */}
              {activeTab === "users" && (
                <div>
                  <div style={styles.filterPanel}>
                    <SearchBar value={userSearch} onChange={setUserSearch} placeholder="Search by email..." />
                    <PillFilter
                      label="Sort"
                      value={userSort}
                      onChange={setUserSort}
                      options={[
                        { value: "newest", label: "Newest First" },
                        { value: "oldest", label: "Oldest First" },
                      ]}
                    />
                    <p style={styles.resultCount}>{sortedUsers.length} user{sortedUsers.length !== 1 ? "s" : ""}</p>
                  </div>
                  {sortedUsers.length === 0 ? (
                    <div style={styles.empty}><p style={{ fontSize: "48px" }}>👤</p><p style={styles.emptyText}>No users found</p></div>
                  ) : (
                    sortedUsers.map((u) => {
                      const userOrders = orders.filter(o => o.userEmail === u.email);
                      const userSpend = userOrders.filter(o => o.status === "delivered").reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
                      return (
                        <div key={u.id} style={{ ...styles.card, alignItems: "center" }}>
                          <div style={styles.userAvatar}>{u.email?.charAt(0).toUpperCase()}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ ...styles.cardEmail, wordBreak: "break-all" }}>👤 {u.email}</p>
                            <p style={styles.cardDetail}>📅 Joined: {u.createdAt?.toDate?.().toLocaleString()}</p>
                            <div style={styles.userStats}>
                              <span style={styles.userStatPill}>🛒 {userOrders.length} orders</span>
                              {userSpend > 0 && <span style={{ ...styles.userStatPill, backgroundColor: "#f0fdf4", color: "#16a34a" }}>৳{userSpend.toFixed(0)} spent</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add New Medicine Modal */}
      {showAddMedicine && (
        <AddMedicineModal
          onClose={() => setShowAddMedicine(false)}
          onAdded={(med) => {
            setShowAddMedicine(false);
            // Add to local inventory list so it appears in Inventory tab immediately
            setInventory((prev) => {
              const exists = prev.find((i) => i.id === med.id);
              if (exists) return prev.map((i) => i.id === med.id ? { ...i, ...med } : i);
              return [...prev, med];
            });
          }}
        />
      )}

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
        @media (min-width: 601px) {
          .tab-short { display: none !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Inter', sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "linear-gradient(135deg, #0f172a, #1e293b)", position: "sticky", top: 0, zIndex: 100 },
  title: { color: "white", fontSize: "18px", fontWeight: "800", margin: 0 },
  subtitle: { color: "rgba(255,255,255,0.6)", fontSize: "11px", margin: "2px 0 0 0" },
  headerRight: { display: "flex", gap: "8px", alignItems: "center" },
  refreshBtn: { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: "14px", cursor: "pointer", borderRadius: "10px", padding: "7px 12px" },
  closeBtn: { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: "14px", fontWeight: "700", cursor: "pointer", borderRadius: "10px", padding: "7px 12px" },
  body: { maxWidth: "900px", margin: "0 auto", padding: "12px 10px" },
  statsRow: { display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" },
  statCard: { flex: "1 1 55px", backgroundColor: "#eff6ff", borderRadius: "10px", padding: "10px 6px", textAlign: "center" },
  statNum: { fontSize: "18px", fontWeight: "800", color: "#1e40af", margin: 0 },
  statLabel: { fontSize: "10px", color: "#64748b", margin: "2px 0 0 0", fontWeight: "600" },
  tabs: { display: "flex", gap: "5px", marginBottom: "12px", flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch" },
  tab: { padding: "9px 12px", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "5px", transition: "all 0.2s", position: "relative", whiteSpace: "nowrap", flexShrink: 0 },
  tabBadge: { padding: "2px 6px", borderRadius: "50px", fontSize: "11px", fontWeight: "700" },
  alertDot: { width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#ea580c", position: "absolute", top: "5px", right: "5px" },
  content: { backgroundColor: "white", borderRadius: "14px", padding: "14px", border: "1px solid #e2e8f0", minHeight: "300px" },
  loading: { textAlign: "center", padding: "60px", color: "#94a3b8" },
  empty: { textAlign: "center", padding: "40px 20px" },
  emptyText: { fontSize: "15px", fontWeight: "600", color: "#94a3b8" },

  filterPanel: { backgroundColor: "#f8fafc", borderRadius: "12px", padding: "12px", marginBottom: "14px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "10px" },
  filterGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  filterLabel: { fontSize: "11px", fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px" },
  pillRow: { display: "flex", gap: "5px", flexWrap: "wrap" },
  pill: { padding: "5px 11px", border: "none", borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" },
  searchBar: { width: "100%", padding: "10px 12px", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" },
  resultCount: { fontSize: "12px", color: "#94a3b8", margin: 0, fontWeight: "600" },

  card: { display: "flex", gap: "10px", backgroundColor: "#f8fafc", borderRadius: "12px", padding: "12px", marginBottom: "8px", border: "1px solid #e2e8f0" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "5px", gap: "8px" },
  cardEmail: { fontWeight: "700", color: "#1e293b", fontSize: "13px", margin: 0, wordBreak: "break-all" },
  cardDetail: { fontSize: "12px", color: "#64748b", margin: "3px 0" },
  cardNote: { fontSize: "12px", color: "#1e293b", backgroundColor: "white", padding: "6px 10px", borderRadius: "8px", margin: "5px 0", border: "1px solid #e2e8f0" },
  statusBadge: { padding: "3px 10px", borderRadius: "50px", fontSize: "11px", fontWeight: "700", textTransform: "capitalize", whiteSpace: "nowrap", flexShrink: 0 },
  prescImg: { width: "72px", height: "72px", objectFit: "cover", borderRadius: "10px", border: "2px solid #e2e8f0", display: "block" },
  btnRow: { display: "flex", gap: "5px", marginTop: "8px", flexWrap: "wrap" },
  approveBtn: { padding: "7px 12px", backgroundColor: "#dcfce7", color: "#16a34a", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  rejectBtn: { padding: "7px 12px", backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  processBtn: { padding: "7px 12px", backgroundColor: "#eff6ff", color: "#2563eb", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  printBtn: { padding: "7px 12px", backgroundColor: "#f1f5f9", color: "#1e293b", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  downloadBtn: { padding: "7px 12px", backgroundColor: "#eff6ff", color: "#2563eb", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  whatsappBtn: { padding: "7px 12px", backgroundColor: "#dcfce7", color: "#16a34a", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  morePrescBtn: { padding: "7px 12px", backgroundColor: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },
  prescBlock: { backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "10px", marginBottom: "8px" },
  userPrescBlock: { backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "10px", marginTop: "8px" },
  prescBlockLabel: { fontSize: "11px", fontWeight: "700", color: "#374151", margin: "0 0 8px 0" },
  prescRow: { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-start" },
  prescDot: { position: "absolute", top: "4px", right: "4px", width: "10px", height: "10px", borderRadius: "50%", border: "2px solid white" },
  prescActions: { display: "flex", gap: "4px", marginTop: "4px" },
  prescApprove: { padding: "3px 6px", backgroundColor: "#dcfce7", color: "#16a34a", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  prescReject: { padding: "3px 6px", backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  itemsList: { backgroundColor: "white", borderRadius: "10px", padding: "8px 10px", margin: "5px 0", border: "1px solid #f1f5f9" },
  orderItem: { fontSize: "12px", color: "#1e293b", margin: "3px 0", fontWeight: "500" },
  orderFooter: { marginTop: "8px" },
  orderTotal: { fontSize: "15px", color: "#1e40af" },
  userAvatar: { width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#1e40af", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "800", flexShrink: 0 },
  userStats: { display: "flex", gap: "6px", marginTop: "5px", flexWrap: "wrap" },
  userStatPill: { fontSize: "11px", fontWeight: "600", backgroundColor: "#eff6ff", color: "#2563eb", padding: "3px 8px", borderRadius: "20px" },

  // Inventory
  invGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px" },
  invCard: { backgroundColor: "#f8fafc", borderRadius: "12px", padding: "11px" },
  invCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" },
  invName: { fontSize: "12px", fontWeight: "700", color: "#1e293b", margin: 0, wordBreak: "break-word" },
  invGeneric: { fontSize: "10px", color: "#94a3b8", margin: "2px 0 0 0" },
  invBarcode: { fontSize: "10px", color: "#6366f1", margin: "2px 0 0 0", fontFamily: "monospace" },
  lowBadge: { backgroundColor: "#fff7ed", color: "#ea580c", fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "50px", whiteSpace: "nowrap", flexShrink: 0 },
  invStatsRow: { display: "flex", gap: "5px", alignItems: "center" },
  invStat: { flex: 1, backgroundColor: "#eff6ff", borderRadius: "8px", padding: "5px 7px", textAlign: "center" },
  invStatNum: { fontSize: "14px", fontWeight: "800", color: "#1e40af", margin: 0 },
  invStatLabel: { fontSize: "10px", color: "#94a3b8", margin: "1px 0 0 0", fontWeight: "600" },
  invActions: { display: "flex", gap: "4px" },
  invEditBtn: { padding: "6px 8px", backgroundColor: "#eff6ff", color: "#2563eb", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  invDeleteBtn: { padding: "6px 7px", backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" },
  invEditRow: { display: "flex", gap: "5px", alignItems: "flex-end" },
  invEditLabel: { display: "block", fontSize: "10px", fontWeight: "600", color: "#374151", marginBottom: "3px" },
  invEditInput: { width: "100%", padding: "7px 8px", borderRadius: "8px", border: "2px solid #2563eb", fontSize: "13px", outline: "none", boxSizing: "border-box", fontWeight: "600" },
  invSaveBtn: { padding: "7px 10px", backgroundColor: "#1e40af", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  invCancelBtn: { padding: "7px 8px", backgroundColor: "#f1f5f9", color: "#64748b", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" },

  // Edit Medicine tab
  editMedHeader: { marginBottom: "20px" },
  addNewMedBtn: { padding: "10px 18px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 4px 10px rgba(22,163,74,0.3)" },
  editMedTitle: { fontSize: "18px", fontWeight: "800", color: "#1e293b", margin: "0 0 6px" },
  editMedSub: { fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.5" },
  editMedSearchInput: { width: "100%", padding: "13px 16px", borderRadius: "12px", border: "2px solid #2563eb", fontSize: "15px", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" },
  editMedDropdown: { position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", marginTop: "4px", overflow: "hidden", maxHeight: "300px", overflowY: "auto" },
  editMedDropdownItem: { display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "11px 14px", border: "none", borderBottom: "1px solid #f1f5f9", backgroundColor: "white", cursor: "pointer", textAlign: "left" },
  editMedForm: { backgroundColor: "#f8fafc", borderRadius: "14px", padding: "20px", border: "1px solid #e2e8f0" },
  editMedInfo: { display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "20px", padding: "14px", backgroundColor: "white", borderRadius: "12px", border: "1px solid #e2e8f0" },
  editMedName: { fontSize: "16px", fontWeight: "800", color: "#1e293b", margin: "0 0 3px" },
  editMedGeneric: { fontSize: "12px", color: "#64748b", margin: "0 0 2px" },
  editMedMfg: { fontSize: "11px", color: "#94a3b8", margin: 0 },
  editMedFields: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px", marginBottom: "20px" },
  editMedField: { display: "flex", flexDirection: "column" },
  editMedLabel: { fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "3px" },
  editMedHint: { fontSize: "11px", color: "#94a3b8", margin: "0 0 7px" },
  editMedInput: { padding: "11px 13px", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "14px", outline: "none", fontFamily: "Inter, sans-serif", fontWeight: "600", boxSizing: "border-box" },
  editMedActions: { display: "flex", gap: "10px", flexWrap: "wrap" },
  editMedCancelBtn: { padding: "11px 18px", backgroundColor: "#f1f5f9", color: "#64748b", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  editMedSaveBtn: { flex: 1, padding: "11px 18px", background: "linear-gradient(135deg, #1e40af, #2563eb)", color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" },
  savedBanner: { marginTop: "14px", padding: "12px 16px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", color: "#16a34a", fontSize: "13px", fontWeight: "600" },
  editMedEmpty: { textAlign: "center", padding: "50px 20px" },

  // Denied
  deniedPage: { minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  deniedBox: { backgroundColor: "white", borderRadius: "24px", padding: "40px 24px", textAlign: "center", maxWidth: "400px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" },
  deniedIcon: { fontSize: "56px", marginBottom: "12px" },
  deniedTitle: { fontSize: "22px", fontWeight: "800", color: "#dc2626", marginBottom: "10px" },
  deniedText: { color: "#64748b", fontSize: "14px", marginBottom: "24px" },
  deniedBtn: { padding: "12px 28px", backgroundColor: "#f1f5f9", color: "#1e293b", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: "pointer" },
};

export default AdminPage;