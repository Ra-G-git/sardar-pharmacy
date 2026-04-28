export function getMedicineEmoji(category) {
  const cat = category?.toLowerCase() || "";

  // Form types
  if (cat.includes("capsule")) return "💊";
  if (cat.includes("chewable")) return "🍬";
  if (cat.includes("tablet")) return "🔘";
  if (cat.includes("syrup")) return "🍶";
  if (cat.includes("suspension") || cat.includes("oral liquid")) return "🍶";
  if (cat.includes("injection") || cat.includes("infusion")) return "💉";
  if (cat.includes("cream") || cat.includes("ointment")) return "🧴";
  if (cat.includes("gel")) return "🧴";
  if (cat.includes("lotion")) return "🧴";
  if (cat.includes("drop")) return "💧";
  if (cat.includes("inhaler") || cat.includes("respule")) return "🫁";
  if (cat.includes("powder") || cat.includes("sachet")) return "🧂";
  if (cat.includes("patch")) return "🩹";
  if (cat.includes("suppository")) return "🛡";
  if (cat.includes("spray")) return "💨";
  if (cat.includes("solution")) return "🧪";

  // Health categories
  if (cat.includes("women") || cat.includes("maternal") || cat.includes("gynec")) return "🌸";
  if (cat.includes("baby") || cat.includes("infant") || cat.includes("child") || cat.includes("pediatric")) return "👶";
  if (cat.includes("sexual") || cat.includes("erectile") || cat.includes("contraceptive")) return "❤️";
  if (cat.includes("food supplement") || cat.includes("supplement") || cat.includes("nutrition") || cat.includes("vitamin")) return "🥗";
  if (cat.includes("protein")) return "💪";
  if (cat.includes("antibiotic") || cat.includes("anti-infective")) return "🦠";
  if (cat.includes("pain") || cat.includes("analgesic")) return "🩺";
  if (cat.includes("diabetes") || cat.includes("insulin")) return "🩸";
  if (cat.includes("heart") || cat.includes("cardiac") || cat.includes("blood pressure")) return "❤️";
  if (cat.includes("gastric") || cat.includes("antacid") || cat.includes("digestive")) return "🫃";
  if (cat.includes("allergy") || cat.includes("antihistamine")) return "🤧";
  if (cat.includes("skin") || cat.includes("derma")) return "🧖";
  if (cat.includes("eye")) return "👁️";
  if (cat.includes("ear")) return "👂";
  if (cat.includes("dental") || cat.includes("tooth") || cat.includes("oral")) return "🦷";
  if (cat.includes("mental") || cat.includes("psychiatric") || cat.includes("antidepressant")) return "🧠";
  if (cat.includes("sleep") || cat.includes("sedative")) return "😴";
  if (cat.includes("cancer") || cat.includes("oncology")) return "🎗️";
  if (cat.includes("thyroid")) return "🦋";
  if (cat.includes("liver") || cat.includes("hepatic")) return "🫀";
  if (cat.includes("kidney") || cat.includes("renal") || cat.includes("urinary")) return "🫘";
  if (cat.includes("respiratory") || cat.includes("asthma") || cat.includes("cough")) return "🫁";
  if (cat.includes("bone") || cat.includes("calcium") || cat.includes("joint")) return "🦴";
  if (cat.includes("immune") || cat.includes("vaccine")) return "🛡️";
  if (cat.includes("antifungal")) return "🍄";
  if (cat.includes("antiviral")) return "🦠";
  if (cat.includes("hormone")) return "⚗️";
  if (cat.includes("weight") || cat.includes("obesity")) return "⚖️";

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