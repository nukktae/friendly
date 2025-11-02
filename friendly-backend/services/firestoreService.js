const admin = require('./firebaseAdmin');
let db = null;

function getDb() {
  if (!admin) {
    throw new Error('Firebase Admin SDK not initialized. Set FIREBASE_SERVICE_ACCOUNT_JSON env var.');
  }
  if (!db) {
    db = admin.firestore();
  }
  return db;
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

module.exports = {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  listUsers,
  saveSchedule,
  getScheduleById,
  listUserSchedules,
};


