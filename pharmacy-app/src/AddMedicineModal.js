import { useState } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getMedicineEmoji } from "./medicineUtils";

export const CATEGORY_OPTIONS = [
  "Tablet", "Capsule", "Syrup", "Suspension", "Oral Liquid",
  "Injection", "Infusion", "Cream", "Ointment", "Gel", "Lotion",
  "Eye Drop", "Ear Drop", "Nasal Drop", "Nasal Spray",
  "Inhaler", "Respule", "Powder", "Sachet", "Patch",
  "Suppository", "Solution", "Chewable Tablet",
  "Food Supplement", "Vitamin", "Protein Supplement",
  "Antibiotic", "Antifungal", "Antiviral",
  "Pain / Analgesic", "Gastric / Antacid",
  "Allergy / Antihistamine", "Skin / Dermatology",
  "Respiratory / Asthma / Cough", "Diabetes / Insulin",
  "Heart / Cardiac / Blood Pressure", "Thyroid",
  "Kidney / Renal / Urinary", "Liver / Hepatic",
  "Bone / Calcium / Joint", "Mental / Psychiatric",
  "Sleep / Sedative", "Hormone", "Immune / Vaccine",
  "Cancer / Oncology", "Women / Gynecology",
  "Baby / Pediatric", "Sexual / Contraceptive",
  "Weight / Obesity", "Dental / Oral", "Eye", "Other",
];

const UNIT_OPTIONS = [
  "Tablet", "Capsule", "Syrup", "Injection", "Cream", "Ointment",
  "Gel", "Lotion", "Drop", "Inhaler", "Powder", "Sachet",
  "Patch", "Spray", "Solution", "Suppository",
  "Piece", "Strip", "Bottle", "Tube", "Vial",
];

const EMPTY_FORM = {
  medicine_name: "", generic_name: "", category_name: "",
  strength: "", manufacturer_name: "", unit: "",
  unit_size: "1", price: "", stock: "", barcode: "",
};

function makeSlug(name, strength) {
  const base = (name + (strength ? "-" + strength : ""))
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return base;
}

