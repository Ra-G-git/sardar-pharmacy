import Navbar from "./Navbar";
import Hero from "./Hero";
import MedicineList from "./MedicineList";
import { CartProvider } from "./CartContext";

function App() {
  return (
    <CartProvider>
      <div>
        <Navbar />
        <div id="home">
          <Hero />
        </div>
        <div id="medicines">
          <MedicineList />
        </div>
        <div id="contact" style={{
          backgroundColor: "#1e293b",
          color: "white",
          padding: "40px 30px",
          textAlign: "center"
        }}>
          <h3 style={{ color: "white", marginBottom: "10px" }}>💊 Sardar Pharmacy</h3>
          <p style={{ color: "#94a3b8", margin: "6px 0" }}>📍 10/1 Pallabi, Mirpur-11½, Dhaka-1216</p>
          <p style={{ color: "#94a3b8", margin: "6px 0" }}>📞 01559084327</p>
          <p style={{ color: "#94a3b8", margin: "6px 0" }}>🕐 Open: 8AM – 11PM, Every Day</p>
          <p style={{ color: "#64748b", marginTop: "20px", fontSize: "13px" }}>© 2026 Sardar Pharmacy. All rights reserved.</p>
        </div>
      </div>
    </CartProvider>
  );
}

export default App;