const admin = require('./firebaseAdmin');
const { getUserProfile, createUserProfile } = require('./firestoreService');
const fetch = require('node-fetch');

function getAuth() {
  if (!admin) {
    throw new Error('Firebase Admin SDK not initialized. Set FIREBASE_SERVICE_ACCOUNT_JSON env var.');
  }
  return admin.auth();
}

/**
 * Create a new user account
 */
async function signup(email, password, name) {
  try {
    const auth = getAuth();
    
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
    });

    // Create user profile in Firestore
    await createUserProfile(userRecord.uid, {
      email,
      fullName: name || '',
      nickname: '',
      university: '',
      onboardingCompleted: false,
      enrolledClasses: [],
    });

    // Generate custom token for the user
    const customToken = await auth.createCustomToken(userRecord.uid);

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
      token: customToken,
    };
  } catch (error) {
    throw new Error(`Signup failed: ${error.message}`);
  }
}

/**
 * Verify Firebase ID token and return user info
 */
async function verifyToken(idToken) {
  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Get user profile
    const profile = await getUserProfile(decodedToken.uid);
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      profile: profile || null,
    };
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Login with email/password using Firebase Auth REST API
 */
async function loginWithEmailPassword(email, password) {
  try {
    const API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyDWmjPrqBmd2sJXWBuYlC3GieTYzwiAWGI';
    
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Login failed');
    }

    // Verify the ID token and get user info
    const user = await verifyToken(data.idToken);
    
    return {
      uid: user.uid,
      email: user.email,
      name: user.name,
      profile: user.profile,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
    };
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}

/**
 * Login - verifies credentials and returns user info
 * Supports both ID token verification and email/password
 */
async function login(idToken, email, password) {
  try {
    if (idToken) {
      // Verify the token from client-side Firebase Auth
      return await verifyToken(idToken);
    }
    
    if (email && password) {
      // Login with email/password
      return await loginWithEmailPassword(email, password);
    }
    
    throw new Error('Either idToken or email/password is required');
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}

/**
 * Get user by UID
 */
async function getUserById(uid) {
  try {
    const auth = getAuth();
    const userRecord = await auth.getUser(uid);
    const profile = await getUserProfile(uid);
    
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
      emailVerified: userRecord.emailVerified,
      profile: profile || null,
    };
  } catch (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }
}

/**
 * Update user account
 */
async function updateUser(uid, updates) {
  try {
    const auth = getAuth();
    const updateData = {};
    
    if (updates.email) updateData.email = updates.email;
    if (updates.password) updateData.password = updates.password;
    if (updates.displayName) updateData.displayName = updates.displayName;
    
    if (Object.keys(updateData).length > 0) {
      await auth.updateUser(uid, updateData);
    }
    
    return await getUserById(uid);
  } catch (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
}

/**
 * Delete user account
 */
async function deleteUser(uid) {
  try {
    const auth = getAuth();
    await auth.deleteUser(uid);
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}

module.exports = {
  signup,
  login,
  verifyToken,
  getUserById,
  updateUser,
  deleteUser,
};

