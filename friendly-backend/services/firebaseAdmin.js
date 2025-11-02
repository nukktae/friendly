const admin = require('firebase-admin');

function initializeFirebaseAdmin() {
  if (admin.apps.length) return admin;

  // Prefer GOOGLE_APPLICATION_CREDENTIALS JSON in env
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  try {
    if (serviceAccountJson) {
      // Handle JSON string that might be wrapped in quotes
      let jsonString = serviceAccountJson.trim();
      if ((jsonString.startsWith('"') && jsonString.endsWith('"')) || 
          (jsonString.startsWith("'") && jsonString.endsWith("'"))) {
        jsonString = jsonString.slice(1, -1);
      }
      
      const credentials = JSON.parse(jsonString);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });
      console.log('✅ Firebase Admin SDK initialized successfully');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Fallback to default credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS path)
      admin.initializeApp();
      console.log('✅ Firebase Admin SDK initialized with default credentials');
    } else {
      console.warn('⚠️  Warning: Firebase Admin SDK not initialized - Firebase features will not work');
      console.warn('📝 Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS env var');
      console.warn('💡 Get service account JSON from: Firebase Console > Project Settings > Service Accounts');
      // Return a mock admin object so the server can still start
      return null;
    }
  } catch (e) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', e.message);
    console.error('💡 Make sure FIREBASE_SERVICE_ACCOUNT_JSON is valid JSON');
    console.warn('⚠️  Server will start but Firebase features will not work');
    return null;
  }

  return admin;
}

module.exports = initializeFirebaseAdmin();


