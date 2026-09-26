import { useState } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

function Auth({ onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError("");
    setSuccess("");
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userRef = doc(db, "users", result.user.uid);
      const existing = await getDoc(userRef);
      if (!existing.exists()) {
        // First time this Google account has signed in — create the record.
        await setDoc(userRef, {
          email: result.user.email,
          userId: result.user.uid,
          createdAt: serverTimestamp(),
        });
      }
      // Existing users: don't touch their doc, just proceed — avoids
      // overwriting createdAt (or anything else) on every repeat sign-in.
      setSuccess("Logged in successfully!");
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        // User cancelled — not an error worth showing.
      } else {
        setError(err.message);
      }
    }
    setGoogleLoading(false);
  }

  async function handleSubmit() {
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (!result.user.emailVerified) {
          await auth.signOut();
          setError("Please verify your email first. Check your inbox and spam folder.");
          setLoading(false);
          return;
        }
        setSuccess("Logged in successfully!");
        setTimeout(() => onClose(), 1000);
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(result.user);
        await setDoc(doc(db, "users", result.user.uid), {
          email: result.user.email,
          userId: result.user.uid,
          createdAt: serverTimestamp(),
        });
        await auth.signOut();
        setSuccess("Account created! Please check your inbox AND spam/junk folder for the verification email, then log in.");
      }
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please login instead.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Incorrect email or password.");
      } else {
        setError(err.message);
      }
    }
    setLoading(false);
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <div style={styles.header}>
          <img src="/logo.svg" alt="Sardar Pharmacy" style={styles.headerLogo} />
          <h2 style={styles.title}>
            {isLogin ? "Welcome Back!" : "Create Account"}
          </h2>
          <p style={styles.subtitle}>
            {isLogin ? "Login to your Sardar Pharmacy account" : "Join Sardar Pharmacy today"}
          </p>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          <div style={styles.tabs}>
            <button
              style={{ ...styles.tab, ...(isLogin ? styles.activeTab : {}) }}
              onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
            >
              Login
            </button>
            <button
              style={{ ...styles.tab, ...(!isLogin ? styles.activeTab : {}) }}
              onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
            >
              Register
            </button>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            style={{
              ...styles.googleBtn,
              opacity: googleLoading ? 0.7 : 1,
              cursor: googleLoading ? "not-allowed" : "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
            {googleLoading ? "Signing in..." : "Continue with Google"}
          </button>

          <div style={styles.dividerRow}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>OR</span>
            <div style={styles.dividerLine} />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>📧</span>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={isLogin ? "Your password" : "Min 6 characters"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
              />
              <button
                style={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <div style={styles.error}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={styles.success}>
              ✅ {success}
            </div>
          )}

          <button
            onClick={handleSubmit}
            style={{
              ...styles.submitBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            disabled={loading}
          >
            {loading ? "Please wait..." : isLogin ? "Login →" : "Create Account →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 2000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(4px)",
    padding: "20px",
  },
  box: {
    backgroundColor: "white",
    borderRadius: "24px",
    width: "100%",
    maxWidth: "420px",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  header: {
    background: "linear-gradient(135deg, #1a3a22, #24512F)",
    padding: "32px 28px 28px",
    textAlign: "center",
    position: "relative",
  },
  headerLogo: {
    height: "64px",
    width: "auto",
    objectFit: "contain",
    marginBottom: "12px",
  },
  title: {
    color: "white",
    fontSize: "24px",
    fontWeight: "800",
    margin: "0 0 6px 0",
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: "13px",
    margin: 0,
  },
  closeBtn: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "rgba(255,255,255,0.2)",
    border: "none",
    color: "white",
    fontSize: "16px",
    cursor: "pointer",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: "28px",
  },
  tabs: {
    display: "flex",
    backgroundColor: "#f1f5f9",
    borderRadius: "12px",
    padding: "4px",
    marginBottom: "24px",
  },
  tab: {
    flex: 1,
    padding: "10px",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    backgroundColor: "transparent",
    color: "#64748b",
    transition: "all 0.2s",
  },
  activeTab: {
    backgroundColor: "white",
    color: "#24512F",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  googleBtn: {
    width: "100%",
    padding: "13px",
    borderRadius: "12px",
    border: "2px solid #e2e8f0",
    backgroundColor: "white",
    fontSize: "15px",
    fontWeight: "700",
    color: "#1e293b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "20px",
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: "18px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "8px",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    fontSize: "16px",
  },
  input: {
    width: "100%",
    padding: "13px 44px",
    borderRadius: "12px",
    border: "2px solid #e2e8f0",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border 0.2s",
  },
  eyeBtn: {
    position: "absolute",
    right: "14px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
  },
  error: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    padding: "12px 16px",
    borderRadius: "10px",
    fontSize: "13px",
    marginBottom: "16px",
    border: "1px solid #fecaca",
  },
  success: {
    backgroundColor: "#f0fdf4",
    color: "#16a34a",
    padding: "12px 16px",
    borderRadius: "10px",
    fontSize: "13px",
    marginBottom: "16px",
    border: "1px solid #bbf7d0",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #1a3a22, #24512F)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "700",
    boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
  },
};

export default Auth;