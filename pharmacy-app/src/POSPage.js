import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, where, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  // Edit modal
  const [editingItem, setEditingItem] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");

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
      med.generic_name?.toLowerCase().includes(search.toLowerCase()) ||
      med.category_name?.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 10);
    setFiltered(results);
  }, [search, medicines]);

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab]);

  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const q = query(collection(db, "orders"), where("orderType", "==", "pos"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setSalesHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setHistoryLoading(false);
  }

  // Add to cart — use inventory price if available
  async function addToCart(med) {
    let priceToUse = med.price;
    try {
      const invSnap = await getDoc(doc(db, "inventory", med.slug));
      if (invSnap.exists() && invSnap.data().price) {
        priceToUse = invSnap.data().price;
      }
    } catch (err) {}

    setCart((prev) => {
      const exists = prev.find((item) => item.slug === med.slug);
      if (exists) return prev.map((item) => item.slug === med.slug ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...med, price: priceToUse, quantity: 1 }];
    });
    setSearch("");
    setFiltered([]);
  }

  function updateQty(slug, qty) {
    const num = parseInt(qty);
    if (isNaN(num) || num < 1) { setCart((prev) => prev.filter((item) => item.slug !== slug)); return; }
    setCart((prev) => prev.map((item) => item.slug === slug ? { ...item, quantity: num } : item));
  }

  function removeFromCart(slug) {
    setCart((prev) => prev.filter((item) => item.slug !== slug));
  }

  function openEdit(item) {
    setEditingItem(item);
    setEditPrice(item.price);
    setEditStock("");
  }

  async function saveEdit() {
    if (!editingItem) return;
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice <= 0) return;
    const slug = editingItem.slug;

    try {
      const invRef = doc(db, "inventory", slug);
      const invSnap = await getDoc(invRef);
      const stockVal = editStock !== "" ? parseInt(editStock) : null;

      if (invSnap.exists()) {
        const updateData = { price: newPrice.toFixed(2), updatedAt: serverTimestamp() };
        if (stockVal !== null) updateData.stock = stockVal;
        await updateDoc(invRef, updateData);
      } else {
        await setDoc(invRef, {
          slug,
          medicine_name: editingItem.medicine_name,
          generic_name: editingItem.generic_name,
          category_name: editingItem.category_name,
          strength: editingItem.strength || "",
          manufacturer_name: editingItem.manufacturer_name || "",
          unit: editingItem.unit || "",
          unit_size: editingItem.unit_size || "",
          price: newPrice.toFixed(2),
          stock: stockVal !== null ? stockVal : 0,
          updatedAt: serverTimestamp(),
        });
      }

      // Update price in cart immediately
      setCart((prev) => prev.map((item) =>
        item.slug === slug ? { ...item, price: newPrice.toFixed(2) } : item
      ));
    } catch (err) { console.error("Inventory save failed:", err); }

    setEditingItem(null);
    setEditPrice("");
    setEditStock("");
  }

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  const discountAmt = (subtotal * discount) / 100;
  const total = subtotal - discountAmt;

  async function handleCheckout() {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      // Auto-deduct stock for inventory items
      for (const item of cart) {
        try {
          const invRef = doc(db, "inventory", item.slug);
          const invSnap = await getDoc(invRef);
          if (invSnap.exists()) {
            const currentStock = invSnap.data().stock || 0;
            await updateDoc(invRef, { stock: Math.max(0, currentStock - item.quantity) });
          }
        } catch (err) {}
      }

      const orderItems = cart.map((item) => ({
        name: item.medicine_name, category: item.category_name, price: item.price,
        quantity: item.quantity, unit: item.unit, unit_size: item.unit_size, strength: item.strength,
      }));

      const ref = await addDoc(collection(db, "orders"), {
        userId: user?.uid || "pos", userEmail: user?.email || "pos",
        name: customerName || "Walk-in Customer", phone: customerPhone || "N/A",
        address: "In-store purchase", paymentMethod, orderType: "pos",
        discount, note, subtotal: subtotal.toFixed(2), items: orderItems,
        total: total.toFixed(2), status: "delivered", createdAt: serverTimestamp(),
      });

      setLastOrder({
        id: ref.id, name: customerName || "Walk-in Customer", phone: customerPhone || "N/A",
        address: "In-store purchase", paymentMethod, discount, note,
        subtotal: subtotal.toFixed(2), items: orderItems,
        total: total.toFixed(2), status: "delivered", createdAt: new Date().toLocaleString(),
      });

      setSuccess(true);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscount(0);
      setNote("");
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  function newSale() { setSuccess(false); setLastOrder(null); }

  const filteredHistory = salesHistory.filter((sale) =>
    sale.name?.toLowerCase().includes(historySearch.toLowerCase()) ||
    sale.phone?.includes(historySearch) ||
    sale.id?.toLowerCase().includes(historySearch.toLowerCase())
  );

  const todaySales = salesHistory.filter((sale) => {
    const date = sale.createdAt?.toDate?.();
    return date && date.toDateString() === new Date().toDateString();
  });
  const todayRevenue = todaySales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

  if (!user) return <div style={styles.centered}><p style={{ fontSize: "18px", color: "#94a3b8" }}>Loading...</p></div>;
  if (user.email !== ADMIN_EMAIL) return (
    <div style={styles.centered}>
      <p style={{ fontSize: "64px" }}>🚫</p>
      <h2 style={{ color: "#dc2626", fontSize: "28px", margin: "16px 0 8px" }}>Access Denied</h2>
    </div>
  );

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={{ fontSize: "28px" }}>💊</span>
          <div>
            <h1 style={styles.headerTitle}>Sardar Pharmacy — POS</h1>
            <p style={styles.headerSub}>Point of Sale System • {new Date().toLocaleDateString("en-BD", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.todayStats}>
            <div style={styles.todayStat}><p style={styles.todayNum}>{todaySales.length}</p><p style={styles.todayLabel}>Today's Sales</p></div>
            <div style={styles.todayDivider} />
            <div style={styles.todayStat}><p style={styles.todayNum}>৳{todayRevenue.toFixed(0)}</p><p style={styles.todayLabel}>Today's Revenue</p></div>
          </div>
          <div style={styles.headerTabs}>
            <button style={{ ...styles.headerTab, ...(tab === "sale" ? styles.headerTabActive : {}) }} onClick={() => setTab("sale")}>🏪 New Sale</button>
            <button style={{ ...styles.headerTab, ...(tab === "history" ? styles.headerTabActive : {}) }} onClick={() => setTab("history")}>📋 History</button>
          </div>
        </div>
      </div>

      {/* Sale Tab */}
      {tab === "sale" && (
        <>
          {success && lastOrder ? (
            <div style={styles.successScreen}>
              <div style={styles.successBox}>
                <p style={{ fontSize: "64px", margin: "0 0 16px" }}>✅</p>
                <h2 style={styles.successTitle}>Sale Complete!</h2>
                <div style={styles.successDetails}>
                  <div style={styles.successRow}><span>Subtotal</span><span>৳{lastOrder.subtotal}</span></div>
                  {lastOrder.discount > 0 && (
                    <div style={{ ...styles.successRow, color: "#16a34a" }}>
                      <span>Discount ({lastOrder.discount}%)</span>
                      <span>-৳{((parseFloat(lastOrder.subtotal) * lastOrder.discount) / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ ...styles.successRow, ...styles.successTotalRow }}><span>Total</span><span>৳{lastOrder.total}</span></div>
                </div>
                <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 8px" }}>👤 {lastOrder.name} • 📞 {lastOrder.phone}</p>
                <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 24px" }}>💳 {lastOrder.paymentMethod}</p>
                <div style={styles.receiptBtns}>
                  <button style={styles.printBtn} onClick={() => printReceipt(lastOrder)}>🖨️ Print</button>
                  <button style={styles.downloadBtn} onClick={() => downloadReceipt(lastOrder)}>📥 PDF</button>
                  <button style={styles.whatsappBtn} onClick={() => whatsappReceipt(lastOrder)}>💬 WhatsApp</button>
                </div>
                <button style={styles.newSaleBtn} onClick={newSale}>+ New Sale</button>
              </div>
            </div>
          ) : (
            <div style={styles.saleLayout}>
              {/* Left Panel */}
              <div style={styles.leftPanel}>
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>🔍 Search Medicine</h3>
                  <input type="text" placeholder="Type medicine name, generic or category..." value={search} onChange={(e) => setSearch(e.target.value)} style={styles.searchInput} autoFocus />
                  {filtered.length > 0 && (
                    <div style={styles.suggestions}>
                      {filtered.map((med, i) => (
                        <button key={i} style={styles.suggestion} onClick={() => addToCart(med)}>
                          <span style={{ fontSize: "24px", minWidth: "32px" }}>{getMedicineEmoji(med.category_name)}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: 0 }}>{med.medicine_name}</p>
                            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "2px 0 0 0" }}>{med.generic_name} • {med.strength} • {getUnitLabel(med)}</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: "15px", fontWeight: "800", color: "#1e40af", margin: 0 }}>৳{med.price}</p>
                            <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0 0" }}>{med.category_name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>👤 Customer Info</h3>
                  <div style={styles.inputRow}>
                    <input type="text" placeholder="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={styles.input} />
                    <input type="text" placeholder="Phone (for WhatsApp)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={styles.input} />
                  </div>
                  <textarea placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={styles.textarea} />
                  <div style={styles.paymentOptions}>
                    {[{ id: "cash", label: "💵 Cash" }, { id: "bkash", label: "📱 bKash" }, { id: "nagad", label: "📱 Nagad" }, { id: "card", label: "💳 Card" }].map((method) => (
                      <button key={method.id} onClick={() => setPaymentMethod(method.id)} style={{
                        ...styles.paymentBtn,
                        backgroundColor: paymentMethod === method.id ? "#1e40af" : "#f1f5f9",
                        color: paymentMethod === method.id ? "white" : "#1e293b",
                        border: paymentMethod === method.id ? "2px solid #1e40af" : "2px solid transparent",
                      }}>{method.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel */}
              <div style={styles.rightPanel}>
                <div style={styles.cartHeader}>
                  <h3 style={styles.sectionTitle}>🛒 Cart {cart.length > 0 && <span style={styles.cartBadge}>{cart.length}</span>}</h3>
                  {cart.length > 0 && <button style={styles.clearCartBtn} onClick={() => setCart([])}>Clear</button>}
                </div>

                {cart.length === 0 ? (
                  <div style={styles.emptyCart}>
                    <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🛒</p>
                    <p style={{ fontSize: "15px", color: "#94a3b8" }}>Search and add medicines</p>
                  </div>
                ) : (
                  <>
                    <div style={styles.cartItems}>
                      {cart.map((item, i) => (
                        <div key={i} style={styles.cartItem}>
                          <span style={{ fontSize: "22px", minWidth: "28px" }}>{getMedicineEmoji(item.category_name)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={styles.cartName}>{item.medicine_name}</p>
                            <p style={styles.cartDetail}>৳{item.price}/{getUnitShort(item)}{item.unit_size > 1 ? ` • Pack of ${item.unit_size}` : ""}</p>
                          </div>
                          <div style={styles.cartQty}>
                            <button style={styles.qtyBtn} onClick={() => updateQty(item.slug, item.quantity - 1)}>−</button>
                            <input type="number" min="1" value={item.quantity} onChange={(e) => updateQty(item.slug, e.target.value)} style={styles.qtyInput} />
                            <button style={styles.qtyBtn} onClick={() => updateQty(item.slug, item.quantity + 1)}>+</button>
                          </div>
                          <div style={{ textAlign: "right", minWidth: "70px" }}>
                            <p style={styles.cartTotal}>৳{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                            <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end", marginTop: "2px" }}>
                              <button style={styles.editBtn} onClick={() => openEdit(item)} title="Edit price & stock">✏️</button>
                              <button style={styles.removeBtn} onClick={() => removeFromCart(item.slug)}>🗑️</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={styles.discountRow}>
                      <label style={styles.discountLabel}>Discount %</label>
                      <div style={styles.discountControls}>
                        {[0, 5, 10, 15, 20].map((d) => (
                          <button key={d} onClick={() => setDiscount(d)} style={{ ...styles.discountBtn, backgroundColor: discount === d ? "#1e40af" : "#f1f5f9", color: discount === d ? "white" : "#1e293b" }}>{d}%</button>
                        ))}
                        <input type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(parseInt(e.target.value) || 0)} style={styles.discountInput} placeholder="Custom" />
                      </div>
                    </div>

                    <div style={styles.cartFooter}>
                      <div style={styles.summaryRow}><span style={styles.summaryLabel}>Subtotal</span><span style={styles.summaryValue}>৳{subtotal.toFixed(2)}</span></div>
                      {discount > 0 && (
                        <div style={{ ...styles.summaryRow, color: "#16a34a" }}>
                          <span>Discount ({discount}%)</span><span>-৳{discountAmt.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={styles.totalRow}>
                        <span style={styles.totalLabel}>Total</span>
                        <span style={styles.totalAmt}>৳{total.toFixed(2)}</span>
                      </div>
                      <button onClick={handleCheckout} style={{ ...styles.checkoutBtn, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }} disabled={loading}>
                        {loading ? "Processing..." : `✅ Complete Sale — ৳${total.toFixed(2)}`}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div style={styles.historyPanel}>
          <div style={styles.historyHeader}>
            <div>
              <h3 style={styles.sectionTitle}>📋 POS Sale History</h3>
              <p style={{ color: "#64748b", fontSize: "13px", margin: "-8px 0 0 0" }}>
                {salesHistory.length} total sales • ৳{salesHistory.reduce((s, o) => s + parseFloat(o.total || 0), 0).toFixed(0)} total revenue
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <input type="text" placeholder="Search by name, phone, ID..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} style={styles.historySearchInput} />
              <button style={styles.refreshBtn} onClick={fetchHistory}>🔄 Refresh</button>
            </div>
          </div>
          {historyLoading ? (
            <div style={styles.centered}><p style={{ fontSize: "18px", color: "#94a3b8" }}>Loading...</p></div>
          ) : filteredHistory.length === 0 ? (
            <div style={styles.centered}><p style={{ fontSize: "48px" }}>📋</p><p style={{ color: "#94a3b8", fontSize: "15px" }}>No sales found</p></div>
          ) : (
            <div style={styles.historyGrid}>
              {filteredHistory.map((sale) => (
                <div key={sale.id} style={styles.historyCard}>
                  <div style={styles.historyCardHeader}>
                    <div><p style={styles.historyId}>#{sale.id.slice(0, 8).toUpperCase()}</p><p style={styles.historyDate}>📅 {sale.createdAt?.toDate?.().toLocaleString()}</p></div>
                    <div style={{ textAlign: "right" }}>
                      <p style={styles.historyTotal}>৳{sale.total}</p>
                      {sale.discount > 0 && <p style={{ fontSize: "11px", color: "#16a34a", margin: 0 }}>{sale.discount}% off</p>}
                    </div>
                  </div>
                  <p style={styles.historyCustomer}>👤 {sale.name} • 📞 {sale.phone}</p>
                  <p style={styles.historyPayment}>💳 {sale.paymentMethod}</p>
                  {sale.note && <p style={styles.historyNote}>📝 {sale.note}</p>}
                  <div style={styles.historyItems}>
                    {sale.items?.map((item, i) => (
                      <div key={i} style={styles.historyItemRow}>
                        <span>{getMedicineEmoji(item.category)} {item.name}{item.unit_size > 1 ? ` (Pack of ${item.unit_size})` : ""}</span>
                        <span>×{item.quantity} = ৳{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={styles.historyBtns}>
                    <button style={styles.printBtn} onClick={() => printReceipt({ ...sale, createdAt: sale.createdAt?.toDate?.().toLocaleString() })}>🖨️ Print</button>
                    <button style={styles.downloadBtn} onClick={() => downloadReceipt({ ...sale, createdAt: sale.createdAt?.toDate?.().toLocaleString() })}>📥 PDF</button>
                    <button style={styles.whatsappBtn} onClick={() => whatsappReceipt({ ...sale, createdAt: sale.createdAt?.toDate?.().toLocaleString() })}>💬 WA</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Price/Stock Modal */}
      {editingItem && (
        <div style={styles.modalOverlay} onClick={() => setEditingItem(null)}>
          <div style={styles.editModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.editModalHeader}>
              <div>
                <h3 style={styles.editModalTitle}>✏️ Edit Medicine</h3>
                <p style={styles.editModalSub}>{editingItem.medicine_name}</p>
              </div>
              <button onClick={() => setEditingItem(null)} style={styles.editModalClose}>✕</button>
            </div>
            <div style={styles.editModalBody}>
              <div style={styles.editField}>
                <label style={styles.editLabel}>Price (৳)</label>
                <p style={styles.editHint}>CSV price: ৳{editingItem.price} — enter your actual selling price</p>
                <input type="number" min="0" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} style={styles.editInput} autoFocus />
              </div>
              <div style={styles.editField}>
                <label style={styles.editLabel}>Stock Quantity</label>
                <p style={styles.editHint}>How many units do you have right now?</p>
                <input type="number" min="0" placeholder="e.g. 50" value={editStock} onChange={(e) => setEditStock(e.target.value)} style={styles.editInput} />
              </div>
              <div style={styles.editInfo}>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                  💡 Price saves to your inventory and applies immediately. Stock auto-deducts on every sale.
                </p>
              </div>
            </div>
            <div style={styles.editModalFooter}>
              <button onClick={() => setEditingItem(null)} style={styles.editCancelBtn}>Cancel</button>
              <button onClick={saveEdit} style={styles.editSaveBtn}>💾 Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", backgroundColor: "#f1f5f9", fontFamily: "Inter, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #0f172a, #1e293b)", padding: "16px 28px", flexWrap: "wrap", gap: "16px" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  headerTitle: { color: "white", fontSize: "20px", fontWeight: "800", margin: 0 },
  headerSub: { color: "rgba(255,255,255,0.5)", fontSize: "12px", margin: 0 },
  headerRight: { display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" },
  todayStats: { display: "flex", alignItems: "center", gap: "16px", backgroundColor: "rgba(255,255,255,0.1)", padding: "10px 20px", borderRadius: "12px" },
  todayStat: { textAlign: "center" },
  todayNum: { color: "white", fontSize: "20px", fontWeight: "800", margin: 0 },
  todayLabel: { color: "rgba(255,255,255,0.6)", fontSize: "11px", margin: 0 },
  todayDivider: { width: "1px", height: "30px", backgroundColor: "rgba(255,255,255,0.2)" },
  headerTabs: { display: "flex", gap: "8px" },
  headerTab: { padding: "10px 20px", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600", backgroundColor: "rgba(255,255,255,0.1)", color: "white" },
  headerTabActive: { backgroundColor: "white", color: "#1e293b" },
  saleLayout: { display: "flex", gap: "20px", padding: "20px", maxWidth: "1400px", margin: "0 auto", minHeight: "calc(100vh - 90px)" },
  leftPanel: { flex: 1, display: "flex", flexDirection: "column", gap: "16px" },
  rightPanel: { width: "440px", backgroundColor: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", height: "fit-content", position: "sticky", top: "20px" },
  section: { backgroundColor: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  sectionTitle: { fontSize: "16px", fontWeight: "700", color: "#1e293b", marginBottom: "14px" },
  searchInput: { width: "100%", padding: "14px 16px", borderRadius: "12px", border: "2px solid #2563eb", fontSize: "15px", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" },
  suggestions: { marginTop: "8px", backgroundColor: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" },
  suggestion: { display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "12px 16px", border: "none", borderBottom: "1px solid #f1f5f9", backgroundColor: "white", cursor: "pointer", textAlign: "left" },
  inputRow: { display: "flex", gap: "10px", marginBottom: "10px" },
  input: { flex: 1, padding: "12px 16px", borderRadius: "12px", border: "2px solid #e2e8f0", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" },
  textarea: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "2px solid #e2e8f0", fontSize: "14px", outline: "none", boxSizing: "border-box", resize: "none", height: "60px", marginBottom: "12px", fontFamily: "Inter, sans-serif" },
  paymentOptions: { display: "flex", gap: "8px", flexWrap: "wrap" },
  paymentBtn: { padding: "10px 16px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" },
  cartHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" },
  cartBadge: { backgroundColor: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: "50px", fontSize: "13px", marginLeft: "6px" },
  clearCartBtn: { padding: "6px 12px", backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  emptyCart: { textAlign: "center", padding: "40px 20px", flex: 1 },
  cartItems: { marginBottom: "12px", maxHeight: "320px", overflowY: "auto" },
  cartItem: { display: "flex", alignItems: "center", gap: "8px", padding: "10px", backgroundColor: "#f8fafc", borderRadius: "10px", marginBottom: "6px", border: "1px solid #f1f5f9" },
  cartName: { fontSize: "13px", fontWeight: "700", color: "#1e293b", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cartDetail: { fontSize: "11px", color: "#94a3b8", margin: "2px 0 0 0" },
  cartQty: { display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#eff6ff", borderRadius: "8px", padding: "3px" },
  qtyBtn: { width: "26px", height: "26px", borderRadius: "6px", border: "none", backgroundColor: "#2563eb", color: "white", fontSize: "16px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  qtyInput: { width: "40px", textAlign: "center", border: "none", backgroundColor: "white", fontSize: "14px", fontWeight: "700", color: "#1e40af", outline: "none", borderRadius: "4px", padding: "2px" },
  cartTotal: { fontSize: "13px", fontWeight: "800", color: "#1e40af", margin: "0 0 2px 0" },
  editBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "14px", padding: "2px 4px" },
  removeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "14px", padding: "2px 4px" },
  discountRow: { marginBottom: "12px", padding: "12px", backgroundColor: "#f8fafc", borderRadius: "10px" },
  discountLabel: { fontSize: "13px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "8px" },
  discountControls: { display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" },
  discountBtn: { padding: "6px 10px", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  discountInput: { width: "70px", padding: "6px 8px", borderRadius: "8px", border: "2px solid #e2e8f0", fontSize: "13px", outline: "none", textAlign: "center" },
  cartFooter: { borderTop: "1px solid #e2e8f0", paddingTop: "12px" },
  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#64748b", marginBottom: "6px" },
  summaryLabel: { color: "#64748b" },
  summaryValue: { fontWeight: "600", color: "#1e293b" },
  totalRow: { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0 14px", padding: "10px 14px", backgroundColor: "#eff6ff", borderRadius: "10px" },
  totalLabel: { fontSize: "16px", fontWeight: "700", color: "#1e40af" },
  totalAmt: { fontSize: "24px", fontWeight: "800", color: "#1e40af" },
  checkoutBtn: { width: "100%", padding: "15px", background: "linear-gradient(135deg, #1e40af, #2563eb)", color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "700", boxShadow: "0 4px 14px rgba(37,99,235,0.35)", fontFamily: "Inter, sans-serif" },
  successScreen: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 90px)", padding: "20px" },
  successBox: { backgroundColor: "white", borderRadius: "24px", padding: "48px 40px", textAlign: "center", maxWidth: "480px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" },
  successTitle: { fontSize: "28px", fontWeight: "800", color: "#1e293b", marginBottom: "20px" },
  successDetails: { backgroundColor: "#f8fafc", borderRadius: "12px", padding: "16px", marginBottom: "16px", textAlign: "left" },
  successRow: { display: "flex", justifyContent: "space-between", fontSize: "15px", color: "#64748b", marginBottom: "8px" },
  successTotalRow: { borderTop: "1px solid #e2e8f0", paddingTop: "10px", marginTop: "4px", fontWeight: "800", fontSize: "18px", color: "#1e40af" },
  receiptBtns: { display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", marginBottom: "16px" },
  printBtn: { padding: "12px 18px", backgroundColor: "#1e293b", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  downloadBtn: { padding: "12px 18px", backgroundColor: "#1e40af", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  whatsappBtn: { padding: "12px 18px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  newSaleBtn: { width: "100%", padding: "14px", background: "linear-gradient(135deg, #1e40af, #2563eb)", color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "700", cursor: "pointer" },
  historyPanel: { padding: "20px", maxWidth: "1400px", margin: "0 auto" },
  historyHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" },
  historySearchInput: { padding: "10px 16px", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "14px", outline: "none", width: "260px", fontFamily: "Inter, sans-serif" },
  refreshBtn: { padding: "10px 18px", backgroundColor: "#eff6ff", color: "#2563eb", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  historyGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" },
  historyCard: { backgroundColor: "white", borderRadius: "16px", padding: "18px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" },
  historyCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" },
  historyId: { fontWeight: "800", color: "#1e293b", fontSize: "15px", margin: 0 },
  historyDate: { fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 0" },
  historyTotal: { fontSize: "20px", fontWeight: "800", color: "#1e40af", margin: 0 },
  historyCustomer: { fontSize: "13px", color: "#64748b", margin: "4px 0" },
  historyPayment: { fontSize: "13px", color: "#64748b", margin: "4px 0 8px 0" },
  historyNote: { fontSize: "13px", color: "#92400e", backgroundColor: "#fffbeb", padding: "6px 10px", borderRadius: "8px", margin: "4px 0 8px 0" },
  historyItems: { backgroundColor: "#f8fafc", borderRadius: "10px", padding: "10px 12px", marginBottom: "12px", border: "1px solid #f1f5f9" },
  historyItemRow: { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#1e293b", padding: "4px 0", borderBottom: "1px solid #f1f5f9", fontWeight: "500" },
  historyBtns: { display: "flex", gap: "8px", flexWrap: "wrap" },
  centered: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", textAlign: "center", padding: "20px" },
  // Edit Modal
  modalOverlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" },
  editModal: { backgroundColor: "white", borderRadius: "20px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" },
  editModalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", background: "linear-gradient(135deg, #0f172a, #1e293b)" },
  editModalTitle: { color: "white", fontSize: "18px", fontWeight: "800", margin: 0 },
  editModalSub: { color: "rgba(255,255,255,0.6)", fontSize: "12px", margin: "4px 0 0 0" },
  editModalClose: { background: "rgba(255,255,255,0.1)", border: "none", color: "white", fontSize: "16px", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" },
  editModalBody: { padding: "24px" },
  editField: { marginBottom: "20px" },
  editLabel: { display: "block", fontSize: "14px", fontWeight: "700", color: "#1e293b", marginBottom: "4px" },
  editHint: { fontSize: "12px", color: "#94a3b8", margin: "0 0 8px 0" },
  editInput: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "2px solid #e2e8f0", fontSize: "16px", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif", fontWeight: "600" },
  editInfo: { backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px" },
  editModalFooter: { display: "flex", gap: "10px", padding: "16px 24px", borderTop: "1px solid #e2e8f0" },
  editCancelBtn: { flex: 1, padding: "12px", backgroundColor: "#f1f5f9", color: "#64748b", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  editSaveBtn: { flex: 2, padding: "12px", background: "linear-gradient(135deg, #1e40af, #2563eb)", color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
};

export default POSPage;