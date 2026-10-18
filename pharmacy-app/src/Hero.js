import { useEffect, useState } from "react";

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

// Animated logo: the SP mark with a capsule that tumbles in, lands on it,
// floats for a while, then tumbles out and does it again.
function LogoStage() {
  return (
    <div className="logo-stage" aria-label="Sardar Pharmacy logo">
      <span className="logo-glow" aria-hidden="true" />
      <span className="logo-pulse" aria-hidden="true" />
      <span className="logo-spark s1" aria-hidden="true" />
      <span className="logo-spark s2" aria-hidden="true" />
      <span className="logo-spark s3" aria-hidden="true" />
      <div className="logo-box">
        <img className="logo-img" src="/sp-logo.webp" alt="Sardar Pharmacy" />
        <div className="logo-pill">
          <svg viewBox="0 0 200 100" aria-hidden="true">
            <defs>
              <clipPath id="pillClip"><rect width="200" height="100" rx="50" /></clipPath>
              <linearGradient id="pillGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7FD27A" />
                <stop offset="0.45" stopColor="#2FA52F" />
                <stop offset="1" stopColor="#1F7F25" />
              </linearGradient>
              <linearGradient id="pillBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#5AA2E6" />
                <stop offset="0.45" stopColor="#1F6BB8" />
                <stop offset="1" stopColor="#154E92" />
              </linearGradient>
              <radialGradient id="pillShine" cx="0.3" cy="0.25" r="0.6">
                <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <g clipPath="url(#pillClip)">
              <rect x="0" y="0" width="99" height="100" fill="url(#pillGreen)" />
              <rect x="101" y="0" width="99" height="100" fill="url(#pillBlue)" />
              <rect x="98" y="0" width="4" height="100" fill="#0F3F7A" opacity="0.7" />
              <ellipse cx="46" cy="30" rx="34" ry="20" fill="url(#pillShine)" />
              <ellipse cx="150" cy="30" rx="34" ry="20" fill="url(#pillShine)" opacity="0.7" />
              <rect x="0" y="78" width="200" height="22" fill="#000" opacity="0.08" />
            </g>
          </svg>
        </div>
      </div>
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
          <LogoStage />
          <div className="hero2-chip c1 chip-float">
            <strong>{meds.toLocaleString()}+</strong>
            <span>Medicines listed</span>
          </div>
          <div className="hero2-chip c2 chip-float">
            <strong>Open late</strong>
            <span>Till 11:50 PM, daily</span>
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
