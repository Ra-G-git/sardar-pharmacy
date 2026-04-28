import { useState, useEffect } from "react";
import { useCart } from "./CartContext";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import Cart from "./Cart";
import Auth from "./Auth";
import AdminDashboard from "./AdminDashboard";
import MyOrders from "./MyOrders";
import PrescriptionUpload from "./PrescriptionUpload";

function Navbar() {
  const { cart } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  async function handleLogout() {
    await signOut(auth);
    setMenuOpen(false);
  }

  function close() {
    setMenuOpen(false);
  }

  return (
    <>
      <nav style={styles.navbar}>
        <h2 style={styles.logo}>💊 Sardar Pharmacy</h2>
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {menuOpen && (
        <div style={styles.mobileMenu}>
          <button style={styles.mobileLink} onClick={() => { document.getElementById("home").scrollIntoView({ behavior: "smooth" }); close(); }}>🏠 Home</button>
          <button style={styles.mobileLink} onClick={() => { document.getElementById("medicines").scrollIntoView({ behavior: "smooth" }); close(); }}>💊 Medicines</button>
          <button style={styles.mobileLink} onClick={() => { setOrdersOpen(true); close(); }}>📦 My Orders</button>
          <button style={styles.mobileLink} onClick={() => { document.getElementById("contact").scrollIntoView({ behavior: "smooth" }); close(); }}>📞 Contact</button>
          <button style={styles.mobileLink} onClick={() => { setPrescriptionOpen(true); close(); }}>📋 Upload Prescription</button>
          {user && user.email === "razeesardar@gmail.com" && (
            <button style={styles.mobileLink} onClick={() => { setAdminOpen(true); close(); }}>🔧 Admin Dashboard</button>
          )}
          <button style={styles.mobileLink} onClick={() => { setCartOpen(true); close(); }}>
            🛒 Cart {totalItems > 0 && `(${totalItems})`}
          </button>
          {user ? (
            <>
              <p style={styles.mobileEmail}>👤 {user.email}</p>
              <button style={{ ...styles.mobileLink, color: "#fca5a5" }} onClick={handleLogout}>🚪 Logout</button>
            </>
          ) : (
            <button style={styles.mobileLink} onClick={() => { setAuthOpen(true); close(); }}>👤 Login / Register</button>
          )}
        </div>
      )}

      <div className="desktop-bar" style={styles.desktopBar}>
        <button style={styles.navLink} onClick={() => document.getElementById("home").scrollIntoView({ behavior: "smooth" })}>Home</button>
        <button style={styles.navLink} onClick={() => document.getElementById("medicines").scrollIntoView({ behavior: "smooth" })}>Medicines</button>
        <button style={styles.navLink} onClick={() => setOrdersOpen(true)}>Orders</button>
        <button style={styles.navLink} onClick={() => document.getElementById("contact").scrollIntoView({ behavior: "smooth" })}>Contact</button>
        <button style={styles.prescriptionBtn} onClick={() => setPrescriptionOpen(true)}>📋 Prescription</button>
        {user && user.email === "razeesardar@gmail.com" && (
          <button onClick={() => setAdminOpen(true)} style={styles.adminBtn}>🔧 Admin</button>
        )}
        {user ? (
          <>
            <span style={styles.userEmail}>👤 {user.email}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
          </>
        ) : (
          <button onClick={() => setAuthOpen(true)} style={styles.loginBtn}>Login / Register</button>
        )}
        <button onClick={() => setCartOpen(true)} style={styles.cartBtn}>
          🛒 Cart {totalItems > 0 && <span style={styles.badge}>{totalItems}</span>}
        </button>
      </div>

      {cartOpen && <Cart onClose={() => setCartOpen(false)} />}
      {authOpen && <Auth onClose={() => setAuthOpen(false)} />}
      {adminOpen && <AdminDashboard onClose={() => setAdminOpen(false)} />}
      {ordersOpen && <MyOrders onClose={() => setOrdersOpen(false)} />}
      {prescriptionOpen && <PrescriptionUpload onClose={() => setPrescriptionOpen(false)} />}
    </>
  );
}

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2563eb",
    padding: "15px 20px",
  },
  logo: {
    color: "white",
    margin: 0,
    fontSize: "18px",
  },
  desktopBar: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    padding: "10px 20px",
    flexWrap: "wrap",
  },
  navLink: {
    color: "white",
    background: "none",
    border: "none",
    fontSize: "15px",
    cursor: "pointer",
  },
  loginBtn: {
    backgroundColor: "white",
    color: "#2563eb",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  logoutBtn: {
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  userEmail: {
    color: "white",
    fontSize: "13px",
    maxWidth: "150px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cartBtn: {
    backgroundColor: "white",
    color: "#2563eb",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  badge: {
    backgroundColor: "#dc2626",
    color: "white",
    borderRadius: "50%",
    padding: "2px 7px",
    fontSize: "12px",
    marginLeft: "4px",
    fontWeight: "bold",
  },
  prescriptionBtn: {
    backgroundColor: "#16a34a",
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  adminBtn: {
    backgroundColor: "#1e293b",
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  mobileMenu: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#1e40af",
    zIndex: 99,
  },
  mobileLink: {
    background: "none",
    border: "none",
    color: "white",
    fontSize: "16px",
    padding: "14px 24px",
    textAlign: "left",
    cursor: "pointer",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  mobileEmail: {
    color: "#93c5fd",
    fontSize: "13px",
    padding: "8px 24px",
    margin: 0,
  },
};

export default Navbar;