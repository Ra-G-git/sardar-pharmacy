import { createContext, useState, useContext } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  function addToCart(medicine) {
    setCart((prev) => {
      const exists = prev.find((item) => item.slug === medicine.slug);

      // Decrement mode: reduce by 1 or remove if qty hits 0
      if (medicine.decrement) {
        if (!exists) return prev;
        if (exists.quantity <= 1) {
          return prev.filter((item) => item.slug !== medicine.slug);
        }
        return prev.map((item) =>
          item.slug === medicine.slug
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }

      // Normal add: increment if exists, otherwise add with qty 1
      if (exists) {
        return prev.map((item) =>
          item.slug === medicine.slug
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...medicine, quantity: 1 }];
    });
  }

  function removeFromCart(slug) {
    setCart((prev) => prev.filter((item) => item.slug !== slug));
  }

  function clearCart() {
    setCart([]);
  }

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}