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
      const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
      const parsed = JSON.parse(json);
      credential = admin.credential.cert(parsed);
      console.log('[firebaseAdmin] Loaded service account (base64) for project:', parsed.project_id);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(parsed);
      console.log('[firebaseAdmin] Loaded service account (raw JSON) for project:', parsed.project_id);
    } else {
      credential = admin.credential.cert(require('./serviceAccountKey.json'));
      console.log('[firebaseAdmin] Loaded service account from local file');
    }
  } catch (err) {
    console.error('[firebaseAdmin] FAILED to load/parse service account credentials:', err.message);
    throw err;
  }

  admin.initializeApp({
    credential,
    projectId: 'sardar-pharmacy',
  });
}

const db = admin.firestore();

// CRITICAL for serverless environments (Vercel, Cloudflare Workers, etc.):
// the Firestore Admin SDK defaults to gRPC, which relies on a long-lived
// HTTP/2 connection. That connection negotiation frequently hangs forever
// in sandboxed serverless runtimes instead of erroring out — resulting in
// a silent FUNCTION_INVOCATION_TIMEOUT with no visible outgoing request,
// no thrown error, and no log output after this point. Forcing REST
// transport avoids gRPC entirely and uses plain HTTPS requests instead,
// which work reliably in these environments.
db.settings({ preferRest: true });
console.log('[firebaseAdmin] Firestore configured to use REST transport (preferRest)');

module.exports = { admin, db };
