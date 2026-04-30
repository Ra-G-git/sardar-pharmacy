import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, where } from "firebase/firestore";
import { getMedicineEmoji, getUnitLabel, getUnitShort } from "./medicineUtils";
import { downloadReceipt, printReceipt, whatsappReceipt } from "./Receipt";
import Papa from "papaparse";

const ADMIN_EMAIL = "razeesardar@gmail.com";

function POSPage() {
  const [tab, setTab] = useState("sale");
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    Papa.parse("/medicines.csv", {
      download: true,
      header: true,
      complete: (result) => setMedicines(result.data),
    });
  }, []);

  useEffect(() => {
    if (search.length < 2) { setFiltered([]); return; }
    const results = medicines.filter((med) =>
      med.medicine_name?.toLowerCase().includes(search.toLowerCase()) ||
      med.generic_name?.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 8);
    setFiltered(results);
  }, [search, medicines]);

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab]);

  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        where("orderType", "==", "pos"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setSalesHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
    setHistoryLoading(false);
  }

  function addToCart(med) {
    setCart((prev) => {
      const exists = prev.find((item) => item.slug === med.slug);
      if (exists) {
        return prev.map((item) =>
          item.slug === med.slug ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...med, quantity: 1 }];
    });
    setSearch("");
    setFiltered([]);
  }

  function updateQty(slug, qty) {
    if (qty < 1) { setCart((prev) => prev.filter((item) => item.slug !== slug)); return; }
    setCart((prev) => prev.map((item) => item.slug === slug ? { ...item, quantity: qty } : item));
  }

  function removeFromCart(slug) {
    setCart((prev) => prev.filter((item) => item.slug !== slug));
  }

  const total = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

  async function handleCheckout() {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const ref = await addDoc(collection(db, "orders"), {
        userId: user?.uid || "pos",
        userEmail: user?.email || "pos",
        name: customerName || "Walk-in Customer",
        phone: customerPhone || "N/A",
        address: "In-store purchase",
        paymentMethod,
        orderType: "pos",
        items: cart.map((item) => ({
          name: item.medicine_name,
          category: item.category_name,
          price: item.price,
          quantity: item.quantity,
          unit: item.unit,
          unit_size: item.unit_size,
          strength: item.strength,
        })),
        total: total.toFixed(2),
        status: "delivered",
        createdAt: serverTimestamp(),
      });

      const order = {
        id: ref.id,
        name: customerName || "Walk-in Customer",
        phone: customerPhone || "N/A",
        address: "In-store purchase",
        paymentMethod,
        items: cart.map((item) => ({
          name: item.medicine_name,
          category: item.category_name,
          price: item.price,
          quantity: item.quantity,
          unit: item.unit,
          unit_size: item.unit_size,
          strength: item.strength,
        })),
        total: total.toFixed(2),
        status: "delivered",
        createdAt: new Date().toLocaleString(),
      };

      setLastOrder(order);
      setSuccess(true);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function newSale() {
    setSuccess(false);
    setLastOrder(null);
  }

  if (!user) {
    return (
      <div style={styles.centered}>
        <p style={styles.loadingText}>⏳ Loading...</p>
      </div>
    );
  }

  if (user.email !== ADMIN_EMAIL) {
    return (
      <div style={styles.centered}>
        <p style={styles.deniedIcon}>🚫</p>
        <h2 style={styles.deniedTitle}>Access Denied</h2>
        <p style={styles.deniedText}>You must be logged in as admin to use POS.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>💊</span>
          <div>
            <h1 style={styles.headerTitle}>Sardar Pharmacy POS</h1>
            <p style={styles.headerSub}>Point of Sale System</p>
          </div>
        </div>
        <div style={styles.headerTabs}>
          <button
            style={{ ...styles.headerTab, ...(tab === "sale" ? styles.headerTabActive : {}) }}
            onClick={() => setTab("sale")}
          >
            🏪 New Sale
          </button>
          <button
            style={{ ...styles.headerTab, ...(tab === "history" ? styles.headerTabActive : {}) }}
            onClick={() => setTab("history")}
          >
            📋 Sale History
          </button>
        </div>
      </div>

      {tab === "sale" && (
        <>
          {success && lastOrder ? (
            <div style={styles.successScreen}>
              <div style={styles.successBox}>
                <p style={styles.successIcon}>✅</p>
                <h2 style={styles.successTitle}>Sale Complete!</h2>
                <p style={styles.successAmt}>৳{lastOrder.total} • {lastOrder.paymentMethod}</p>
                <p style={styles.successCustomer}>👤 {lastOrder.name} • 📞 {lastOrder.phone}</p>
                <div style={styles.receiptBtns}>
                  <button style={styles.printBtn} onClick={() => printReceipt(lastOrder)}>🖨️ Print Receipt</button>
                  <button style={styles.downloadBtn} onClick={() => downloadReceipt(lastOrder)}>📥 Download PDF</button>
                  <button style={styles.whatsappBtn} onClick={() => whatsappReceipt(lastOrder)}>💬 WhatsApp</button>
                </div>
                <button style={styles.newSaleBtn} onClick={newSale}>+ New Sale</button>
              </div>
            </div>
          ) : (
            <div style={styles.saleLayout}>
              <div style={styles.leftPanel}>
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>🔍 Search Medicine</h3>
                  <input
                    type="text"
                    placeholder="Type medicine name or generic..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={styles.searchInput}
                    autoFocus
                  />
                  {filtered.length > 0 && (
                    <div style={styles.suggestions}>
                      {filtered.map((med, i) => (
                        <button key={i} style={styles.suggestion} onClick={() => addToCart(med)}>
                          <span style={styles.suggestionEmoji}>{getMedicineEmoji(med.category_name)}</span>
                          <div style={styles.suggestionInfo}>
                            <p style={styles.suggestionName}>{med.medicine_name}</p>
                            <p style={styles.suggestionDetail}>
                              {med.generic_name} • {med.strength} • {getUnitLabel(med)}
                            </p>
                          </div>
                          <span style={styles.suggestionPrice}>৳{med.price}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>👤 Customer Info (Optional)</h3>
                  <input
                    type="text"
                    placeholder="Customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="Phone number (for WhatsApp receipt)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={styles.input}
                  />
                  <div style={styles.paymentOptions}>
                    {[
                      { id: "cash", label: "💵 Cash" },
                      { id: "bkash", label: "📱 bKash" },
                      { id: "nagad", label: "📱 Nagad" },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        style={{
                          ...styles.paymentBtn,
                          backgroundColor: paymentMethod === method.id ? "#1e40af" : "#f1f5f9",
                          color: paymentMethod === method.id ? "white" : "#1e293b",
                        }}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={styles.rightPanel}>
                <h3 style={styles.sectionTitle}>
                  🛒 Cart {cart.length > 0 && <span style={styles.cartCount}>{cart.length} items</span>}
                </h3>

                {cart.length === 0 ? (
                  <div style={styles.emptyCart}>
                    <p style={styles.emptyCartIcon}>🛒</p>
                    <p style={styles.emptyCartText}>Search and add medicines above</p>
                  </div>
                ) : (
                  <>
                    <div style={styles.cartItems}>
                      {cart.map((item, i) => (
                        <div key={i} style={styles.cartItem}>
                          <span style={styles.cartEmoji}>{getMedicineEmoji(item.category_name)}</span>
                          <div style={styles.cartInfo}>
                            <p style={styles.cartName}>{item.medicine_name}</p>
                            <p style={styles.cartDetail}>
                              ৳{item.price} / {getUnitShort(item)}
                              {item.unit_size > 1 ? ` • ${item.unit}` : ""}
                            </p>
                          </div>
                          <div style={styles.cartQty}>
                            <button style={styles.qtyBtn} onClick={() => updateQty(item.slug, item.quantity - 1)}>−</button>
                            <span style={styles.qtyNum}>{item.quantity}</span>
                            <button style={styles.qtyBtn} onClick={() => updateQty(item.slug, item.quantity + 1)}>+</button>
                          </div>
                          <div style={styles.cartRight}>
                            <p style={styles.cartTotal}>৳{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                            <button style={styles.removeBtn} onClick={() => removeFromCart(item.slug)}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={styles.cartFooter}>
                      <div style={styles.totalRow}>
                        <span style={styles.totalLabel}>Total</span>
                        <span style={styles.totalAmt}>৳{total.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={handleCheckout}
                        style={{
                          ...styles.checkoutBtn,
                          opacity: loading ? 0.7 : 1,
                          cursor: loading ? "not-allowed" : "pointer",
                        }}
                        disabled={loading}
                      >
                        {loading ? "Processing..." : "✅ Complete Sale →"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div style={styles.historyPanel}>
          <div style={styles.historyHeader}>
            <h3 style={styles.sectionTitle}>📋 POS Sale History</h3>
            <button style={styles.refreshBtn} onClick={fetchHistory}>🔄 Refresh</button>
          </div>

          {historyLoading ? (
            <div style={styles.centered}>
              <p style={styles.loadingText}>⏳ Loading sales...</p>
            </div>
          ) : salesHistory.length === 0 ? (
            <div style={styles.centered}>
              <p style={styles.emptyCartIcon}>📋</p>
              <p style={styles.emptyCartText}>No POS sales yet</p>
            </div>
          ) : (
            <div style={styles.historyGrid}>
              {salesHistory.map((sale) => (
                <div key={sale.id} style={styles.historyCard}>
                  <div style={styles.historyCardHeader}>
                    <div>
                      <p style={styles.historyId}>#{sale.id.slice(0, 8).toUpperCase()}</p>
                      <p style={styles.historyDate}>📅 {sale.createdAt?.toDate?.().toLocaleString()}</p>
                    </div>
                    <span style={styles.historyTotal}>৳{sale.total}</span>
                  </div>
                  <p style={styles.historyCustomer}>👤 {sale.name} • 📞 {sale.phone}</p>
                  <p style={styles.historyPayment}>💳 {sale.paymentMethod}</p>
                  <div style={styles.historyItems}>
                    {sale.items?.map((item, i) => (
                      <p key={i} style={styles.historyItem}>
                        {getMedicineEmoji(item.category)} {item.name}
                        {item.unit_size > 1 ? ` (${item.unit})` : ""} ×{item.quantity} — ৳{(parseFloat(item.price) * item.quantity).toFixed(2)}
                      </p>
                    ))}
                  </div>
                  <div style={styles.historyBtns}>
                    <button style={styles.printBtn} onClick={() => printReceipt({ ...sale, createdAt: sale.createdAt?.toDate?.().toLocaleString() })}>🖨️ Print</button>
                    <button style={styles.downloadBtn} onClick={() => downloadReceipt({ ...sale, createdAt: sale.createdAt?.toDate?.().toLocaleString() })}>📥 PDF</button>
                    <button style={styles.whatsappBtn} onClick={() => whatsappReceipt({ ...sale, createdAt: sale.createdAt?.toDate?.().toLocaleString() })}>💬 WhatsApp</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: "Inter, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    padding: "16px 28px",
    flexWrap: "wrap",
    gap: "12px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  headerIcon: {
    fontSize: "32px",
  },
  headerTitle: {
    color: "white",
    fontSize: "20px",
    fontWeight: "800",
    margin: 0,
  },
  headerSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: "12px",
    margin: 0,
  },
  headerTabs: {
    display: "flex",
    gap: "8px",
  },
  headerTab: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "white",
    transition: "all 0.2s",
  },
  headerTabActive: {
    backgroundColor: "white",
    color: "#1e293b",
  },
  saleLayout: {
    display: "flex",
    gap: "20px",
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
    minHeight: "calc(100vh - 80px)",
  },
  leftPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  rightPanel: {
    width: "420px",
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    height: "fit-content",
    position: "sticky",
    top: "20px",
  },
  section: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "14px",
  },
  searchInput: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: "12px",
    border: "2px solid #2563eb",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "Inter, sans-serif",
  },
  suggestions: {
    marginTop: "8px",
    backgroundColor: "white",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  },
  suggestion: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "12px 16px",
    border: "none",
    borderBottom: "1px solid #f1f5f9",
    backgroundColor: "white",
    cursor: "pointer",
    textAlign: "left",
  },
  suggestionEmoji: { fontSize: "24px", minWidth: "32px" },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: 0 },
  suggestionDetail: { fontSize: "12px", color: "#94a3b8", margin: "2px 0 0 0" },
  suggestionPrice: { fontSize: "15px", fontWeight: "800", color: "#1e40af" },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "2px solid #e2e8f0",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "10px",
    fontFamily: "Inter, sans-serif",
  },
  paymentOptions: { display: "flex", gap: "8px", flexWrap: "wrap" },
  paymentBtn: {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  cartCount: {
    fontSize: "13px",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    padding: "3px 10px",
    borderRadius: "50px",
    marginLeft: "8px",
    fontWeight: "600",
  },
  emptyCart: {
    textAlign: "center",
    padding: "40px 20px",
  },
  emptyCartIcon: { fontSize: "48px", marginBottom: "12px" },
  emptyCartText: { fontSize: "15px", color: "#94a3b8", fontWeight: "500" },
  cartItems: { marginBottom: "16px" },
  cartItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    marginBottom: "8px",
    border: "1px solid #f1f5f9",
  },
  cartEmoji: { fontSize: "24px", minWidth: "32px" },
  cartInfo: { flex: 1 },
  cartName: { fontSize: "13px", fontWeight: "700", color: "#1e293b", margin: 0 },
  cartDetail: { fontSize: "11px", color: "#94a3b8", margin: "2px 0 0 0" },
  cartQty: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#eff6ff",
    borderRadius: "10px",
    padding: "4px",
  },
  qtyBtn: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "white",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyNum: { fontSize: "14px", fontWeight: "800", color: "#1e40af", minWidth: "20px", textAlign: "center" },
  cartRight: { textAlign: "right" },
  cartTotal: { fontSize: "14px", fontWeight: "800", color: "#1e40af", margin: "0 0 4px 0" },
  removeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: 0 },
  cartFooter: { borderTop: "1px solid #e2e8f0", paddingTop: "16px" },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    padding: "12px 16px",
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
  },
  totalLabel: { fontSize: "16px", fontWeight: "600", color: "#64748b" },
  totalAmt: { fontSize: "24px", fontWeight: "800", color: "#1e40af" },
  checkoutBtn: {
    width: "100%",
    padding: "15px",
    background: "linear-gradient(135deg, #1e40af, #2563eb)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "700",
    boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
    fontFamily: "Inter, sans-serif",
    cursor: "pointer",
  },
  successScreen: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 80px)",
    padding: "20px",
  },
  successBox: {
    backgroundColor: "white",
    borderRadius: "24px",
    padding: "48px 40px",
    textAlign: "center",
    maxWidth: "480px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
  },
  successIcon: { fontSize: "64px", marginBottom: "16px" },
  successTitle: { fontSize: "28px", fontWeight: "800", color: "#1e293b", marginBottom: "8px" },
  successAmt: { fontSize: "20px", fontWeight: "700", color: "#1e40af", marginBottom: "6px" },
  successCustomer: { fontSize: "14px", color: "#64748b", marginBottom: "24px" },
  receiptBtns: { display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", marginBottom: "16px" },
  printBtn: { padding: "12px 18px", backgroundColor: "#1e293b", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  downloadBtn: { padding: "12px 18px", backgroundColor: "#1e40af", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  whatsappBtn: { padding: "12px 18px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  newSaleBtn: { width: "100%", padding: "14px", background: "linear-gradient(135deg, #1e40af, #2563eb)", color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "700", cursor: "pointer" },
  historyPanel: { padding: "20px", maxWidth: "1200px", margin: "0 auto" },
  historyHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  refreshBtn: { padding: "10px 18px", backgroundColor: "#eff6ff", color: "#2563eb", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  historyGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" },
  historyCard: { backgroundColor: "white", borderRadius: "16px", padding: "18px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" },
  historyCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" },
  historyId: { fontWeight: "800", color: "#1e293b", fontSize: "15px", margin: 0 },
  historyDate: { fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 0" },
  historyTotal: { fontSize: "20px", fontWeight: "800", color: "#1e40af" },
  historyCustomer: { fontSize: "13px", color: "#64748b", margin: "4px 0" },
  historyPayment: { fontSize: "13px", color: "#64748b", margin: "4px 0 10px 0" },
  historyItems: { backgroundColor: "#f8fafc", borderRadius: "10px", padding: "10px 12px", marginBottom: "12px", border: "1px solid #f1f5f9" },
  historyItem: { fontSize: "13px", color: "#1e293b", margin: "4px 0", fontWeight: "500" },
  historyBtns: { display: "flex", gap: "8px", flexWrap: "wrap" },
  centered: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", textAlign: "center" },
  loadingText: { fontSize: "18px", color: "#94a3b8" },
  deniedIcon: { fontSize: "64px", marginBottom: "16px" },
  deniedTitle: { fontSize: "28px", fontWeight: "800", color: "#dc2626", marginBottom: "12px" },
  deniedText: { fontSize: "15px", color: "#64748b" },
};

export default POSPage;