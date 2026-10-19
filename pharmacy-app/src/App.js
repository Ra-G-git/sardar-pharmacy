import Navbar from "./Navbar";
import Hero from "./Hero";
import MedicineList from "./MedicineList";
import { CartProvider } from "./CartContext";
import Services from "./Services";
import Reveal from "./Reveal";
import Logo from "./Logo";
import { useEffect, useState } from "react";
import "./App.css";

function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div style={{ position: "fixed", top: 0, left: 0, height: "3px", width: "100%", background: "#E8A33D", transformOrigin: "left", transform: `scaleX(${p})`, zIndex: 6000, pointerEvents: "none" }} />;
}

function App() {
  return (
    <CartProvider>
      <div style={{ backgroundColor: "#FAF7F1", minHeight: "100vh" }}>
        <ScrollProgress />
        <Navbar />
        <div id="home">
          <Hero />
        </div>
        <Services />
        <div id="medicines">
          <MedicineList />
        </div>
        <div id="contact" style={styles.contact}>
          <div style={styles.watermark}>
            <div style={styles.watermarkV} />
            <div style={styles.watermarkH} />
          </div>

          <div style={styles.contactInner}>
            <Reveal>
            <div style={styles.contactHead}>
              <Logo plate style={styles.contactLogo} />
              <div>
                <h2 style={styles.contactTitle}>Sardar Pharmacy</h2>
                <p style={styles.contactTag}>Caring for Mirpur's health, beyond the counter</p>
              </div>
            </div>
            </Reveal>

            <Reveal delay={120}>
            <div style={styles.contactGrid} className="contact-grid">
              <div style={styles.contactCol}>
                <span style={styles.contactLabel}>Visit us</span>
                <span style={styles.contactValue}>10/1, Pallabi, Dhaka-1216</span>
              </div>
              <div style={styles.contactCol}>
                <span style={styles.contactLabel}>Call us</span>
                <span style={styles.contactValue}>01559084327</span>
              </div>
              <div style={styles.contactCol}>
                <span style={styles.contactLabel}>Hours</span>
                <span style={styles.contactValue}>10:00 AM – 11:50 PM, daily</span>
              </div>
            </div>

            </Reveal>

            <div style={styles.contactDivider} />

            <p style={styles.copyright}>© 2026 Sardar Pharmacy. All rights reserved.</p>
          </div>
        </div>
      </div>
    </CartProvider>
  );
}

const styles = {
  contact: {
    background: "linear-gradient(160deg, #14291A 0%, #24512F 100%)",
    padding: "72px 24px 40px",
    position: "relative",
    overflow: "hidden",
  },
  watermark: {
    position: "absolute",
    top: "-10%",
    right: "-6%",
    width: "340px",
    height: "340px",
    opacity: 0.06,
    pointerEvents: "none",
  },
  watermarkV: {
    position: "absolute",
    left: "50%",
    top: "10%",
    bottom: "10%",
    width: "26%",
    transform: "translateX(-50%)",
    borderRadius: "20px",
    backgroundColor: "#ffffff",
  },
  watermarkH: {
    position: "absolute",
    top: "50%",
    left: "10%",
    right: "10%",
    height: "26%",
    transform: "translateY(-50%)",
    borderRadius: "20px",
    backgroundColor: "#ffffff",
  },
  contactInner: {
    position: "relative",
    zIndex: 1,
    maxWidth: "760px",
    margin: "0 auto",
  },
  contactHead: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "40px",
  },
  contactLogo: {
    height: "44px",
    width: "auto",
  },
  contactTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    color: "white",
    fontSize: "22px",
    fontWeight: "700",
    margin: 0,
  },
  contactTag: {
    color: "rgba(255,255,255,0.6)",
    fontSize: "13px",
    margin: "2px 0 0 0",
  },
  contactGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(160px, 1fr))",
    gap: "24px",
    borderTop: "1px solid rgba(255,255,255,0.12)",
    paddingTop: "32px",
  },
  contactCol: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  contactLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: "12px",
    fontWeight: "600",
  },
  contactValue: {
    color: "white",
    fontSize: "15px",
    fontWeight: "500",
  },
  contactDivider: {
    width: "100%",
    height: "1px",
    backgroundColor: "rgba(255,255,255,0.12)",
    margin: "36px 0 20px",
  },
  copyright: {
    color: "rgba(255,255,255,0.4)",
    fontSize: "13px",
    margin: 0,
  },
};

export default App;
