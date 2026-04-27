function Hero() {
  return (
    <div style={styles.hero}>
      <h1 style={styles.title}>Welcome to Sardar Pharmacy 💊</h1>
      <p style={styles.subtitle}>Your trusted pharmacy in Mirpur, Dhaka</p>
      <p style={styles.subtitle}>10/1 Pallabi, Mirpur-11½, Dhaka-1216</p>
      
    </div>
  );
}

const styles = {
  hero: {
    backgroundColor: "#eff6ff",
    padding: "60px 30px",
    textAlign: "center",
  },
  title: {
    fontSize: "36px",
    color: "#1e40af",
    marginBottom: "10px",
  },
  subtitle: {
    fontSize: "16px",
    color: "#555",
    margin: "4px 0",
  },
};

export default Hero;