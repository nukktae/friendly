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
      const errorMessage = 'Firebase Admin SDK cannot be initialized - Firebase credentials are missing.\n' +
        '📝 Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS env var\n' +
        '💡 Get service account JSON from: Firebase Console > Project Settings > Service Accounts\n' +
        '💡 For development/testing, set ALLOW_MISSING_FIREBASE=true to allow server to start without Firebase';
      
      // Allow server to start without Firebase only if explicitly allowed (for development/testing)
      if (process.env.ALLOW_MISSING_FIREBASE === 'true') {
        console.warn('⚠️  WARNING: Firebase Admin SDK not initialized - Firebase features will not work');
        console.warn('⚠️  This is only allowed because ALLOW_MISSING_FIREBASE=true');
        console.warn('⚠️  Set Firebase credentials for production use');
        return null;
      }
      
      // Fail fast in production or when not explicitly allowed
      console.error('❌ ' + errorMessage);
      throw new Error('Firebase Admin SDK initialization failed: Missing credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS env var.');
    }
  } catch (e) {
    const errorMessage = `Failed to initialize Firebase Admin SDK: ${e.message}\n` +
      '💡 Make sure FIREBASE_SERVICE_ACCOUNT_JSON is valid JSON\n' +
      '💡 For development/testing, set ALLOW_MISSING_FIREBASE=true to allow server to start without Firebase';
    
    // Allow server to start without Firebase only if explicitly allowed (for development/testing)
    if (process.env.ALLOW_MISSING_FIREBASE === 'true') {
      console.error('❌ ' + errorMessage);
      console.warn('⚠️  Server will start but Firebase features will not work');
      console.warn('⚠️  This is only allowed because ALLOW_MISSING_FIREBASE=true');
      return null;
    }
    
    // Fail fast in production or when not explicitly allowed
    console.error('❌ ' + errorMessage);
    throw new Error(`Firebase Admin SDK initialization failed: ${e.message}. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS env var.`);
  }

  return admin;
}

module.exports = initializeFirebaseAdmin();


