import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBSVXxT36bdORf053Wj6I5zTicd4tUkZoM",
  authDomain: "sardar-pharmacy.firebaseapp.com",
  projectId: "sardar-pharmacy",
  storageBucket: "sardar-pharmacy.firebasestorage.app",
  messagingSenderId: "650490924025",
  appId: "1:650490924025:web:ba09f140352cbfa4c14b28"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;