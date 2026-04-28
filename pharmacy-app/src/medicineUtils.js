export function getMedicineEmoji(category) {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("capsule")) return "💊";
  if (cat.includes("tablet") || cat.includes("chewable")) return "🔘";
  if (cat.includes("syrup") || cat.includes("suspension") || cat.includes("oral liquid")) return "🍶";
  if (cat.includes("injection") || cat.includes("infusion")) return "💉";
  if (cat.includes("cream") || cat.includes("ointment") || cat.includes("gel") || cat.includes("lotion")) return "🧴";
  if (cat.includes("drop")) return "💧";
  if (cat.includes("inhaler") || cat.includes("respule")) return "🫁";
  if (cat.includes("powder") || cat.includes("sachet")) return "🧂";
  if (cat.includes("patch")) return "🩹";
  if (cat.includes("suppository")) return "🛡";
  if (cat.includes("spray")) return "💨";
  if (cat.includes("solution")) return "🧪";
  return "⚪";
}

export function getUnitLabel(med) {
  const size = parseInt(med.unit_size);
  if (size > 1) return `${med.unit} (${size} pcs)`;
  return med.unit || "piece";
}

export function getUnitShort(med) {
  const size = parseInt(med.unit_size);
  if (size > 1) return med.unit;
  return "pc";
}