export default function AddMedicineModal({ onClose, onAdded, initialData }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initialData });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugConflict, setSlugConflict] = useState(false);
  const [done, setDone] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(""); setSlugConflict(false);
  }

  function validate() {
    if (!form.medicine_name.trim()) return "Medicine name is required.";
    if (!form.generic_name.trim()) return "Generic name is required.";
    if (!form.category_name.trim()) return "Category is required.";
    if (!form.unit.trim()) return "Unit is required.";
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0)
      return "A valid price is required.";
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError("");

    const slug = makeSlug(form.medicine_name, form.strength);
    try {
      const existing = await getDoc(doc(db, "inventory", slug));
      if (existing.exists()) {
        setSlugConflict(true);
        setError(`"${slug}" already exists in inventory. Update it instead?`);
        setSaving(false); return;
      }
      await setDoc(doc(db, "inventory", slug), buildPayload(slug));
      setDone(true);
      onAdded?.({ ...buildPayload(slug), id: slug });
    } catch (e) {
      console.error(e);
      setError("Failed to save. Please try again.");
    }
    setSaving(false);
  }

  async function handleForceUpdate() {
    setSaving(true); setError("");
    const slug = makeSlug(form.medicine_name, form.strength);
    try {
      const update = buildPayload(slug);
      delete update.createdAt;
      await updateDoc(doc(db, "inventory", slug), update);
      setDone(true);
      onAdded?.({ ...update, id: slug });
    } catch (e) {
      setError("Failed to update. Please try again.");
    }
    setSaving(false);
  }

  function buildPayload(slug) {
    return {
      slug,
      medicine_name: form.medicine_name.trim(),
      generic_name: form.generic_name.trim(),
      category_name: form.category_name.trim(),
      strength: form.strength.trim(),
      manufacturer_name: form.manufacturer_name.trim(),
      unit: form.unit.trim(),
      unit_size: form.unit_size.trim() || "1",
      price: parseFloat(form.price).toFixed(2),
      stock: parseInt(form.stock) || 0,
      barcode: form.barcode.trim(),
      source: "manual",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  const previewEmoji = getMedicineEmoji(form.category_name);

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "28px" }}>{previewEmoji}</span>
            <div>
              <h2 style={s.title}>➕ Add New Medicine</h2>
              <p style={s.subtitle}>{form.medicine_name || "Fill in the details below"}</p>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {done ? (
          <div style={s.doneBox}>
            <p style={{ fontSize: "52px", margin: "0 0 12px" }}>✅</p>
            <h3 style={s.doneTitle}>Medicine Added!</h3>
            <p style={s.doneSub}>
              <strong>{form.medicine_name}</strong> is now in inventory and will appear
              in the customer medicine list and POS search immediately.
            </p>
            <div style={s.doneBtns}>
              <button style={s.doneAddAnother} onClick={() => { setForm(EMPTY_FORM); setDone(false); }}>
                ➕ Add Another
              </button>
              <button style={s.doneDone} onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <div style={s.body}>
              <div style={s.grid}>

                <div style={{ ...s.field, gridColumn: "1 / -1" }}>
                  <label style={s.label}>💊 Medicine Name <span style={s.req}>*</span></label>
                  <input style={s.input} placeholder="e.g. Napa Extra" value={form.medicine_name}
                    onChange={(e) => set("medicine_name", e.target.value)} autoFocus />
                </div>

                <div style={s.field}>
                  <label style={s.label}>🧬 Generic Name <span style={s.req}>*</span></label>
                  <input style={s.input} placeholder="e.g. Paracetamol" value={form.generic_name}
                    onChange={(e) => set("generic_name", e.target.value)} />
                </div>

                <div style={s.field}>
                  <label style={s.label}>💪 Strength</label>
                  <input style={s.input} placeholder="e.g. 500mg" value={form.strength}
                    onChange={(e) => set("strength", e.target.value)} />
                </div>

                <div style={s.field}>
                  <label style={s.label}>🏷️ Category <span style={s.req}>*</span></label>
                  <select style={s.select} value={form.category_name}
                    onChange={(e) => set("category_name", e.target.value)}>
                    <option value="">— Select category —</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{getMedicineEmoji(c)} {c}</option>
                    ))}
                  </select>
                </div>

                <div style={s.field}>
                  <label style={s.label}>🏭 Manufacturer</label>
                  <input style={s.input} placeholder="e.g. Beximco Pharma" value={form.manufacturer_name}
                    onChange={(e) => set("manufacturer_name", e.target.value)} />
                </div>

                <div style={s.field}>
                  <label style={s.label}>📦 Unit <span style={s.req}>*</span></label>
                  <select style={s.select} value={form.unit}
                    onChange={(e) => set("unit", e.target.value)}>
                    <option value="">— Select unit —</option>
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div style={s.field}>
                  <label style={s.label}>🔢 Unit Size</label>
                  <p style={s.hint}>Pieces per pack (e.g. 10 for a blister of 10)</p>
                  <input style={s.input} type="number" min="1" placeholder="1" value={form.unit_size}
                    onChange={(e) => set("unit_size", e.target.value)} />
                </div>

                <div style={s.field}>
                  <label style={s.label}>💰 Price (৳) <span style={s.req}>*</span></label>
                  <p style={s.hint}>Strip / pack selling price</p>
                  <input style={s.input} type="number" min="0" step="0.01" placeholder="e.g. 12.50"
                    value={form.price} onChange={(e) => set("price", e.target.value)} />
                </div>

                <div style={s.field}>
                  <label style={s.label}>📊 Stock Quantity</label>
                  <p style={s.hint}>How many units available now</p>
                  <input style={s.input} type="number" min="0" placeholder="e.g. 100"
                    value={form.stock} onChange={(e) => set("stock", e.target.value)} />
                </div>

                <div style={{ ...s.field, gridColumn: "1 / -1" }}>
                  <label style={s.label}>🔖 Barcode</label>
                  <p style={s.hint}>Scan or enter the barcode for quick POS lookup</p>
                  <input style={{ ...s.input, fontFamily: "monospace" }}
                    placeholder="e.g. 8901234567890" value={form.barcode}
                    onChange={(e) => set("barcode", e.target.value)} />
                </div>

              </div>

              {error && (
                <div style={s.errorBox}>
                  <p style={s.errorText}>⚠️ {error}</p>
                  {slugConflict && (
                    <button style={s.forceBtn} onClick={handleForceUpdate} disabled={saving}>
                      {saving ? "Updating..." : "Yes, update existing →"}
                    </button>
                  )}
                </div>
              )}

              {form.medicine_name && form.category_name && (
                <div style={s.preview}>
                  <span style={{ fontSize: "22px" }}>{previewEmoji}</span>
                  <div>
                    <p style={s.previewName}>{form.medicine_name}{form.strength ? ` ${form.strength}` : ""}</p>
                    <p style={s.previewSub}>
                      {form.generic_name && `${form.generic_name} • `}
                      {form.category_name}
                      {form.price && ` • ৳${form.price}`}
                      {form.stock && ` • ${form.stock} in stock`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div style={s.footer}>
              <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
              <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "💾 Add Medicine"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", backdropFilter: "blur(4px)" },
  modal: { backgroundColor: "white", borderRadius: "20px", width: "100%", maxWidth: "600px", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", background: "linear-gradient(135deg, #0f172a, #1e3a8a)", flexShrink: 0 },
  title: { color: "white", fontSize: "17px", fontWeight: "800", margin: 0 },
  subtitle: { color: "rgba(255,255,255,0.55)", fontSize: "12px", margin: "3px 0 0" },
  closeBtn: { background: "rgba(255,255,255,0.12)", border: "none", color: "white", fontSize: "16px", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" },
  body: { overflowY: "auto", padding: "20px", flex: 1 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" },
  field: { display: "flex", flexDirection: "column" },
  label: { fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "4px" },
  req: { color: "#dc2626" },
  hint: { fontSize: "11px", color: "#94a3b8", margin: "0 0 5px" },
  input: { padding: "11px 13px", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "14px", outline: "none", fontFamily: "Inter, sans-serif", fontWeight: "500", boxSizing: "border-box", width: "100%" },
  select: { width: "100%", padding: "11px 13px", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "14px", outline: "none", fontFamily: "Inter, sans-serif", fontWeight: "500", backgroundColor: "white", cursor: "pointer" },
  errorBox: { backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 14px", marginBottom: "12px" },
  errorText: { color: "#dc2626", fontSize: "13px", fontWeight: "600", margin: "0 0 8px" },
  forceBtn: { padding: "7px 14px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" },
  preview: { display: "flex", alignItems: "center", gap: "12px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 14px" },
  previewName: { fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: 0 },
  previewSub: { fontSize: "12px", color: "#64748b", margin: "2px 0 0" },
  footer: { display: "flex", gap: "10px", padding: "14px 20px", borderTop: "1px solid #e2e8f0", flexShrink: 0, backgroundColor: "white" },
  cancelBtn: { flex: 1, padding: "12px", backgroundColor: "#f1f5f9", color: "#64748b", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  saveBtn: { flex: 2, padding: "12px", background: "linear-gradient(135deg, #1e40af, #2563eb)", color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" },
  doneBox: { padding: "40px 24px", textAlign: "center", flex: 1 },
  doneTitle: { fontSize: "22px", fontWeight: "800", color: "#1e293b", margin: "0 0 10px" },
  doneSub: { fontSize: "14px", color: "#64748b", margin: "0 0 24px", lineHeight: 1.6 },
  doneBtns: { display: "flex", gap: "10px", justifyContent: "center" },
  doneAddAnother: { padding: "12px 20px", backgroundColor: "#eff6ff", color: "#2563eb", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  doneDone: { padding: "12px 28px", background: "linear-gradient(135deg, #1e40af, #2563eb)", color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
};
