import { createContext, useState, useContext } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  // altPrefs: { [slug]: { allow: bool, preferredMed: obj|null } }
  const [altPrefs, setAltPrefs] = useState({});

  function addToCart(medicine) {
    setCart((prev) => {
      const exists = prev.find((item) => item.slug === medicine.slug);

      if (medicine.setQuantity) {
        if (medicine.quantity === 0) {
          return prev.filter((item) => item.slug !== medicine.slug);
        }
        if (exists) {
          return prev.map((item) =>
            item.slug === medicine.slug
              ? { ...item, quantity: medicine.quantity }
              : item
          );
        }
        return [...prev, { ...medicine, quantity: medicine.quantity }];
      }

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
    setAltPrefs({});
  }

  // Set whether a cart item allows alternatives + which preferred brand
  function setAltPref(slug, allow, preferredMed = null) {
    setAltPrefs((prev) => ({
      ...prev,
      [slug]: { allow, preferredMed: allow ? preferredMed : null },
    }));
  }

  function getAltPref(slug) {
    return altPrefs[slug] || { allow: false, preferredMed: null };
  }

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, altPrefs, setAltPref, getAltPref }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}