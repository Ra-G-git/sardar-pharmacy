function Hero() {
  return (
    <div style={styles.hero}>
      <div style={styles.overlay} />
      <div style={styles.content}>
        <div style={styles.badge}>🏥 Trusted Pharmacy in Dhaka</div>
        <h1 style={styles.title}>
          Your Health is Our <span style={styles.highlight}>Priority</span>
        </h1>
        <p style={styles.subtitle}>
          Get genuine medicines delivered fast. Serving Mirpur since day one.
        </p>
        <div style={styles.info}>
          <span style={styles.infoItem}>📍 10/1 Pallabi, Mirpur-11½, Dhaka-1216</span>
          <span style={styles.infoItem}>📞 01559084327</span>
          <span style={styles.infoItem}>🕐 Open 8AM – 11PM</span>
        </div>
        <div style={styles.buttons}>
          <button
            style={styles.primaryBtn}
            onClick={() => document.getElementById("medicines").scrollIntoView({ behavior: "smooth" })}
          >
            Browse Medicines 💊
          </button>
          <button
            style={styles.secondaryBtn}
            onClick={() => document.getElementById("contact").scrollIntoView({ behavior: "smooth" })}
          >
            Contact Us
          </button>
        </div>
        <div style={styles.stats}>
          <div style={styles.stat}>
            <h3 style={styles.statNum}>20,000+</h3>
            <p style={styles.statLabel}>Medicines</p>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.stat}>
            <h3 style={styles.statNum}>Fast</h3>
            <p style={styles.statLabel}>Delivery</p>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.stat}>
            <h3 style={styles.statNum}>100%</h3>
            <p style={styles.statLabel}>Genuine</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  hero: {
    background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0ea5e9 100%)",
    minHeight: "92vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    padding: "60px 24px",
  },
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
    opacity: 0.4,
  },
  content: {
    position: "relative",
    textAlign: "center",
    maxWidth: "700px",
    zIndex: 1,
  },
  badge: {
    display: "inline-block",
    backgroundColor: "rgba(255,255,255,0.15)",
    color: "white",
    padding: "8px 20px",
    borderRadius: "50px",
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "24px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.2)",
  },
  title: {
    fontSize: "clamp(32px, 6vw, 58px)",
    color: "white",
    fontWeight: "800",
    lineHeight: "1.2",
    marginBottom: "20px",
    letterSpacing: "-1px",
  },
  highlight: {
    color: "#7dd3fc",
  },
  subtitle: {
    fontSize: "clamp(15px, 2.5vw, 18px)",
    color: "rgba(255,255,255,0.8)",
    marginBottom: "24px",
    lineHeight: "1.6",
  },
  info: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "16px",
    marginBottom: "32px",
  },
  infoItem: {
    color: "rgba(255,255,255,0.75)",
    fontSize: "13px",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: "6px 14px",
    borderRadius: "50px",
  },
  buttons: {
    display: "flex",
    gap: "14px",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: "48px",
  },
  primaryBtn: {
    backgroundColor: "white",
    color: "#1e40af",
    border: "none",
    padding: "14px 28px",
    borderRadius: "50px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    transition: "transform 0.2s",
  },
  secondaryBtn: {
    backgroundColor: "transparent",
    color: "white",
    border: "2px solid rgba(255,255,255,0.5)",
    padding: "14px 28px",
    borderRadius: "50px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  stats: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "32px",
    backgroundColor: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(10px)",
    borderRadius: "20px",
    padding: "20px 40px",
    border: "1px solid rgba(255,255,255,0.15)",
    flexWrap: "wrap",
  },
  stat: {
    textAlign: "center",
  },
  statNum: {
    color: "white",
    fontSize: "24px",
    fontWeight: "800",
    margin: 0,
  },
  statLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: "12px",
    margin: 0,
    marginTop: "2px",
  },
  statDivider: {
    width: "1px",
    height: "40px",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
};

export default Hero;