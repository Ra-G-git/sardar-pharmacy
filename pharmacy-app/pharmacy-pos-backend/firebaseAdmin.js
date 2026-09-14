// Replaces the MySQL pool (previously in server.js's db setup) with Firestore,
// using the SAME Firebase project your sardar-pharmacy React app already uses.
//
// Setup:
// 1. Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
// 2. Save the JSON as serviceAccountKey.json in this folder (DO NOT commit it — add to .gitignore)
// 3. Or set GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT env vars for deployment (Railway/Render/Vercel)

const admin = require('firebase-admin');

if (!admin.apps.length) {
  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Deployment: paste the full service account JSON into this env var
    credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  } else {
    // Local dev: read from file
    credential = admin.credential.cert(require('./serviceAccountKey.json'));
  }

  admin.initializeApp({
    credential,
    projectId: 'sardar-pharmacy', // matches firebaseConfig.projectId in your React app
  });
}

const db = admin.firestore();
module.exports = { admin, db };
