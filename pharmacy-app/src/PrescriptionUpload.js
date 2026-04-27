import { useState } from "react";
import { auth, db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

function PrescriptionUpload({ onClose }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");
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
        {
          method: "POST",
          body: formData,
        }
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

        setSuccess("Prescription uploaded successfully! Our team will review it shortly.");
        setImage(null);
        setPreview(null);
        setNote("");
      } else {
        setError("Upload failed. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }

    setUploading(false);
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
        <h2 style={styles.title}>📋 Upload Prescription</h2>
        <p style={styles.subtitle}>
          Upload a clear photo of your prescription and our team will process your order.
        </p>

        <div style={styles.uploadArea}>
          {preview ? (
            <img src={preview} alt="Preview" style={styles.preview} />
          ) : (
            <div style={styles.placeholder}>
              <p style={styles.placeholderText}>📷 Click below to select image</p>
            </div>
          )}
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={styles.fileInput}
          id="prescriptionInput"
        />
        <label htmlFor="prescriptionInput" style={styles.fileLabel}>
          {image ? "Change Image" : "Select Image"}
        </label>

        <textarea
          placeholder="Add a note (optional) — e.g. 'For my father, age 60'"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={styles.textarea}
        />

        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>{success}</p>}

        <button
          onClick={handleUpload}
          style={{
            ...styles.uploadBtn,
            backgroundColor: uploading ? "#94a3b8" : "#2563eb",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload Prescription"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 2000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "40px",
    width: "440px",
    position: "relative",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  },
  closeBtn: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#64748b",
  },
  title: {
    fontSize: "22px",
    color: "#1e40af",
    marginBottom: "8px",
    textAlign: "center",
  },
  subtitle: {
    fontSize: "13px",
    color: "#64748b",
    textAlign: "center",
    marginBottom: "20px",
  },
  uploadArea: {
    border: "2px dashed #cbd5e1",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center",
    marginBottom: "16px",
    minHeight: "160px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    color: "#94a3b8",
  },
  placeholderText: {
    fontSize: "15px",
    margin: 0,
  },
  preview: {
    maxWidth: "100%",
    maxHeight: "200px",
    borderRadius: "8px",
  },
  fileInput: {
    display: "none",
  },
  fileLabel: {
    display: "block",
    textAlign: "center",
    padding: "10px",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "14px",
  },
  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    marginBottom: "14px",
    resize: "none",
    height: "80px",
    boxSizing: "border-box",
    outline: "none",
  },
  error: {
    color: "#dc2626",
    fontSize: "13px",
    marginBottom: "10px",
    textAlign: "center",
  },
  success: {
    color: "#16a34a",
    fontSize: "13px",
    marginBottom: "10px",
    textAlign: "center",
  },
  uploadBtn: {
    width: "100%",
    padding: "12px",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
  },
};

export default PrescriptionUpload;