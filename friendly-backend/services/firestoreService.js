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
    schoolVerified: payload.schoolVerified || false, // Add school verification field
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

async function updateSchedule(scheduleId, updates) {
  await getDb().collection(SCHEDULES).doc(scheduleId).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function listUserSchedules(userId) {
  try {
  const q = await getDb().collection(SCHEDULES)
    .where('userId', '==', userId)
    .where('isActive', '==', true)
    .orderBy('updatedAt', 'desc')
    .get();
  return q.docs.map(d => d.data());
  } catch (error) {
    // If index error, try without orderBy
    if (error.message && error.message.includes('index')) {
      const q = await getDb().collection(SCHEDULES)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
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

// Lectures
const LECTURES = 'lectures';

async function createLecture(lectureData) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  // Remove undefined values to avoid Firestore errors
  const cleanedData = Object.fromEntries(
    Object.entries(lectureData).filter(([_, value]) => value !== undefined)
  );
  
  const lecture = {
    ...cleanedData,
    createdAt: cleanedData.createdAt || now,
    updatedAt: now,
  };
  await getDb().collection(LECTURES).doc(lectureData.id).set(lecture);
  return lectureData.id;
}

async function getLectureById(lectureId, userId) {
  const doc = await getDb().collection(LECTURES).doc(lectureId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  // Verify ownership if userId provided
  if (userId && data.userId !== userId) return null;
  return { id: doc.id, ...data };
}

async function updateLecture(lectureId, updates) {
  await getDb().collection(LECTURES).doc(lectureId).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function listUserLectures(userId) {
  try {
    const q = await getDb().collection(LECTURES)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return q.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    // If index error, try without orderBy
    if (error.message && error.message.includes('index')) {
      const q = await getDb().collection(LECTURES)
        .where('userId', '==', userId)
        .get();
      const lectures = q.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in memory instead
      return lectures.sort((a, b) => {
        const aTime = a.createdAt?._seconds || a.createdAt?.seconds || 0;
        const bTime = b.createdAt?._seconds || b.createdAt?.seconds || 0;
        return bTime - aTime; // Descending order
      });
    }
    throw error;
  }
}

async function getAllUserLectures(userId) {
  const q = await getDb().collection(LECTURES)
    .where('userId', '==', userId)
    .get();
  return q.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function deleteLecture(lectureId, userId) {
  const lecture = await getLectureById(lectureId, userId);
  if (!lecture) {
    throw new Error('Lecture not found');
  }
  await getDb().collection(LECTURES).doc(lectureId).delete();
}

async function getLectureByTranscriptionId(transcriptionId, userId = null) {
  const q = await getDb().collection(LECTURES)
    .where('transcriptionId', '==', transcriptionId)
    .limit(1)
    .get();
  
  if (q.empty) return null;
  
  const doc = q.docs[0];
  const data = doc.data();
  
  // Verify ownership if userId provided
  if (userId && data.userId !== userId) return null;
  
  return { id: doc.id, ...data };
}

// Chat History
const CHAT_HISTORY = 'chatHistory';

async function saveChatMessage(userId, question, answer, lecturesReferenced = []) {
  const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  const chatMessage = {
    id: chatId,
    userId,
    question,
    answer,
    lecturesReferenced,
    createdAt: now,
  };
  
  await getDb().collection(CHAT_HISTORY).doc(chatId).set(chatMessage);
  return chatId;
}

async function getUserChatHistory(userId, limit = 50) {
  try {
    const q = await getDb().collection(CHAT_HISTORY)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return q.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    // If index error, try without orderBy
    if (error.message && error.message.includes('index')) {
      const q = await getDb().collection(CHAT_HISTORY)
        .where('userId', '==', userId)
        .limit(limit)
        .get();
      
      const chats = q.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in memory instead
      return chats.sort((a, b) => {
        const aTime = a.createdAt?._seconds || a.createdAt?.seconds || 0;
        const bTime = b.createdAt?._seconds || b.createdAt?.seconds || 0;
        return bTime - aTime; // Descending order
      });
    }
    throw error;
  }
}

async function deleteChatMessage(chatId, userId) {
  const doc = await getDb().collection(CHAT_HISTORY).doc(chatId).get();
  if (!doc.exists) {
    throw new Error('Chat message not found');
  }
  
  const data = doc.data();
  if (data.userId !== userId) {
    throw new Error('Unauthorized: Chat message does not belong to user');
  }
  
  await getDb().collection(CHAT_HISTORY).doc(chatId).delete();
}

async function deleteAllUserChatHistory(userId) {
  const q = await getDb().collection(CHAT_HISTORY)
    .where('userId', '==', userId)
    .get();
  
  const batch = getDb().batch();
  q.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  return q.docs.length;
}

// Community Posts
const COMMUNITY_POSTS = 'communityPosts';

async function createCommunityPost(postData) {
  const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  const post = {
    id: postId,
    ...postData,
    likes: [],
    comments: [],
    likesCount: 0,
    commentsCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  
  await getDb().collection(COMMUNITY_POSTS).doc(postId).set(post);
  return postId;
}

async function getCommunityPost(postId) {
  const doc = await getDb().collection(COMMUNITY_POSTS).doc(postId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function listCommunityPosts(filters = {}) {
  try {
    let query = getDb().collection(COMMUNITY_POSTS);
    
    // Apply filters
    if (filters.category && filters.category !== 'All') {
      query = query.where('category', '==', filters.category);
    }
    if (filters.university && filters.university !== 'All Universities') {
      query = query.where('author.university', '==', filters.university);
    }
    if (filters.userId) {
      query = query.where('author.userId', '==', filters.userId);
    }
    
    // Order by creation date (newest first)
    query = query.orderBy('createdAt', 'desc');
    
    // Apply limit
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    // If index error, try without orderBy
    if (error.message && error.message.includes('index')) {
      let query = getDb().collection(COMMUNITY_POSTS);
      if (filters.category && filters.category !== 'All') {
        query = query.where('category', '==', filters.category);
      }
      if (filters.university && filters.university !== 'All Universities') {
        query = query.where('author.university', '==', filters.university);
      }
      const snapshot = await query.get();
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory
      return posts.sort((a, b) => {
        const aTime = a.createdAt?._seconds || a.createdAt?.seconds || 0;
        const bTime = b.createdAt?._seconds || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
    }
    throw error;
  }
}

async function updateCommunityPost(postId, updates) {
  await getDb().collection(COMMUNITY_POSTS).doc(postId).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function deleteCommunityPost(postId, userId) {
  const post = await getCommunityPost(postId);
  if (!post) {
    throw new Error('Post not found');
  }
  if (post.author.userId !== userId) {
    throw new Error('Unauthorized: You can only delete your own posts');
  }
  await getDb().collection(COMMUNITY_POSTS).doc(postId).delete();
}

async function togglePostLike(postId, userId) {
  const post = await getCommunityPost(postId);
  if (!post) {
    throw new Error('Post not found');
  }
  
  const likes = post.likes || [];
  const isLiked = likes.includes(userId);
  
  let updatedLikes;
  if (isLiked) {
    updatedLikes = likes.filter(id => id !== userId);
  } else {
    updatedLikes = [...likes, userId];
  }
  
  await updateCommunityPost(postId, {
    likes: updatedLikes,
    likesCount: updatedLikes.length,
  });
  
  return {
    isLiked: !isLiked,
    likesCount: updatedLikes.length,
  };
}

async function addPostComment(postId, commentData) {
  const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  // Use regular Date instead of FieldValue.serverTimestamp() because it's going into an array
  const now = new Date();
  
  const comment = {
    id: commentId,
    ...commentData,
    createdAt: now,
  };
  
  const post = await getCommunityPost(postId);
  if (!post) {
    throw new Error('Post not found');
  }
  
  const comments = post.comments || [];
  const updatedComments = [...comments, comment];
  
  await updateCommunityPost(postId, {
    comments: updatedComments,
    commentsCount: updatedComments.length,
  });
  
  return comment;
}

module.exports = {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  listUsers,
  saveSchedule,
  getScheduleById,
  updateSchedule,
  listUserSchedules,
  saveSimpleSchedule,
  getUserSchedules,
  createLecture,
  getLectureById,
  updateLecture,
  listUserLectures,
  getAllUserLectures,
  deleteLecture,
  getLectureByTranscriptionId,
  saveChatMessage,
  getUserChatHistory,
  deleteChatMessage,
  deleteAllUserChatHistory,
  createCommunityPost,
  getCommunityPost,
  listCommunityPosts,
  updateCommunityPost,
  deleteCommunityPost,
  togglePostLike,
  addPostComment,
};


