function Hero() {
  return (
    <div style={styles.hero}>
      <div style={styles.grid} className="hero-grid">
        <div style={styles.copy} className="hero-copy">
          <h1 style={styles.title}>
            Your health,
            <br />
            sorted.
          </h1>
          <p style={styles.subtitle}>
            Genuine medicines, sourced and stocked right in Mirpur — delivered
            fast, priced fair, and always in stock when you need them.
          </p>
          <div style={styles.buttons}>
            <button
              style={styles.primaryBtn}
              onClick={() => document.getElementById("medicines").scrollIntoView({ behavior: "smooth" })}
            >
              Browse medicines
            </button>
            <button
              style={styles.secondaryBtn}
              onClick={() => document.getElementById("contact").scrollIntoView({ behavior: "smooth" })}
            >
              Get in touch
            </button>
          </div>
          <div style={styles.info}>
            <span style={styles.infoItem}>10/1, Pallabi, Dhaka-1216</span>
            <span style={styles.infoDot}>•</span>
            <span style={styles.infoItem}>01559084327</span>
            <span style={styles.infoDot}>•</span>
            <span style={styles.infoItem}>Open 10:00 AM – 11:50 PM</span>
          </div>
        </div>

        <div style={styles.visual} className="hero-visual">
          <div style={styles.crossWrap} className="cross-wrap">
            <div style={styles.crossBlob} />
            <div style={styles.cross}>
              <div style={styles.crossV} />
              <div style={styles.crossH} />
            </div>
            <div style={{ ...styles.chip, ...styles.chipTop }}>
              <span style={styles.chipNum}>20,000+</span>
              <span style={styles.chipLabel}>Medicines</span>
            </div>
            <div style={{ ...styles.chip, ...styles.chipMid }}>
              <span style={styles.chipNum}>Fast</span>
              <span style={styles.chipLabel}>Delivery</span>
            </div>
            <div style={{ ...styles.chip, ...styles.chipBottom }}>
              <span style={styles.chipNum}>100%</span>
              <span style={styles.chipLabel}>Genuine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  hero: {
    background: "#FAF7F1",
    minHeight: "88vh",
    display: "flex",
    alignItems: "center",
    padding: "72px 24px",
  },
  grid: {
    maxWidth: "1180px",
    margin: "0 auto",
    width: "100%",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
    gap: "48px",
    alignItems: "center",
  },
  copy: {
    animation: "heroRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "clamp(40px, 6vw, 68px)",
    color: "#16241A",
    fontWeight: "700",
    lineHeight: "1.05",
    letterSpacing: "-1.5px",
    marginBottom: "22px",
  },
  subtitle: {
    fontSize: "17px",
    color: "#5B6B60",
    lineHeight: "1.65",
    maxWidth: "460px",
    marginBottom: "32px",
  },
  buttons: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    marginBottom: "36px",
  },
  primaryBtn: {
    backgroundColor: "#E8A33D",
    color: "#16241A",
    border: "none",
    padding: "15px 30px",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(232,163,61,0.35)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  secondaryBtn: {
    backgroundColor: "transparent",
    color: "#24512F",
    border: "1.5px solid #24512F",
    padding: "15px 30px",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  info: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    color: "#5B6B60",
  },
  infoItem: {
    whiteSpace: "nowrap",
  },
  infoDot: {
    color: "#C7D2C2",
  },
  visual: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    animation: "heroRise 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both",
  },
  crossWrap: {
    position: "relative",
    width: "min(100%, 380px)",
    aspectRatio: "1 / 1",
  },
  crossBlob: {
    position: "absolute",
    inset: "6%",
    borderRadius: "38% 62% 60% 40% / 45% 40% 60% 55%",
    background: "linear-gradient(135deg, #24512F 0%, #3d8b52 100%)",
    opacity: 0.14,
  },
  cross: {
    position: "absolute",
    inset: 0,
  },
  crossV: {
    position: "absolute",
    left: "50%",
    top: "18%",
    bottom: "18%",
    width: "22%",
    transform: "translateX(-50%)",
    borderRadius: "14px",
    background: "linear-gradient(160deg, #2f6b3d 0%, #14291A 100%)",
    boxShadow: "0 18px 40px rgba(20,41,26,0.35)",
  },
  crossH: {
    position: "absolute",
    top: "50%",
    left: "18%",
    right: "18%",
    height: "22%",
    transform: "translateY(-50%)",
    borderRadius: "14px",
    background: "linear-gradient(160deg, #2f6b3d 0%, #14291A 100%)",
    boxShadow: "0 18px 40px rgba(20,41,26,0.35)",
  },
  chip: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: "14px",
    padding: "10px 16px",
    boxShadow: "0 10px 30px rgba(22,36,26,0.14)",
    display: "flex",
    flexDirection: "column",
    lineHeight: "1.2",
    border: "1px solid #F0EDE4",
  },
  chipTop: { top: "2%", right: "-6%" },
  chipMid: { top: "44%", left: "-10%" },
  chipBottom: { bottom: "4%", right: "0%" },
  chipNum: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "17px",
    fontWeight: "700",
    color: "#16241A",
  },
  chipLabel: {
    fontSize: "11px",
    color: "#5B6B60",
    marginTop: "1px",
  },
};

export default Hero;
