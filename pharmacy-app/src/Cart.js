import { useCart } from "./CartContext";
import { useState } from "react";
import Checkout from "./Checkout";

function Cart({ onClose }) {
  const { cart, removeFromCart, clearCart } = useCart();

  const total = cart.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <div style={styles.overlay}>
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <h2 style={styles.title}>🛒 Your Cart</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {cart.length === 0 ? (
          <p style={styles.empty}>Your cart is empty!</p>
        ) : (
          <>
            {cart.map((item, index) => (
              <div key={index} style={styles.item}>
                <div>
                  <p style={styles.itemName}>{item.medicine_name}</p>
                  <p style={styles.itemDetail}>{item.category_name} • {item.strength}</p>
                  <p style={styles.itemPrice}>
                    ৳{item.price} × {item.quantity} = ৳{(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.slug)}
                  style={styles.removeBtn}
                >
                  🗑️
                </button>
              </div>
            ))}

            <div style={styles.total}>
              <strong>Total: ৳{total.toFixed(2)}</strong>
            </div>

            <button onClick={clearCart} style={styles.clearBtn}>
              Clear Cart
            </button>

            <button
              style={styles.checkoutBtn}
              onClick={() => setCheckoutOpen(true)}
            >
              Proceed to Checkout →
            </button>

            {checkoutOpen && <Checkout onClose={() => setCheckoutOpen(false)} />}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    right: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 1000,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "380px",
    height: "100%",
    backgroundColor: "white",
    padding: "24px",
    overflowY: "auto",
    boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: {
    fontSize: "22px",
    color: "#1e40af",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#64748b",
  },
  empty: {
    textAlign: "center",
    color: "#94a3b8",
    marginTop: "60px",
    fontSize: "16px",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #e2e8f0",
  },
  itemName: {
    fontWeight: "bold",
    color: "#1e293b",
    margin: "0 0 4px 0",
    fontSize: "15px",
  },
  itemDetail: {
    fontSize: "12px",
    color: "#64748b",
    margin: "0 0 4px 0",
  },
  itemPrice: {
    fontSize: "13px",
    color: "#16a34a",
    fontWeight: "bold",
    margin: 0,
  },
  removeBtn: {
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
  },
  total: {
    textAlign: "right",
    fontSize: "18px",
    color: "#1e293b",
    margin: "20px 0",
  },
  clearBtn: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    marginBottom: "10px",
  },
  checkoutBtn: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
  },
};

export default Cart;