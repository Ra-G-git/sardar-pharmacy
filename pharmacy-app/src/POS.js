import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getMedicineEmoji, getUnitLabel, getUnitShort } from "./medicineUtils";
import { downloadReceipt, printReceipt, whatsappReceipt } from "./Receipt";
import Papa from "papaparse";

const ADMIN_EMAIL = "razeesardar@gmail.com";

function POS({ onClose }) {
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

  const user = auth.currentUser;

  useEffect(() => {
    Papa.parse("/medicines.csv", {
      download: true,
      header: true,
      complete: (result) => {
        setMedicines(result.data);
      },
    });
  }, []);

  useEffect(() => {
    if (search.length < 2) {
      setFiltered([]);
      return;
    }
    const results = medicines.filter((med) =>
      med.medicine_name?.toLowerCase().includes(search.toLowerCase()) ||
      med.generic_name?.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 8);
    setFiltered(results);
  }, [search, medicines]);

  function addToCart(med) {
    setCart((prev) => {
      const exists = prev.find((item) => item.slug === med.slug);
      if (exists) {
        return prev.map((item) =>
          item.slug === med.slug
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...med, quantity: 1 }];
    });
    setSearch("");
    setFiltered([]);
  }

  function updateQty(slug, qty) {
    if (qty < 1) {
      setCart((prev) => prev.filter((item) => item.slug !== slug));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.slug === slug ? { ...item, quantity: qty } : item
      )
    );
  }

  function removeFromCart(slug) {
    setCart((prev) => prev.filter((item) => item.slug !== slug));
  }

  const total = cart.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

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

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div style={styles.overlay}>
        <div style={styles.deniedBox}>
          <p style={styles.deniedIcon}>🚫</p>
          <h2 style={styles.deniedTitle}>Access Denied</h2>
          <button onClick={onClose} style={styles.deniedBtn}>Go Back</button>
        </div>
      </div>
    );
  }

  if (success && lastOrder) {
    return (
      <div style={styles.overlay}>
        <div style={styles.successBox}>
          <div style={styles.successIcon}>✅</div>
          <h2 style={styles.successTitle}>Sale Complete!</h2>
          <p style={styles.successText}>
            Total: <strong>৳{lastOrder.total}</strong> • {lastOrder.paymentMethod}
          </p>
          <div style={styles.receiptBtns}>
            <button style={styles.printBtn} onClick={() => printReceipt(lastOrder)}>🖨️ Print Receipt</button>
            <button style={styles.downloadBtn} onClick={() => downloadReceipt(lastOrder)}>📥 Download PDF</button>
            <button style={styles.whatsappBtn} onClick={() => whatsappReceipt(lastOrder)}>💬 WhatsApp</button>
          </div>
          <button style={styles.newSaleBtn} onClick={newSale}>+ New Sale</button>
          <button style={styles.closeSuccessBtn} onClick={onClose}>Close POS</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.pos}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>🏪 Point of Sale</h2>
            <p style={styles.subtitle}>Sardar Pharmacy — In-store Sales</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          <div style={styles.left}>
            <div style={styles.searchSection}>
              <h3 style={styles.sectionTitle}>🔍 Search Medicine</h3>
              <div style={styles.searchWrapper}>
                <input
                  type="text"
                  placeholder="Type medicine name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.searchInput}
                  autoFocus
                />
              </div>

              {filtered.length > 0 && (
                <div style={styles.suggestions}>
                  {filtered.map((med, i) => (
                    <button
                      key={i}
                      style={styles.suggestion}
                      onClick={() => addToCart(med)}
                    >
                      <span style={styles.suggestionEmoji}>{getMedicineEmoji(med.category_name)}</span>
                      <div style={styles.suggestionInfo}>
                        <p style={styles.suggestionName}>{med.medicine_name}</p>
                        <p style={styles.suggestionDetail}>{med.generic_name} • {med.strength} • {getUnitLabel(med)}</p>
                      </div>
                      <span style={styles.suggestionPrice}>৳{med.price}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.customerSection}>
              <h3 style={styles.sectionTitle}>👤 Customer (Optional)</h3>
              <input
                type="text"
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Phone number"
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

          <div style={styles.right}>
            <h3 style={styles.sectionTitle}>🛒 Cart {cart.length > 0 && `(${cart.length} items)`}</h3>

            {cart.length === 0 ? (
              <div style={styles.emptyCart}>
                <p style={styles.emptyCartIcon}>🛒</p>
                <p style={styles.emptyCartText}>Search and add medicines</p>
              </div>
            ) : (
              <>
                <div style={styles.cartItems}>
                  {cart.map((item, i) => (
                    <div key={i} style={styles.cartItem}>
                      <span style={styles.cartEmoji}>{getMedicineEmoji(item.category_name)}</span>
                      <div style={styles.cartInfo}>
                        <p style={styles.cartName}>{item.medicine_name}</p>
                        <p style={styles.cartDetail}>৳{item.price} / {getUnitShort(item)}</p>
                      </div>
                      <div style={styles.cartQty}>
                        <button style={styles.qtyBtn} onClick={() => updateQty(item.slug, item.quantity - 1)}>−</button>
                        <span style={styles.qtyNum}>{item.quantity}</span>
                        <button style={styles.qtyBtn} onClick={() => updateQty(item.slug, item.quantity + 1)}>+</button>
                      </div>
                      <div style={styles.cartTotal}>
                        <p style={styles.cartTotalAmt}>৳{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
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
      </div>
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
  pos: {
    backgroundColor: "white",
    borderRadius: "24px",
    width: "100%",
    maxWidth: "900px",
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
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
  },
  title: {
    color: "white",
    fontSize: "22px",
    fontWeight: "800",
    margin: 0,
  },
  subtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: "13px",
    margin: "4px 0 0 0",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.1)",
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
  body: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  left: {
    flex: 1,
    padding: "20px",
    borderRight: "1px solid #e2e8f0",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  right: {
    width: "380px",
    padding: "20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "12px",
  },
  searchSection: {},
  searchWrapper: {
    position: "relative",
  },
  searchInput: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: "12px",
    border: "2px solid #2563eb",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
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
    transition: "background 0.15s",
  },
  suggestionEmoji: {
    fontSize: "24px",
    minWidth: "32px",
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0,
  },
  suggestionDetail: {
    fontSize: "12px",
    color: "#94a3b8",
    margin: "2px 0 0 0",
  },
  suggestionPrice: {
    fontSize: "15px",
    fontWeight: "800",
    color: "#1e40af",
  },
  customerSection: {},
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "2px solid #e2e8f0",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "10px",
  },
  paymentOptions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  paymentBtn: {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  emptyCart: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
  },
  emptyCartIcon: {
    fontSize: "48px",
    marginBottom: "12px",
  },
  emptyCartText: {
    fontSize: "15px",
    color: "#94a3b8",
    fontWeight: "500",
  },
  cartItems: {
    flex: 1,
    overflowY: "auto",
    marginBottom: "16px",
  },
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
  cartEmoji: {
    fontSize: "24px",
    minWidth: "32px",
  },
  cartInfo: {
    flex: 1,
  },
  cartName: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0,
  },
  cartDetail: {
    fontSize: "11px",
    color: "#94a3b8",
    margin: "2px 0 0 0",
  },
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
  qtyNum: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#1e40af",
    minWidth: "20px",
    textAlign: "center",
  },
  cartTotal: {
    textAlign: "right",
  },
  cartTotalAmt: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#1e40af",
    margin: "0 0 4px 0",
  },
  removeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    padding: 0,
  },
  cartFooter: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: "16px",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    padding: "12px 16px",
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
  },
  totalLabel: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#64748b",
  },
  totalAmt: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#1e40af",
  },
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
  },
  successBox: {
    backgroundColor: "white",
    borderRadius: "24px",
    padding: "48px 40px",
    textAlign: "center",
    maxWidth: "440px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  successIcon: {
    fontSize: "64px",
    marginBottom: "16px",
  },
  successTitle: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: "12px",
  },
  successText: {
    color: "#64748b",
    fontSize: "15px",
    marginBottom: "24px",
  },
  receiptBtns: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: "16px",
  },
  printBtn: {
    padding: "12px 18px",
    backgroundColor: "#1e293b",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  downloadBtn: {
    padding: "12px 18px",
    backgroundColor: "#1e40af",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  whatsappBtn: {
    padding: "12px 18px",
    backgroundColor: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  newSaleBtn: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #1e40af, #2563eb)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    marginBottom: "10px",
  },
  closeSuccessBtn: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },
  deniedBox: {
    backgroundColor: "white",
    borderRadius: "24px",
    padding: "48px 40px",
    textAlign: "center",
    maxWidth: "400px",
    width: "100%",
  },
  deniedIcon: {
    fontSize: "64px",
    marginBottom: "16px",
  },
  deniedTitle: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#dc2626",
    marginBottom: "24px",
  },
  deniedBtn: {
    padding: "14px 32px",
    backgroundColor: "#f1f5f9",
    color: "#1e293b",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
  },
};

export default POS;