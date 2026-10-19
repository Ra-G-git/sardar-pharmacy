import { LOGO, LOGO_SMALL, BRAND_NAME } from "./brand";

// Use <Logo height={44} /> anywhere. big = larger file. plate = white rounded
// badge behind it, for placing the logo on dark backgrounds.
export default function Logo({ height = 44, big = false, plate = false, style, className }) {
  const plateStyle = plate
    ? { background: "#fff", padding: "5px 8px", borderRadius: 12, boxShadow: "0 4px 14px rgba(0,0,0,0.25)", boxSizing: "content-box" }
    : null;
  return (
    <img
      src={big ? LOGO : LOGO_SMALL}
      alt={BRAND_NAME}
      className={className}
      style={{ height, width: "auto", display: "block", objectFit: "contain", ...plateStyle, ...style }}
    />
  );
}
