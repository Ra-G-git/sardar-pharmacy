import { useState } from "react";
import { auth, db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useCart } from "./CartContext";
import { downloadReceipt, printReceipt, whatsappReceipt } from "./Receipt";

function Checkout({ onClose }) {
  const { cart, clearCart } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [lastOrderId, setLastOrderId] = useState("");
  const [lastOrderItems, setLastOrderItems] = useState([]);
  const [lastTotal, setLastTotal] = useState("");

  // Prescription states
  const [prescriptions, setPrescriptions] = useState([]); // [{file, preview}]
  const [uploadingPresc, setUploadingPresc] = useState(false);

  const total = cart.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  function handlePrescriptionAdd(e) {
    const files = Array.from(e.target.files);
    const newPrescriptions = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPrescriptions((prev) => [...prev, ...newPrescriptions]);
    // reset input so same file can be added again if needed
    e.target.value = "";
  }

  function removePrescription(index) {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadPrescriptionToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "prescriptions");
    formData.append("folder", "sardar-pharmacy/prescriptions");
    const response = await fetch(
      "https://api.cloudinary.com/v1_1/dbzyb0nnj/image/upload",
      { method: "POST", body: formData }
    );
    const data = await response.json();
    return data.secure_url;
  }

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
      const orderItems = cart.map((item) => ({
        name: item.medicine_name,
        category: item.category_name,
        price: item.price,
        quantity: item.quantity,
        unit: item.unit,
        unit_size: item.unit_size,
        strength: item.strength,
      }));

      // Place the order first
      const ref = await addDoc(collection(db, "orders"), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        name,
        phone,
        address,
        paymentMethod,
        items: orderItems,
        total: total.toFixed(2),
        status: "pending",
        hasPrescription: prescriptions.length > 0,
        createdAt: serverTimestamp(),
      });

      const orderId = ref.id;

      // Upload prescriptions if any
      if (prescriptions.length > 0) {
        setUploadingPresc(true);
        for (const presc of prescriptions) {
          const imageUrl = await uploadPrescriptionToCloudinary(presc.file);
          await addDoc(collection(db, "prescriptions"), {
            userId: auth.currentUser.uid,
            userEmail: auth.currentUser.email,
            imageUrl,
            note: "",
            status: "pending",
            orderId,           // linked to this order
            uploadedAt: serverTimestamp(),
          });
        }
        setUploadingPresc(false);
      }

      setLastOrderId(orderId);
      setLastOrderItems(orderItems);
      setLastTotal(total.toFixed(2));
      clearCart();
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  }

  if (success) {
    return (
      <div style={styles.overlay}>
        <div style={styles.successBox}>
          <div style={styles.successIcon}>🎉</div>
          <h2 style={styles.successTitle}>Order Placed!</h2>
          <p style={styles.successText}>
            Thank you! Your order has been received. We'll contact you at <strong>{phone}</strong> shortly.
          </p>
          <div style={styles.receiptButtons}>
            <button style={styles.printBtn} onClick={() => printReceipt({ id: lastOrderId, name, phone, address, paymentMethod, items: lastOrderItems, total: lastTotal, status: "pending", createdAt: new Date().toLocaleString() })}>
              🖨️ Print Receipt
            </button>
            <button style={styles.downloadBtn} onClick={() => downloadReceipt({ id: lastOrderId, name, phone, address, paymentMethod, items: lastOrderItems, total: lastTotal, status: "pending", createdAt: new Date().toLocaleString() })}>
              📥 Download PDF
            </button>
            <button style={styles.whatsappBtn} onClick={() => whatsappReceipt({ id: lastOrderId, name, phone, address, paymentMethod, items: lastOrderItems, total: lastTotal, status: "pending", createdAt: new Date().toLocaleString() })}>
              💬 Send WhatsApp
            </button>
          </div>
          <button onClick={onClose} style={styles.successBtn}>Back to Shopping</button>
        </div>
      </div>
    );
  }

  const isLoading = loading || uploadingPresc;

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Checkout</h2>
            <p style={styles.subtitle}>{cart.length} item{cart.length !== 1 ? "s" : ""} • ৳{total.toFixed(2)}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          {/* Order Summary */}
          <div style={styles.orderSummary}>
            <h3 style={styles.sectionTitle}>📦 Order Summary</h3>
            {cart.map((item, index) => (
              <div key={index} style={styles.summaryItem}>
                <span style={styles.summaryName}>💊 {item.medicine_name} ×{item.quantity}</span>
                <span style={styles.summaryPrice}>৳{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div style={styles.summaryTotal}>
              <strong>Total</strong>
              <strong style={styles.totalAmt}>৳{total.toFixed(2)}</strong>
            </div>
          </div>

          {/* Delivery Details */}
          <h3 style={styles.sectionTitle}>📍 Delivery Details</h3>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input type="text" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Phone Number</label>
            <input type="text" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Delivery Address</label>
            <textarea placeholder="House, Road, Area, Dhaka" value={address} onChange={(e) => setAddress(e.target.value)} style={styles.textarea} />
          </div>

          {/* Prescription Upload */}
          <div style={styles.prescSection}>
            <div style={styles.prescHeader}>
              <div>
                <h3 style={{ ...styles.sectionTitle, margin: 0 }}>📋 Prescription</h3>
                <p style={styles.prescSubtitle}>Optional — attach if your medicines require one</p>
              </div>
              <label htmlFor="checkoutPrescInput" style={styles.addPrescBtn}>
                + Add
              </label>
              <input
                id="checkoutPrescInput"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePrescriptionAdd}
                style={{ display: "none" }}
              />
            </div>

            {prescriptions.length > 0 && (
              <div style={styles.prescPreviewRow}>
                {prescriptions.map((p, i) => (
                  <div key={i} style={styles.prescThumbWrap}>
                    <img src={p.preview} alt="prescription" style={styles.prescThumb} />
                    <button onClick={() => removePrescription(i)} style={styles.prescRemoveBtn}>✕</button>
                  </div>
                ))}
                <label htmlFor="checkoutPrescInput" style={styles.prescAddMore}>
                  <span style={{ fontSize: "22px" }}>+</span>
                  <span style={{ fontSize: "11px" }}>Add more</span>
                </label>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <h3 style={styles.sectionTitle}>💳 Payment Method</h3>
          <div style={styles.paymentOptions}>
            {[
              { id: "cash", label: "💵 Cash on Delivery" },
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
                  border: paymentMethod === method.id ? "2px solid #1e40af" : "2px solid transparent",
                }}
              >
                {method.label}
              </button>
            ))}
          </div>

          {error && <div style={styles.error}>⚠️ {error}</div>}

          <button
            onClick={handleOrder}
            style={{ ...styles.orderBtn, opacity: isLoading ? 0.7 : 1, cursor: isLoading ? "not-allowed" : "pointer" }}
            disabled={isLoading}
          >
            {uploadingPresc ? "Uploading prescriptions..." : loading ? "Placing Order..." : "Place Order →"}
          </button>
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
    zIndex: 3000,
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
    maxWidth: "500px",
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
  body: { padding: "24px 28px", overflowY: "auto", flex: 1 },
  orderSummary: {
    backgroundColor: "#f8fafc",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "24px",
    border: "1px solid #e2e8f0",
  },
  sectionTitle: { fontSize: "15px", fontWeight: "700", color: "#1e293b", marginBottom: "14px" },
  summaryItem: { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748b", marginBottom: "8px" },
  summaryName: { flex: 1 },
  summaryPrice: { fontWeight: "600", color: "#1e293b" },
  summaryTotal: {
    display: "flex",
    justifyContent: "space-between",
    borderTop: "1px solid #e2e8f0",
    paddingTop: "12px",
    marginTop: "8px",
    fontSize: "15px",
    color: "#1e293b",
  },
  totalAmt: { color: "#1e40af", fontSize: "18px" },
  inputGroup: { marginBottom: "16px" },
  label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" },
  input: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: "12px",
    border: "2px solid #e2e8f0",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: "12px",
    border: "2px solid #e2e8f0",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    resize: "none",
    height: "90px",
  },
  // Prescription section
  prescSection: {
    backgroundColor: "#f0fdf4",
    border: "1.5px dashed #86efac",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "20px",
  },
  prescHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  prescSubtitle: {
    fontSize: "12px",
    color: "#64748b",
    margin: "4px 0 0 0",
  },
  addPrescBtn: {
    backgroundColor: "#16a34a",
    color: "white",
    padding: "8px 16px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    flexShrink: 0,
  },
  prescPreviewRow: {
    display: "flex",
    gap: "10px",
    marginTop: "12px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  prescThumbWrap: {
    position: "relative",
    width: "72px",
    height: "72px",
  },
  prescThumb: {
    width: "72px",
    height: "72px",
    objectFit: "cover",
    borderRadius: "10px",
    border: "2px solid #bbf7d0",
  },
  prescRemoveBtn: {
    position: "absolute",
    top: "-6px",
    right: "-6px",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: "20px",
    height: "20px",
    fontSize: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    padding: 0,
  },
  prescAddMore: {
    width: "72px",
    height: "72px",
    border: "2px dashed #86efac",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#16a34a",
    gap: "4px",
    backgroundColor: "white",
  },
  paymentOptions: { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" },
  paymentBtn: {
    padding: "10px 18px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  error: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    padding: "12px 16px",
    borderRadius: "10px",
    fontSize: "13px",
    marginBottom: "16px",
    border: "1px solid #fecaca",
  },
  orderBtn: {
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
    maxWidth: "400px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  successIcon: { fontSize: "64px", marginBottom: "16px" },
  successTitle: { fontSize: "28px", fontWeight: "800", color: "#1e293b", marginBottom: "12px" },
  successText: { color: "#64748b", fontSize: "15px", lineHeight: "1.6", marginBottom: "28px" },
  successBtn: {
    padding: "14px 32px",
    background: "linear-gradient(135deg, #1e40af, #2563eb)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
  },
  receiptButtons: { display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", marginBottom: "16px" },
  printBtn: { padding: "12px 18px", backgroundColor: "#1e293b", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  downloadBtn: { padding: "12px 18px", backgroundColor: "#1e40af", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  whatsappBtn: { padding: "12px 18px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
};

export default Checkout;