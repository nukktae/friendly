const admin = require('./firebaseAdmin');
let db = null;

function getDb() {
  if (!admin) {
    throw new Error('Firebase Admin SDK not initialized. Set FIREBASE_SERVICE_ACCOUNT_JSON env var.');
  }
  try {
    if (!db) {
      db = admin.firestore();
    }
    return db;
  } catch (error) {
    if (error.message && error.message.includes('Cannot read properties of null')) {
      throw new Error('Firebase Admin SDK not initialized. Set FIREBASE_SERVICE_ACCOUNT_JSON env var. See FIREBASE_SETUP.md for instructions.');
    }
    throw error;
  }
}

async function createUserProfile(uid, payload) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  await getDb().collection('users').doc(uid).set({
    ...payload,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
}

async function getUserProfile(uid) {
  const snap = await getDb().collection('users').doc(uid).get();
  return snap.exists ? { uid, ...snap.data() } : null;
}

async function updateUserProfile(uid, updates) {
  await getDb().collection('users').doc(uid).set({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function listUsers() {
  const snap = await getDb().collection('users').get();
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// Schedules
const SCHEDULES = 'userSchedules';

async function saveSchedule(schedule) {
  const id = schedule.id || `schedule_${Date.now()}`;
  const now = admin.firestore.FieldValue.serverTimestamp();
  await getDb().collection(SCHEDULES).doc(id).set({
    ...schedule,
    id,
    createdAt: schedule.createdAt || now,
    updatedAt: now,
  }, { merge: true });
  return id;
}

async function getScheduleById(id, userId) {
  const q = await getDb().collection(SCHEDULES)
    .where('id', '==', id)
    .where('userId', '==', userId)
    .limit(1)
    .get();
  if (q.empty) return null;
  return q.docs[0].data();
}

async function listUserSchedules(userId) {
  const q = await getDb().collection(SCHEDULES)
    .where('userId', '==', userId)
    .where('isActive', '==', true)
    .orderBy('updatedAt', 'desc')
    .get();
  return q.docs.map(d => d.data());
}

// Simple schedule functions for basic schedule management
async function saveSimpleSchedule(scheduleData) {
  const id = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  const schedule = {
    id,
    userId: scheduleData.userId,
    title: scheduleData.title,
    date: scheduleData.date,
    time: scheduleData.time,
    description: scheduleData.description || '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await getDb().collection(SCHEDULES).doc(id).set(schedule);
  return id;
}

async function getUserSchedules(userId) {
  try {
    const q = await getDb().collection(SCHEDULES)
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .get();
    return q.docs.map(d => d.data());
  } catch (error) {
    // If index error, try without orderBy
    if (error.message && error.message.includes('index')) {
      const q = await getDb().collection(SCHEDULES)
        .where('userId', '==', userId)
        .get();
      const schedules = q.docs.map(d => d.data());
      // Sort in memory instead
      return schedules.sort((a, b) => {
        const aTime = a.updatedAt?._seconds || a.updatedAt?.seconds || 0;
        const bTime = b.updatedAt?._seconds || b.updatedAt?.seconds || 0;
        return bTime - aTime; // Descending order
      });
    }
    throw error;
  }
}

module.exports = {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  listUsers,
  saveSchedule,
  getScheduleById,
  listUserSchedules,
  saveSimpleSchedule,
  getUserSchedules,
};


