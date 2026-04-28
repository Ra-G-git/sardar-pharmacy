import { useState } from "react";
import { useCart } from "./CartContext";
import Checkout from "./Checkout";
import { getMedicineEmoji } from "./medicineUtils";

function Cart({ onClose }) {
  const { cart, removeFromCart, clearCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const total = cart.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Your Cart 🛒</h2>
            <p style={styles.itemCount}>{cart.length} item{cart.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {cart.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyIcon}>🛒</p>
            <p style={styles.emptyText}>Your cart is empty</p>
            <p style={styles.emptySub}>Add some medicines to get started</p>
          </div>
        ) : (
          <>
            <div style={styles.items}>
              {cart.map((item, index) => (
                <div key={index} style={styles.item}>
                  <div style={styles.itemIcon}>{getMedicineEmoji(item.category_name)}</div>
                  <div style={styles.itemInfo}>
                    <p style={styles.itemName}>{item.medicine_name}</p>
                    <p style={styles.itemDetail}>{item.category_name} • {item.strength} • {item.unit_size > 1 ? item.unit : "per pc"}</p>
                    <p style={styles.itemPrice}>
                      ৳{item.price} × {item.quantity} = <strong>৳{(parseFloat(item.price) * item.quantity).toFixed(2)}</strong>
                    </p>
                  </div>
                  <button onClick={() => removeFromCart(item.slug)} style={styles.removeBtn}>🗑️</button>
                </div>
              ))}
            </div>

            <div style={styles.footer}>
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Total</span>
                <span style={styles.totalAmount}>৳{total.toFixed(2)}</span>
              </div>
              <button onClick={clearCart} style={styles.clearBtn}>Clear Cart</button>
              <button onClick={() => setCheckoutOpen(true)} style={styles.checkoutBtn}>
                Proceed to Checkout →
              </button>
            </div>
          </>
        )}
      </div>

      {checkoutOpen && <Checkout onClose={() => setCheckoutOpen(false)} />}
    </>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 1000,
    backdropFilter: "blur(2px)",
  },
  sidebar: {
    position: "fixed",
    top: 0,
    right: 0,
    width: "min(420px, 100vw)",
    height: "100%",
    backgroundColor: "white",
    zIndex: 1001,
    display: "flex",
    flexDirection: "column",
    boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "24px",
    borderBottom: "1px solid #f1f5f9",
    background: "linear-gradient(135deg, #1e40af, #2563eb)",
  },
  title: {
    fontSize: "22px",
    color: "white",
    fontWeight: "700",
    margin: 0,
  },
  itemCount: {
    color: "rgba(255,255,255,0.7)",
    fontSize: "13px",
    margin: "4px 0 0 0",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    color: "white",
    fontSize: "18px",
    cursor: "pointer",
    borderRadius: "50%",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
  },
  emptyIcon: {
    fontSize: "64px",
    marginBottom: "16px",
  },
  emptyText: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "8px",
  },
  emptySub: {
    fontSize: "14px",
    color: "#94a3b8",
  },
  items: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
  },
  item: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    padding: "16px",
    borderRadius: "12px",
    backgroundColor: "#f8fafc",
    marginBottom: "10px",
    border: "1px solid #f1f5f9",
  },
  itemIcon: {
    fontSize: "28px",
    backgroundColor: "#eff6ff",
    borderRadius: "10px",
    padding: "8px",
    minWidth: "44px",
    textAlign: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: "700",
    color: "#1e293b",
    fontSize: "15px",
    margin: "0 0 4px 0",
  },
  itemDetail: {
    fontSize: "12px",
    color: "#64748b",
    margin: "0 0 6px 0",
  },
  itemPrice: {
    fontSize: "13px",
    color: "#2563eb",
    margin: 0,
  },
  removeBtn: {
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "6px",
  },
  footer: {
    padding: "20px",
    borderTop: "1px solid #f1f5f9",
    backgroundColor: "white",
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
  totalAmount: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#1e40af",
  },
  clearBtn: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "10px",
  },
  checkoutBtn: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #1e40af, #2563eb)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(37,99,235,0.4)",
  },
};

export default Cart;