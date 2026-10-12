import { useState } from "react";
import { getMedicineEmoji, getUnitLabel, getUnitShort } from "./medicineUtils";

// ─── Alt Brands Modal ────────────────────────────────────────────────────────

export function AltBrandsModal({ medicine, alternatives, loading, onClose, addToCart, cart }) {
  const allOptions = [medicine, ...alternatives];

  function getCartQty(slug) {
    const item = cart.find((i) => i.slug === slug);
    return item ? item.quantity : 0;
  }

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.box} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={modalStyles.header}>
          <div>
            <p style={modalStyles.headerLabel}>Alternative Brands</p>
            <h2 style={modalStyles.headerTitle}>{medicine.generic_name || medicine.medicine_name}</h2>
            {medicine.strength && (
              <p style={modalStyles.headerSub}>{medicine.strength}</p>
            )}
          </div>
          <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
        </div>

        {/* List */}
        <div style={modalStyles.list}>
          {loading ? (
            <div style={modalStyles.empty}>
              <p style={{ fontSize: "32px", marginBottom: "8px" }}>⏳</p>
              <p style={{ color: "#5B6B60", fontSize: "14px" }}>Looking for alternative brands…</p>
            </div>
          ) : alternatives.length === 0 ? (
            <div style={modalStyles.empty}>
              <p style={{ fontSize: "32px", marginBottom: "8px" }}>🔍</p>
              <p style={{ color: "#64748b", fontSize: "14px" }}>No alternative brands found for this generic.</p>
            </div>
          ) : (
            allOptions.map((med, i) => {
              const qty = getCartQty(med.slug);
              const isOriginal = i === 0;
              return (
                <div
                  key={med.slug}
                  style={{
                    ...modalStyles.row,
                    background: isOriginal ? "#F1F6EF" : "#fff",
                    border: isOriginal ? "1.5px solid #C7D9C4" : "1.5px solid #f1f5f9",
                  }}
                >
                  <div style={modalStyles.rowLeft}>
                    <span style={modalStyles.rowEmoji}>{getMedicineEmoji(med.category_name)}</span>
                    <div>
                      <div style={modalStyles.rowName}>
                        {med.medicine_name}
                        {isOriginal && (
                          <span style={modalStyles.originalBadge}>Selected</span>
                        )}
                      </div>
                      <div style={modalStyles.rowMeta}>{med.manufacturer_name}</div>
                      {med.unit_size && (
                        <div style={modalStyles.rowMeta}>{getUnitLabel(med)}</div>
                      )}
                    </div>
                  </div>
                  <div style={modalStyles.rowRight}>
                    <div style={modalStyles.rowPrice}>৳{parseFloat(med.price || 0).toFixed(2)}</div>
                    {qty === 0 ? (
                      <button
                        style={modalStyles.addBtn}
                        onClick={() => addToCart({ ...med, quantity: 1 })}
                      >
                        + Add
                      </button>
                    ) : (
                      <div style={modalStyles.qtyRow}>
                        <button
                          style={modalStyles.qtyBtn}
                          onClick={() => addToCart({ ...med, quantity: -1, decrement: true })}
                        >−</button>
                        <span style={modalStyles.qtyNum}>{qty}</span>
                        <button
                          style={modalStyles.qtyBtn}
                          onClick={() => addToCart(med)}
                        >+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Medicine Card ────────────────────────────────────────────────────────────

export function MedicineCard({ med, addToCart, cartItem, onCardClick }) {
  const qty = cartItem ? cartItem.quantity : 0;
  const added = qty > 0;
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");

  function handleAdd(e) {
    e.stopPropagation();
    addToCart({ ...med, quantity: 1 });
  }

  function handleIncrement(e) {
    e.stopPropagation();
    addToCart(med);
  }

  function handleDecrement(e) {
    e.stopPropagation();
    addToCart({ ...med, quantity: -1, decrement: true });
  }

  function handleQtyClick(e) {
    e.stopPropagation();
    setInputVal(String(qty));
    setEditing(true);
  }

  function handleQtyBlur(e) {
    commitEdit(e.target.value);
  }

  function handleQtyKeyDown(e) {
    if (e.key === "Enter") e.target.blur();
    if (e.key === "Escape") setEditing(false);
  }

  function commitEdit(val) {
    const parsed = parseInt(val ?? inputVal, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed !== qty) {
      addToCart({ ...med, setQuantity: true, quantity: parsed });
    }
    setEditing(false);
  }

  return (
    <div style={cardStyles.card} className="medicine-card" onClick={() => onCardClick(med)}>
      <div style={cardStyles.cardTop}>
        <span style={cardStyles.categoryBadge}>{med.category_name}</span>
        <span style={cardStyles.emoji}>{getMedicineEmoji(med.category_name)}</span>
      </div>

      <h3 style={cardStyles.name}>{med.medicine_name}</h3>
      <p style={cardStyles.generic}>{med.generic_name}</p>

      <div style={cardStyles.details}>
        {med.strength && <span style={cardStyles.detail}>💪 {med.strength}</span>}
        <span style={cardStyles.detail}>🏭 {med.manufacturer_name}</span>
        <span style={cardStyles.detail}>📦 {getUnitLabel(med)}</span>
        {/* Stock is intentionally NOT shown to public customers */}
      </div>

      <div style={cardStyles.cardBottom}>
        <div>
          <span style={cardStyles.price}>৳{(parseFloat(med.price) * (qty || 1)).toFixed(2)}</span>
          <p style={cardStyles.unitPrice}>৳{med.price} / {getUnitShort(med)}</p>
        </div>

        {!added ? (
          <button style={cardStyles.addBtn} onClick={handleAdd}>
            + Add
          </button>
        ) : (
          <div style={cardStyles.qtyControls} onClick={(e) => e.stopPropagation()}>
            <button style={cardStyles.qtyBtn} onClick={handleDecrement}>−</button>
            {editing ? (
              <input
                autoFocus
                type="number"
                min="0"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onBlur={handleQtyBlur}
                onKeyDown={handleQtyKeyDown}
                style={cardStyles.qtyInput}
              />
            ) : (
              <span
                style={cardStyles.qtyNum}
                onClick={handleQtyClick}
                title="Click to edit quantity"
              >
                {qty}
              </span>
            )}
            <button style={cardStyles.qtyBtn} onClick={handleIncrement}>+</button>
          </div>
        )}
      </div>

      <div style={cardStyles.clickHint}>🔍 Tap to see alternative brands</div>
    </div>
  );
}

const cardStyles = {
  card: {
    position: "relative",
    backgroundColor: "#FFFFFF",
    borderRadius: "14px",
    padding: "20px",
    border: "1px solid #EFEDE5",
    borderTop: "3px solid #24512F",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    cursor: "pointer",
    height: "100%",
    transition: "box-shadow 0.2s ease, transform 0.15s ease",
  },
  altBadge: {
    position: "absolute",
    top: "12px",
    right: "12px",
    backgroundColor: "#E8A33D",
    color: "#16241A",
    fontSize: "10px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "20px",
    letterSpacing: "0.3px",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  categoryBadge: { backgroundColor: "#E4ECE0", color: "#24512F", fontSize: "11px", fontWeight: "600", padding: "4px 10px", borderRadius: "6px", letterSpacing: "0.2px" },
  emoji: { fontSize: "28px" },
  name: { fontSize: "16px", fontWeight: "700", color: "#16241A", marginTop: "4px" },
  generic: { fontSize: "13px", color: "#5B6B60" },
  details: { display: "flex", flexDirection: "column", gap: "4px", padding: "10px 0", borderTop: "1px solid #F5F3EC", borderBottom: "1px solid #F5F3EC" },
  detail: { fontSize: "12px", color: "#94a3b8" },
  cardBottom: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "4px" },
  price: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "20px", fontWeight: "700", color: "#16241A", display: "block" },
  unitPrice: { fontSize: "11px", color: "#94a3b8", margin: "2px 0 0 0" },
  addBtn: { backgroundColor: "#24512F", color: "white", border: "none", padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  qtyControls: { display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#E4ECE0", borderRadius: "10px", padding: "4px" },
  qtyBtn: { width: "32px", height: "32px", borderRadius: "7px", border: "none", backgroundColor: "#24512F", color: "white", fontSize: "18px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  qtyNum: { fontSize: "16px", fontWeight: "700", color: "#16241A", minWidth: "24px", textAlign: "center", cursor: "text", borderBottom: "1px dashed #9BB59B", paddingBottom: "1px" },
  qtyInput: { width: "40px", textAlign: "center", fontSize: "15px", fontWeight: "700", color: "#16241A", border: "none", borderBottom: "2px solid #24512F", backgroundColor: "transparent", outline: "none", MozAppearance: "textfield" },
  clickHint: { fontSize: "11px", color: "#94a3b8", textAlign: "center", marginTop: "4px" },
};

const modalStyles = {
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(20,29,22,0.55)", zIndex: 4000, display: "flex", justifyContent: "center", alignItems: "center", backdropFilter: "blur(4px)", padding: "20px" },
  box: { backgroundColor: "white", borderRadius: "20px", width: "100%", maxWidth: "520px", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" },
  header: { background: "linear-gradient(135deg, #14291A, #24512F)", padding: "22px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 },
  headerLabel: { color: "rgba(255,255,255,0.7)", fontSize: "12px", fontWeight: "600", letterSpacing: "0.4px", margin: "0 0 4px 0" },
  headerTitle: { fontFamily: "'Space Grotesk', sans-serif", color: "white", fontSize: "18px", fontWeight: "700", margin: 0 },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: "13px", margin: "4px 0 0 0" },
  closeBtn: { background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: "50%", width: "32px", height: "32px", fontSize: "16px", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  list: { overflowY: "auto", flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "10px" },
  empty: { textAlign: "center", padding: "40px 20px" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "12px", padding: "14px", gap: "12px" },
  rowLeft: { display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 },
  rowEmoji: { fontSize: "28px", flexShrink: 0 },
  rowName: { fontWeight: "700", fontSize: "14px", color: "#16241A", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" },
  originalBadge: { backgroundColor: "#E8A33D", color: "#16241A", fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "20px" },
  rowMeta: { fontSize: "12px", color: "#94a3b8", marginTop: "2px" },
  rowRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 },
  rowPrice: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: "700", fontSize: "16px", color: "#16241A" },
  addBtn: { backgroundColor: "#24512F", color: "white", border: "none", padding: "7px 14px", borderRadius: "9px", fontSize: "13px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap" },
  qtyRow: { display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#E4ECE0", borderRadius: "9px", padding: "3px" },
  qtyBtn: { width: "28px", height: "28px", borderRadius: "6px", border: "none", backgroundColor: "#24512F", color: "white", fontSize: "16px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  qtyNum: { fontSize: "14px", fontWeight: "700", color: "#16241A", minWidth: "20px", textAlign: "center" },
};
