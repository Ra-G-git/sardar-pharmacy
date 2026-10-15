import { useCallback, useEffect, useRef, useState } from "react";
import { BANNER_PHOTOS } from "./categoryImages";

// Auto-rotating banner for the home page. Copy describes what is on the
// shelf — it never promises stock, prices, speed or offers.
const SLIDES = [
  {
    key: "pharmacy",
    eyebrow: "Sardar Pharmacy · Mirpur",
    title: "Find the right medicine, with someone who cares",
    text: "Search thousands of medicines by name, or browse by what you need.",
    cta: "Browse all",
    shelf: null,
    tone: ["#16401F", "#2F7A45"],
  },
  {
    key: "skin",
    eyebrow: "Skin & Hair Care",
    title: "Creams, lotions, shampoos and more",
    text: "Everyday skin and hair care, all in one shelf.",
    cta: "Shop skin care",
    shelf: "Skin & Hair Care",
    tone: ["#B8741A", "#E8A33D"],
  },
  {
    key: "diabetes",
    eyebrow: "Diabetes Care",
    title: "Support for managing blood sugar",
    text: "Medicines and testing supplies for everyday diabetes care.",
    cta: "Shop diabetes care",
    shelf: "Diabetes Care",
    tone: ["#0F5C63", "#2A9199"],
  },
  {
    key: "vitamins",
    eyebrow: "Vitamins & Supplements",
    title: "Little things that add up to good health",
    text: "Vitamins, minerals and supplements for the whole family.",
    cta: "Shop vitamins",
    shelf: "Vitamins & Supplements",
    tone: ["#4B3F8F", "#7A6BC4"],
  },
  {
    key: "baby",
    eyebrow: "Baby & Child",
    title: "Gentle care for the little ones",
    text: "Baby care and children's medicines, together.",
    cta: "Shop baby care",
    shelf: "Baby & Child",
    tone: ["#A4413A", "#D8706A"],
  },
  {
    key: "surgical",
    eyebrow: "Surgical & First Aid",
    title: "Be ready for the small emergencies",
    text: "Antiseptics, dressings and first-aid essentials.",
    cta: "Shop first aid",
    shelf: "Surgical & First Aid",
    tone: ["#2F6B3A", "#8DB85C"],
  },
];

const INTERVAL = 5500;

function PromoBanner({ onPick, onBrowse }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [broken, setBroken] = useState({});
  const touchX = useRef(null);
  const reduce = useRef(
    typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const go = useCallback((i) => setIndex((i + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused || reduce.current) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL);
    return () => clearTimeout(t);
  }, [index, paused]);

  function onTouchEnd(e) {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
  }

  return (
    <section
      className="promo"
      aria-roledescription="carousel"
      aria-label="Featured shelves"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={onTouchEnd}
    >
      {SLIDES.map((s, i) => {
        const photo = BANNER_PHOTOS[s.key];
        const active = i === index;
        return (
          <div
            key={s.key}
            className={`promo-slide${active ? " active" : ""}`}
            style={{ "--from": s.tone[0], "--to": s.tone[1] }}
            aria-hidden={!active}
          >
            {photo && !broken[s.key] && (
              <img
                className="promo-photo"
                src={photo}
                alt=""
                loading={i === 0 ? "eager" : "lazy"}
                onError={() => setBroken((b) => ({ ...b, [s.key]: true }))}
              />
            )}
            <div className="promo-shade" />
            <div className="promo-copy">
              <span className="promo-eyebrow">{s.eyebrow}</span>
              <h2 className="promo-title">{s.title}</h2>
              <p className="promo-text">{s.text}</p>
              <button
                className="promo-cta"
                tabIndex={active ? 0 : -1}
                onClick={() => (s.shelf ? onPick(s.shelf) : onBrowse())}
              >
                {s.cta} <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        );
      })}

      <button className="promo-arrow left" aria-label="Previous slide" onClick={() => go(index - 1)}>‹</button>
      <button className="promo-arrow right" aria-label="Next slide" onClick={() => go(index + 1)}>›</button>
      <div className="promo-dots" role="tablist" aria-label="Choose slide">
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={i === index}
            aria-label={s.eyebrow}
            className={`promo-dot${i === index ? " active" : ""}`}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </section>
  );
}

export default PromoBanner;
