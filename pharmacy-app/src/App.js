import Navbar from "./Navbar";
import Hero from "./Hero";
import MedicineList from "./MedicineList";
import { CartProvider } from "./CartContext";

function App() {
  return (
    <CartProvider>
      <div>
        <Navbar />
        <Hero />
        <MedicineList />
      </div>
    </CartProvider>
  );
}

export default App;