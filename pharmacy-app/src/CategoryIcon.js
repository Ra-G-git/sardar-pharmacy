// Line icons for the health-need shelves. Drawn as inline SVG so they stay
// sharp, take the surrounding text colour, and need no extra requests.
const PATHS = {
  skin: (
    <>
      <path d="M12 3c3 4 5.5 6.8 5.5 10a5.5 5.5 0 0 1-11 0C6.5 9.8 9 7 12 3z" />
      <path d="M9.5 14.2a2.7 2.7 0 0 0 2.2 2" />
    </>
  ),
  dental: (
    <path d="M7.5 3.5c-2.3 0-4 1.800-4 4.500 0 2.200 1 3.500 1.600 5.500.7 2.500.9 6.500 2.500 6.500 1.500 0 1.200-3.800 2.400-5 .6-.6 1.200-.6 1.800 0 1.200 1.200.9 5 2.400 5 1.600 0 1.800-4 2.500-6.500.6-2 1.600-3.300 1.600-5.500 0-2.700-1.700-4.500-4-4.500-1.400 0-2.200.7-3.300.7S8.900 3.500 7.500 3.500z" />
  ),
  diabetes: (
    <>
      <path d="M12 3c3 4 5.500 6.800 5.500 10a5.500 5.500 0 0 1-11 0C6.500 9.800 9 7 12 3z" />
      <path d="M9 14h1.500l1-2 1.500 4 1-2H15.500" />
    </>
  ),
  vitamins: (
    <>
      <circle cx="12" cy="12" r="8.500" />
      <circle cx="12" cy="12" r="5.200" />
      <path d="M12 6.800v10.400M6.800 12h10.400M8.300 8.300l7.400 7.400M15.700 8.300l-7.400 7.400" />
    </>
  ),
  surgical: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.500" />
      <path d="M9 7V5.500A1.500 1.500 0 0 1 10.500 4h3A1.500 1.500 0 0 1 15 5.500V7" />
      <path d="M12 10.500v6M9 13.500h6" />
    </>
  ),
  sexual: (
    <path d="M12 20s-7.500-4.600-7.500-10.300A4.200 4.200 0 0 1 12 7.300a4.200 4.200 0 0 1 7.500 2.400C19.500 15.400 12 20 12 20z" />
  ),
  heart: (
    <>
      <path d="M12 20s-7.500-4.600-7.500-10.300A4.200 4.200 0 0 1 12 7.300a4.200 4.200 0 0 1 7.500 2.400C19.500 15.400 12 20 12 20z" />
      <path d="M7.500 12.500H10l1.200-2.200 1.800 4 1.200-1.800h2.300" />
    </>
  ),
  digestive: (
    <>
      <path d="M5 19C5 10 10.500 4.500 20 4.500 20 14 14.500 20 6 20" />
      <path d="M5 19l8-8" />
    </>
  ),
  pain: <path d="M13 2.500 4.500 13.500H11L10 21.500l8.500-11H12.200L13 2.500z" />,
  cold: (
    <>
      <path d="M3 8.500h11a3 3 0 1 0-3-3" />
      <path d="M3 12.500h15a3 3 0 1 1-3 3" />
      <path d="M3 16.500h7" />
    </>
  ),
  infection: (
    <>
      <path d="M12 3l7 3v5.500c0 4.800-3 8.200-7 9.500-4-1.300-7-4.700-7-9.500V6l7-3z" />
      <path d="M8.800 12l2.200 2.200 4.200-4.400" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  women: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M12 14v7M9 18h6" />
    </>
  ),
  baby: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 10.200v.1M15 10.200v.1" />
      <path d="M8.800 14.200c.8 1.200 1.800 1.800 3.200 1.800s2.400-.6 3.200-1.800" />
      <path d="M11 3.300c.2 1.200 1 1.800 2 1.800" />
    </>
  ),
  brain: <path d="M20 14.500A8 8 0 1 1 9.500 4a6.500 6.500 0 0 0 10.500 10.500z" />,
  pill: (
    <g transform="rotate(-40 12 12)">
      <rect x="2.500" y="8" width="19" height="8" rx="4" />
      <path d="M12 8v8" />
    </g>
  ),
};

function CategoryIcon({ name, size = 24, strokeWidth = 1.8 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name] || PATHS.pill}
    </svg>
  );
}

export default CategoryIcon;
