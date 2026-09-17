// Replaces the MySQL pool (previously in server.js's db setup) with Firestore,
// using the SAME Firebase project your sardar-pharmacy React app already uses.
//
// Setup:
// 1. Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
// 2. Save the JSON as serviceAccountKey.json in this folder (DO NOT commit it — add to .gitignore)
// 3. For deployment (Vercel/Railway/Render), prefer FIREBASE_SERVICE_ACCOUNT_B64:
//      base64 -w 0 serviceAccountKey.json
//    and paste that output as the env var value. This avoids the newline/quote
//    corruption that raw multi-line JSON suffers when pasted into env var UIs.
//    FIREBASE_SERVICE_ACCOUNT (raw JSON) is kept as a legacy fallback.

const admin = require('firebase-admin');

if (!admin.apps.length) {
  let credential;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
      // Preferred deployment path: base64-encoded service account JSON
      const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
      const parsed = JSON.parse(json);
      credential = admin.credential.cert(parsed);
      console.log('[firebaseAdmin] Loaded service account (base64) for project:', parsed.project_id);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Legacy deployment path: raw JSON pasted into the env var
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(parsed);
      console.log('[firebaseAdmin] Loaded service account (raw JSON) for project:', parsed.project_id);
    } else {
      // Local dev: read from file
      credential = admin.credential.cert(require('./serviceAccountKey.json'));
      console.log('[firebaseAdmin] Loaded service account from local file');
    }
  } catch (err) {
    // Without this catch, a bad env var throws at module load time —
    // before Express ever starts — and Vercel returns an empty response
    // body with no readable error. Logging here makes the real cause
    // visible in the Vercel Functions log tab instead of a silent crash.
    console.error('[firebaseAdmin] FAILED to load/parse service account credentials:', err.message);
    throw err;
  }

  admin.initializeApp({
    credential,
    projectId: 'sardar-pharmacy', // matches firebaseConfig.projectId in your React app
  });
}

const db = admin.firestore();
module.exports = { admin, db };
