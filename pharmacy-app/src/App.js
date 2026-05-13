import Navbar from "./Navbar";
import Hero from "./Hero";
import MedicineList from "./MedicineList";
import { CartProvider } from "./CartContext";
import "./App.css";

function App() {
  return (
    <CartProvider>
      <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <Navbar />
        <div id="home">
          <Hero />
        </div>
        <div id="medicines">
          <MedicineList />
        </div>
        <div id="contact" style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0ea5e9 100%)",
          padding: "60px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "700px",
            margin: "0 auto",
          }}>
            <div style={{
              display: "inline-block",
              backgroundColor: "rgba(255,255,255,0.15)",
              color: "white",
              padding: "8px 20px",
              borderRadius: "50px",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "24px",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}>
              💊 Sardar Pharmacy
            </div>

            <div style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "16px",
              marginBottom: "32px",
            }}>
              <span style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: "13px",
                backgroundColor: "rgba(255,255,255,0.1)",
                padding: "6px 14px",
                borderRadius: "50px",
              }}>📍 10/1 Pallabi, Mirpur-11½, Dhaka-1216</span>

              <span style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: "13px",
                backgroundColor: "rgba(255,255,255,0.1)",
                padding: "6px 14px",
                borderRadius: "50px",
              }}>📞 01559084327</span>

              <span style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: "13px",
                backgroundColor: "rgba(255,255,255,0.1)",
                padding: "6px 14px",
                borderRadius: "50px",
              }}>🕐 Open 10:00 AM – 11:50 PM</span>
            </div>

            <div style={{
              width: "100%",
              height: "1px",
              backgroundColor: "rgba(255,255,255,0.15)",
              marginBottom: "24px",
            }} />

            <p style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "13px",
              margin: 0,
            }}>© 2026 Sardar Pharmacy. All rights reserved.</p>
          </div>
        </div>
      </div>
    </CartProvider>
  );
}

export default App;