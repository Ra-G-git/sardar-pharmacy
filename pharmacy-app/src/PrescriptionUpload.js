import { useState } from "react";
import { auth, db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

function PrescriptionUpload({ onClose }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  }

  async function handleUpload() {
    if (!auth.currentUser) {
      setError("Please login first to upload a prescription.");
      return;
    }
    if (!image) {
      setError("Please select an image first.");
      return;
    }

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", image);
    formData.append("upload_preset", "prescriptions");
    formData.append("folder", "sardar-pharmacy/prescriptions");

    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dbzyb0nnj/image/upload",
        { method: "POST", body: formData }
      );
      const data = await response.json();

      if (data.secure_url) {
        await addDoc(collection(db, "prescriptions"), {
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          imageUrl: data.secure_url,
          note: note,
          status: "pending",
          uploadedAt: serverTimestamp(),
        });
        setSuccess(true);
      } else {
        setError("Upload failed. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }

    setUploading(false);
  }

  if (success) {
    return (
      <div style={styles.overlay}>
        <div style={styles.successBox}>
          <div style={styles.successIcon}>✅</div>
          <h2 style={styles.successTitle}>Prescription Uploaded!</h2>
          <p style={styles.successText}>
            Our team will review your prescription and contact you shortly.
          </p>
          <button onClick={onClose} style={styles.successBtn}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Upload Prescription</h2>
            <p style={styles.subtitle}>We'll process your order after review</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="prescriptionInput"
          />

          <label htmlFor="prescriptionInput" style={styles.uploadArea}>
            {preview ? (
              <img src={preview} alt="Preview" style={styles.preview} />
            ) : (
              <div style={styles.uploadPlaceholder}>
                <p style={styles.uploadIcon}>📋</p>
                <p style={styles.uploadText}>Tap to select prescription image</p>
                <p style={styles.uploadSub}>JPG, PNG or HEIC supported</p>
              </div>
            )}
          </label>

          {preview && (
            <label htmlFor="prescriptionInput" style={styles.changeBtn}>
              🔄 Change Image
            </label>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Add a Note (Optional)</label>
            <textarea
              placeholder="e.g. For my father, age 60. Please call before delivery."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={styles.textarea}
            />
          </div>

          <div style={styles.infoBox}>
            <p style={styles.infoText}>💡 Make sure the prescription is clear and readable. Include doctor's name and date if visible.</p>
          </div>

          {error && <div style={styles.error}>⚠️ {error}</div>}

          <button
            onClick={handleUpload}
            style={{
              ...styles.uploadBtn,
              opacity: uploading ? 0.7 : 1,
              cursor: uploading ? "not-allowed" : "pointer",
            }}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "📤 Upload Prescription"}
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
    maxWidth: "460px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 28px",
    background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
  },
  title: {
    color: "white",
    fontSize: "22px",
    fontWeight: "800",
    margin: 0,
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: "13px",
    margin: "4px 0 0 0",
  },
  closeBtn: {
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
    padding: "24px 28px",
    overflowY: "auto",
    flex: 1,
  },
  uploadArea: {
    border: "2px dashed #cbd5e1",
    borderRadius: "16px",
    padding: "20px",
    textAlign: "center",
    cursor: "pointer",
    marginBottom: "16px",
    minHeight: "180px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    transition: "border 0.2s",
  },
  uploadPlaceholder: {
    textAlign: "center",
  },
  uploadIcon: {
    fontSize: "48px",
    marginBottom: "12px",
  },
  uploadText: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "6px",
  },
  uploadSub: {
    fontSize: "13px",
    color: "#94a3b8",
  },
  preview: {
    maxWidth: "100%",
    maxHeight: "220px",
    borderRadius: "12px",
    objectFit: "contain",
  },
  changeBtn: {
    display: "block",
    textAlign: "center",
    padding: "10px",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "16px",
  },
  inputGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "8px",
  },
  textarea: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: "12px",
    border: "2px solid #e2e8f0",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    resize: "none",
    height: "90px",
  },
  infoBox: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "12px",
    padding: "12px 16px",
    marginBottom: "16px",
  },
  infoText: {
    fontSize: "13px",
    color: "#92400e",
    margin: 0,
    lineHeight: "1.5",
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
  uploadBtn: {
    width: "100%",
    padding: "15px",
    background: "linear-gradient(135deg, #1e40af, #2563eb)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "700",
    boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
  },
  successBox: {
    backgroundColor: "white",
    borderRadius: "24px",
    padding: "48px 40px",
    textAlign: "center",
    maxWidth: "400px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  successIcon: {
    fontSize: "64px",
    marginBottom: "16px",
  },
  successTitle: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: "12px",
  },
  successText: {
    color: "#64748b",
    fontSize: "15px",
    lineHeight: "1.6",
    marginBottom: "28px",
  },
  successBtn: {
    padding: "14px 32px",
    background: "linear-gradient(135deg, #1e40af, #2563eb)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
  },
};

export default PrescriptionUpload;