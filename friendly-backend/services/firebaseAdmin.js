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
      
      // Determine storage bucket name
      // Priority: 1. FIREBASE_STORAGE_BUCKET env var, 2. project_id.firebasestorage.app (new format), 3. project_id.appspot.com (old format)
      let storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
      
      if (!storageBucket && credentials.project_id) {
        // Try new format first (.firebasestorage.app), then fall back to old format (.appspot.com)
        storageBucket = `${credentials.project_id}.firebasestorage.app`;
        console.log(`📦 Using default storage bucket (new format): ${storageBucket}`);
        console.log(`💡 If this doesn't work, try: ${credentials.project_id}.appspot.com`);
        console.log(`💡 Or set FIREBASE_STORAGE_BUCKET env var explicitly`);
      }
      
      const appConfig = {
        credential: admin.credential.cert(credentials),
      };
      
      if (storageBucket) {
        appConfig.storageBucket = storageBucket;
        console.log(`✅ Firebase Admin SDK initialized with storage bucket: ${storageBucket}`);
      } else {
        console.warn('⚠️  Warning: Storage bucket not configured. PDF uploads may fail.');
        console.warn('💡 Set FIREBASE_STORAGE_BUCKET env var or ensure project_id is in service account JSON');
      }
      
      admin.initializeApp(appConfig);
      console.log('✅ Firebase Admin SDK initialized successfully');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Fallback to default credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS path)
      const appConfig = {};
      
      // Try to get storage bucket from env var
      if (process.env.FIREBASE_STORAGE_BUCKET) {
        appConfig.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
        console.log(`✅ Firebase Admin SDK initialized with storage bucket: ${appConfig.storageBucket}`);
      } else {
        console.warn('⚠️  Warning: Storage bucket not configured. PDF uploads may fail.');
        console.warn('💡 Set FIREBASE_STORAGE_BUCKET env var');
      }
      
      admin.initializeApp(appConfig);
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


