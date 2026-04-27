import { useState } from "react";
import { useCart } from "./CartContext";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import Cart from "./Cart";
import Auth from "./Auth";
import PrescriptionUpload from "./PrescriptionUpload";
import AdminDashboard from "./AdminDashboard";
import MyOrders from "./MyOrders";

function Navbar() {
  const { cart } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
    
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const [adminOpen, setAdminOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);

  auth.onAuthStateChanged((currentUser) => {
    setUser(currentUser);
  });

  async function handleLogout() {
    await signOut(auth);
  }

  return (
    <>
      <nav style={styles.navbar}>
        <h2 style={styles.logo}>💊 Sardar Pharmacy</h2>
        <div style={styles.links}>
          <button style={styles.navLink} onClick={() => document.getElementById("home").scrollIntoView({ behavior: "smooth" })}>Home</button>
          <button style={styles.navLink} onClick={() => document.getElementById("medicines").scrollIntoView({ behavior: "smooth" })}>Medicines</button>
          <button style={styles.navLink} onClick={() => setOrdersOpen(true)}>Orders</button>
          <button style={styles.navLink} onClick={() => document.getElementById("contact").scrollIntoView({ behavior: "smooth" })}>Contact</button>

          {user ? (
            <>
              <span style={styles.userEmail}>👤 {user.email}</span>
              <button onClick={handleLogout} style={styles.logoutBtn}>
                Logout
              </button>
            </>
          ) : (
            <button onClick={() => setAuthOpen(true)} style={styles.loginBtn}>
              Login / Register
            </button>
          )}

          <button onClick={() => setPrescriptionOpen(true)} style={styles.loginBtn}>
            📋 Prescription
            </button>

          <button
            onClick={() => setCartOpen(true)}
            style={styles.cartBtn}
          >
            🛒 Cart
            {totalItems > 0 && (
              <span style={styles.badge}>{totalItems}</span>
            )}
          </button>
        
        {user && user.email === "razeesardar@gmail.com" && (
        <button onClick={() => setAdminOpen(true)} style={styles.adminBtn}>
            🔧 Admin
        </button>
        )}
        </div>
      </nav>

      {cartOpen && <Cart onClose={() => setCartOpen(false)} />}
      {authOpen && <Auth onClose={() => setAuthOpen(false)} />}
        {prescriptionOpen && <PrescriptionUpload onClose={() => setPrescriptionOpen(false)} />}
        {adminOpen && <AdminDashboard onClose={() => setAdminOpen(false)} />}
      {ordersOpen && <MyOrders onClose={() => setOrdersOpen(false)} />}
    </>
  );
}

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2563eb",
    padding: "15px 30px",
  },
  logo: {
    color: "white",
    margin: 0,
  },
  links: {
    display: "flex",
    gap: "20px",
    alignItems: "center",
  },
  link: {
    color: "white",
    textDecoration: "none",
    fontSize: "16px",
  },
  loginBtn: {
    backgroundColor: "white",
    color: "#2563eb",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  logoutBtn: {
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  userEmail: {
    color: "white",
    fontSize: "14px",
  },
  cartBtn: {
    backgroundColor: "white",
    color: "#2563eb",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: "bold",
    position: "relative",
  },
  badge: {
    backgroundColor: "#dc2626",
    color: "white",
    borderRadius: "50%",
    padding: "2px 7px",
    fontSize: "12px",
    marginLeft: "6px",
    fontWeight: "bold",
  },
  adminBtn: {
  backgroundColor: "#1e293b",
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: "8px",
  fontSize: "15px",
  cursor: "pointer",
  fontWeight: "bold",
},
navLink: {
  color: "white",
  background: "none",
  border: "none",
  fontSize: "16px",
  cursor: "pointer",
},
};

export default Navbar;