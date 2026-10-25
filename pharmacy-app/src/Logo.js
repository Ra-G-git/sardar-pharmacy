import { LOGO, LOGO_SMALL, BRAND_NAME } from "./brand";

// Use <Logo height={44} /> anywhere. big = larger file. The logo files are
// transparent, so it sits directly on any background.
export default function Logo({ height = 44, big = false, style, className }) {
  return (
    <img
      src={big ? LOGO : LOGO_SMALL}
      alt={BRAND_NAME}
      className={className}
      style={{ height, width: "auto", display: "block", objectFit: "contain", ...style }}
    />
  );
}
