import Reveal from "./Reveal";

const icons = {
  rx: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  ),
  search: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  ),
  box: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  ),
  pin: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
};

const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

const items = [
  {
    icon: icons.rx,
    title: "Send a prescription",
    text: "Take a photo of your prescription and send it to us from your phone.",
    action: () => window.dispatchEvent(new Event("open-prescription")),
  },
  {
    icon: icons.search,
    title: "Search the catalogue",
    text: "Look up medicines by brand name, generic name or category.",
    action: () => go("medicines"),
  },
  {
    icon: icons.box,
    title: "Follow your orders",
    text: "Check on the orders you've placed with us, any time.",
    action: () => window.dispatchEvent(new Event("open-orders")),
  },
  {
    icon: icons.pin,
    title: "Visit the pharmacy",
    text: "Find us in Pallabi, open 10:00 AM to 11:50 PM.",
    action: () => go("contact"),
  },
];

function Services() {
  return (
    <section style={styles.section}>
      <div style={styles.inner}>
        <Reveal>
          <h2 style={styles.heading}>Ways we can help</h2>
          <p style={styles.sub}>Whatever you need, there's an easy place to start.</p>
        </Reveal>
        <div style={styles.grid}>
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 90} style={{ height: "100%" }}>
              <button className="service-card" style={styles.card} onClick={it.action}>
                <span className="service-icon" style={styles.icon}>{it.icon}</span>
                <span style={styles.title}>{it.title}</span>
                <span style={styles.text}>{it.text}</span>
                <span className="service-arrow" style={styles.arrow}>Open</span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: { background: "#FAF7F1", padding: "24px 24px 72px" },
  inner: { maxWidth: "1180px", margin: "0 auto" },
  heading: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(26px, 4vw, 34px)", color: "#16241A", fontWeight: "700", letterSpacing: "-0.5px", marginBottom: "6px" },
  sub: { color: "#5B6B60", fontSize: "15px", marginBottom: "32px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "18px" },
  card: { position: "relative", overflow: "hidden", width: "100%", height: "100%", textAlign: "left", background: "#FFFFFF", border: "1px solid #EFEDE5", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "10px", cursor: "pointer", fontFamily: "inherit" },
  icon: { width: "52px", height: "52px", borderRadius: "14px", background: "#E4ECE0", color: "#24512F", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "6px" },
  title: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: "700", color: "#16241A" },
  text: { fontSize: "14px", color: "#5B6B60", lineHeight: "1.55", flex: 1 },
  arrow: { fontSize: "13px", fontWeight: "700", color: "#24512F", marginTop: "6px" },
};

export default Services;
