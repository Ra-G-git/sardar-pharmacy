import { useEffect, useState } from "react";
import { BANNER_PHOTOS } from "./categoryImages";

function useCountUp(target, duration = 1600, startDelay = 500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setValue(target); return; }
    let raf;
    const timer = setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(target * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, startDelay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [target, duration, startDelay]);
  return value;
}

const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

const svgProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const PinIcon = () => (<svg {...svgProps}><path d="M12 21s7-6.200 7-11a7 7 0 10-14 0c0 4.800 7 11 7 11z" /><circle cx="12" cy="10" r="2.500" /></svg>);
const PhoneIcon = () => (<svg {...svgProps}><path d="M5 4h4l2 5-2.500 1.500a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></svg>);
const ClockIcon = () => (<svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);

function Photo({ src, className }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`hero-photo ${className}`}>
      {src && !broken && (
        <img src={src} alt="" loading="eager" onError={() => setBroken(true)} />
      )}
    </div>
  );
}

function Hero() {
  const meds = useCountUp(20000);
  return (
    <div className="hero2" id="hero-top">
      <span className="hero2-plus p1" aria-hidden="true" />
      <span className="hero2-plus p2" aria-hidden="true" />
      <span className="hero2-plus p3" aria-hidden="true" />

      <div className="hero2-grid">
        <div className="hero2-copy">
          <span className="hero2-pill">
            <i aria-hidden="true" /> Your neighbourhood pharmacy in Mirpur
          </span>
          <h1 className="hero2-title">
            Care that goes <span className="hero2-accent">beyond medicine.</span>
          </h1>
          <p className="hero2-sub">
            We're here to help you find the right medicine, answer your
            questions, and look out for your family's health — not just fill
            a prescription.
          </p>
          <div className="hero2-buttons">
            <button className="hero2-btn primary" onClick={() => go("medicines")}>
              Browse medicines
            </button>
            <button className="hero2-btn ghost" onClick={() => go("contact")}>
              Get in touch
            </button>
          </div>
          <div className="hero2-info">
            <span><PinIcon /> 10/1, Pallabi, Dhaka-1216</span>
            <span><PhoneIcon /> 01559084327</span>
            <span><ClockIcon /> 10:00 AM – 11:50 PM</span>
          </div>
        </div>

        <div className="hero2-visual">
          <div className="hero2-ring" aria-hidden="true" />
          <Photo src={BANNER_PHOTOS.pharmacy} className="ph-main" />
          <Photo src={BANNER_PHOTOS.vitamins} className="ph-a" />
          <Photo src={BANNER_PHOTOS.skin} className="ph-b" />
          <div className="hero2-chip c1 chip-float">
            <strong>{meds.toLocaleString()}+</strong>
            <span>Medicines listed</span>
          </div>
          <div className="hero2-chip c2 chip-float">
            <strong>Open late</strong>
            <span>Till 11:50 PM, daily</span>
          </div>
          <div className="hero2-cross cross-float" aria-hidden="true">
            <i /><i />
          </div>
        </div>
      </div>

      <svg className="hero2-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 40C240 80 480 0 720 30s480 50 720 10V80H0z" fill="#FAF7F1" />
      </svg>
    </div>
  );
}

export default Hero;
