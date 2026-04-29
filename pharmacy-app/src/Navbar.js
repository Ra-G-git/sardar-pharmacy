import { useState, useEffect } from "react";
import { useCart } from "./CartContext";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import Cart from "./Cart";
import Auth from "./Auth";
import AdminDashboard from "./AdminDashboard";
import MyOrders from "./MyOrders";
import PrescriptionUpload from "./PrescriptionUpload";
import POS from "./POS";

function Navbar() {
  const { cart } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [posOpen, setPosOpen] = useState(false);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function handleLogout() {
    await signOut(auth);
    setMenuOpen(false);
  }

  function close() { setMenuOpen(false); }

  return (
    <>
      <nav style={{
        ...styles.navbar,
        boxShadow: scrolled ? "0 4px 20px rgba(0,0,0,0.15)" : "none",
      }}>
        <div style={styles.logoSection}>
          <span style={styles.logoIcon}>💊</span>
          <div>
            <h2 style={styles.logoText}>Sardar Pharmacy</h2>
            <p style={styles.logoSub}>Mirpur, Dhaka</p>
          </div>
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {menuOpen && (
        <div style={styles.mobileMenu}>
          {[
            { icon: "🏠", label: "Home", action: () => { document.getElementById("home").scrollIntoView({ behavior: "smooth" }); close(); }},
            { icon: "💊", label: "Medicines", action: () => { document.getElementById("medicines").scrollIntoView({ behavior: "smooth" }); close(); }},
            { icon: "📦", label: "My Orders", action: () => { setOrdersOpen(true); close(); }},
            { icon: "📋", label: "Upload Prescription", action: () => { setPrescriptionOpen(true); close(); }},
            { icon: "📞", label: "Contact", action: () => { document.getElementById("contact").scrollIntoView({ behavior: "smooth" }); close(); }},
          ].map((item) => (
            <button key={item.label} style={styles.mobileLink} onClick={item.action}>
              <span style={styles.mobileLinkIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}

          {user && user.email === "razeesardar@gmail.com" && (
            <button style={{ ...styles.mobileLink, color: "#fbbf24" }} onClick={() => { setAdminOpen(true); close(); }}>
              <span style={styles.mobileLinkIcon}>🔧</span> Admin Dashboard
            </button>
          )}
          {user && user.email === "razeesardar@gmail.com" && (
            <button style={{ ...styles.mobileLink, color: "#fbbf24" }} onClick={() => { setPosOpen(true); close(); }}>
              <span style={styles.mobileLinkIcon}>🏪</span> POS
            </button>
          )}

          <div style={styles.mobileDivider} />

          <button style={styles.mobileLink} onClick={() => { setCartOpen(true); close(); }}>
            <span style={styles.mobileLinkIcon}>🛒</span>
            Cart {totalItems > 0 && <span style={styles.mobileBadge}>{totalItems}</span>}
          </button>

          {user ? (
            <>
              <p style={styles.mobileEmail}>👤 {user.email}</p>
              <button style={{ ...styles.mobileLink, color: "#fca5a5" }} onClick={handleLogout}>
                <span style={styles.mobileLinkIcon}>🚪</span> Logout
              </button>
            </>
          ) : (
            <button style={{ ...styles.mobileLink, color: "#93c5fd" }} onClick={() => { setAuthOpen(true); close(); }}>
              <span style={styles.mobileLinkIcon}>👤</span> Login / Register
            </button>
          )}
        </div>
      )}

      {cartOpen && <Cart onClose={() => setCartOpen(false)} />}
      {authOpen && <Auth onClose={() => setAuthOpen(false)} />}
      {adminOpen && <AdminDashboard onClose={() => setAdminOpen(false)} />}
      {ordersOpen && <MyOrders onClose={() => setOrdersOpen(false)} />}
      {prescriptionOpen && <PrescriptionUpload onClose={() => setPrescriptionOpen(false)} />}
      {posOpen && <POS onClose={() => setPosOpen(false)} />}
    </>
  );
}

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
    padding: "14px 24px",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    transition: "box-shadow 0.3s ease",
  },
  logoSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoIcon: {
    fontSize: "32px",
  },
  logoText: {
    color: "white",
    fontSize: "20px",
    fontWeight: "700",
    margin: 0,
    letterSpacing: "-0.3px",
  },
  logoSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: "11px",
    margin: 0,
  },
  mobileMenu: {
    position: "fixed",
    top: "70px",
    right: 0,
    width: "280px",
    bottom: 0,
    backgroundColor: "#1e3a8a",
    zIndex: 999,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    boxShadow: "-4px 0 20px rgba(0,0,0,0.3)",
  },
  mobileLink: {
    background: "none",
    border: "none",
    color: "white",
    fontSize: "17px",
    padding: "18px 28px",
    textAlign: "left",
    cursor: "pointer",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontWeight: "500",
  },
  mobileLinkIcon: {
    fontSize: "20px",
    width: "28px",
  },
  mobileBadge: {
    backgroundColor: "#ef4444",
    color: "white",
    borderRadius: "50%",
    padding: "2px 8px",
    fontSize: "12px",
    fontWeight: "bold",
    marginLeft: "8px",
  },
  mobileDivider: {
    height: "1px",
    backgroundColor: "rgba(255,255,255,0.15)",
    margin: "8px 0",
  },
  mobileEmail: {
    color: "#93c5fd",
    fontSize: "13px",
    padding: "12px 28px",
    margin: 0,
  },
};

export default Navbar;