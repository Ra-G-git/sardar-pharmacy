import { useState } from "react";
import { auth, db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useCart } from "./CartContext";

function Checkout({ onClose }) {
  const { cart, clearCart } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const total = cart.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  async function handleOrder() {
    if (!auth.currentUser) {
      setError("Please login first to place an order.");
      return;
    }
    if (!name || !phone || !address) {
      setError("Please fill in all fields.");
      return;
    }
    if (cart.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await addDoc(collection(db, "orders"), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        name,
        phone,
        address,
        paymentMethod,
        items: cart.map((item) => ({
          name: item.medicine_name,
          category: item.category_name,
          price: item.price,
          quantity: item.quantity,
        })),
        total: total.toFixed(2),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      clearCart();
      setSuccess("Order placed successfully! We will contact you shortly.");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
        <h2 style={styles.title}>🛒 Checkout</h2>

        <div style={styles.orderSummary}>
          <h3 style={styles.summaryTitle}>Order Summary</h3>
          {cart.map((item, index) => (
            <div key={index} style={styles.summaryItem}>
              <span>{item.medicine_name} x{item.quantity}</span>
              <span>৳{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={styles.totalRow}>
            <strong>Total</strong>
            <strong>৳{total.toFixed(2)}</strong>
          </div>
        </div>

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={styles.input}
        />
        <textarea
          placeholder="Delivery Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={styles.textarea}
        />

        <div style={styles.paymentSection}>
          <p style={styles.paymentTitle}>Payment Method</p>
          <div style={styles.paymentOptions}>
            {["cash", "bkash", "nagad"].map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                style={{
                  ...styles.paymentBtn,
                  backgroundColor: paymentMethod === method ? "#2563eb" : "#f1f5f9",
                  color: paymentMethod === method ? "white" : "#1e293b",
                }}
              >
                {method === "cash" && "💵 Cash on Delivery"}
                {method === "bkash" && "📱 bKash"}
                {method === "nagad" && "📱 Nagad"}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>{success}</p>}

        <button
          onClick={handleOrder}
          style={{
            ...styles.orderBtn,
            backgroundColor: loading ? "#94a3b8" : "#2563eb",
            cursor: loading ? "not-allowed" : "pointer",
          }}
          disabled={loading}
        >
          {loading ? "Placing Order..." : "Place Order →"}
        </button>
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
  box: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "40px",
    width: "480px",
    maxHeight: "90vh",
    overflowY: "auto",
    position: "relative",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  },
  closeBtn: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#64748b",
  },
  title: {
    fontSize: "22px",
    color: "#1e40af",
    marginBottom: "20px",
    textAlign: "center",
  },
  orderSummary: {
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "20px",
  },
  summaryTitle: {
    fontSize: "16px",
    color: "#1e293b",
    margin: "0 0 12px 0",
  },
  summaryItem: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "6px",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "16px",
    color: "#1e293b",
    borderTop: "1px solid #e2e8f0",
    paddingTop: "10px",
    marginTop: "10px",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    marginBottom: "14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    marginBottom: "14px",
    resize: "none",
    height: "80px",
    boxSizing: "border-box",
    outline: "none",
  },
  paymentSection: {
    marginBottom: "20px",
  },
  paymentTitle: {
    fontSize: "15px",
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: "10px",
  },
  paymentOptions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  paymentBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  },
  error: {
    color: "#dc2626",
    fontSize: "13px",
    marginBottom: "10px",
    textAlign: "center",
  },
  success: {
    color: "#16a34a",
    fontSize: "13px",
    marginBottom: "10px",
    textAlign: "center",
  },
  orderBtn: {
    width: "100%",
    padding: "12px",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
  },
};

export default Checkout;