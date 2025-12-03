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

// PDF/Class Files Collection
const CLASS_FILES = 'classFiles';

async function createPDFFile(pdfData) {
  const fileId = pdfData.id || `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  const fileDoc = {
    id: fileId,
    userId: pdfData.userId,
    classId: pdfData.classId || null,
    title: pdfData.title,
    originalFilename: pdfData.originalFilename,
    storagePath: pdfData.storagePath,
    downloadUrl: pdfData.downloadUrl,
    size: pdfData.size,
    pages: pdfData.pages || 0,
    fileType: 'pdf',
    extractedText: pdfData.extractedText || null,
    analysis: pdfData.analysis || null,
    annotations: pdfData.annotations || [],
    createdAt: now,
    updatedAt: now,
  };

  await getDb().collection(CLASS_FILES).doc(fileId).set(fileDoc);
  return fileId;
}

async function getPDFFileById(fileId, userId) {
  const doc = await getDb().collection(CLASS_FILES).doc(fileId).get();
  if (!doc.exists) {
    return null;
  }
  const data = doc.data();
  // Verify ownership
  if (data.userId !== userId) {
    throw new Error('Unauthorized: You can only access your own files');
  }
  return data;
}

async function updatePDFFile(fileId, userId, updates) {
  // Verify ownership
  const existing = await getPDFFileById(fileId, userId);
  if (!existing) {
    throw new Error('File not found');
  }

  await getDb().collection(CLASS_FILES).doc(fileId).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return await getPDFFileById(fileId, userId);
}

async function deletePDFFile(fileId, userId) {
  // Verify ownership
  const existing = await getPDFFileById(fileId, userId);
  if (!existing) {
    throw new Error('File not found');
  }

  await getDb().collection(CLASS_FILES).doc(fileId).delete();
}

async function listClassFiles(classId, userId) {
  try {
    if (!classId || !userId) {
      return [];
    }

    // First, try with orderBy (requires composite index)
    try {
      const query = getDb().collection(CLASS_FILES)
        .where('userId', '==', userId)
        .where('classId', '==', classId)
        .orderBy('createdAt', 'desc');
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => doc.data());
    } catch (orderByError) {
      // If orderBy fails (likely missing index), fall back to query without orderBy
      // and sort in memory
      console.warn('OrderBy failed, falling back to in-memory sort:', orderByError.message);
      const query = getDb().collection(CLASS_FILES)
        .where('userId', '==', userId)
        .where('classId', '==', classId);
      
      const snapshot = await query.get();
      const files = snapshot.docs.map(doc => doc.data());
      
      // Sort by createdAt in memory
      return files.sort((a, b) => {
        const aTime = a.createdAt?._seconds || a.createdAt?.seconds || 0;
        const bTime = b.createdAt?._seconds || b.createdAt?.seconds || 0;
        return bTime - aTime; // desc order
      });
    }
  } catch (error) {
    console.error('Error in listClassFiles:', error);
    // Return empty array instead of throwing to prevent 500 errors
    return [];
  }
}

async function listUserPDFs(userId, classId = null) {
  let query = getDb().collection(CLASS_FILES)
    .where('userId', '==', userId);
  
  if (classId) {
    query = query.where('classId', '==', classId);
  } else {
    // Get standalone PDFs (no classId)
    query = query.where('classId', '==', null);
  }
  
  query = query.orderBy('createdAt', 'desc');
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data());
}

async function savePDFChatMessage(fileId, userId, question, answer, pageReferences = []) {
  const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  const chatData = {
    chatId,
    fileId,
    userId,
    question,
    answer,
    pageReferences,
    timestamp: now,
  };

  await getDb().collection('pdfChats').doc(chatId).set(chatData);
  return chatData;
}

async function getPDFChatHistory(fileId, userId, limit = 50) {
  try {
    // Try query with orderBy first (requires index)
    const query = getDb().collection('pdfChats')
      .where('fileId', '==', fileId)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit);
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data());
  } catch (orderByError) {
    // If orderBy fails (missing index), fall back to query without orderBy
    // and sort in memory
    console.warn('OrderBy failed for PDF chat history, falling back to in-memory sort:', orderByError.message);
    
    const query = getDb().collection('pdfChats')
      .where('fileId', '==', fileId)
      .where('userId', '==', userId);
    
    const snapshot = await query.get();
    const chats = snapshot.docs.map(doc => doc.data());
    
    // Sort by timestamp in memory (descending order)
    const sortedChats = chats.sort((a, b) => {
      const aTime = a.timestamp?._seconds || a.timestamp?.seconds || 0;
      const bTime = b.timestamp?._seconds || b.timestamp?.seconds || 0;
      return bTime - aTime; // desc order (newest first)
    });
    
    // Apply limit after sorting
    return sortedChats.slice(0, limit);
  }
}

// Assignments Collection
const ASSIGNMENTS = 'assignments';
const EXAMS = 'exams';

async function createAssignment(assignmentData) {
  const assignmentId = assignmentData.id || `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  // Valid status values
  const validStatuses = ['not_started', 'in_progress', 'completed'];
  const status = assignmentData.status && validStatuses.includes(assignmentData.status) 
    ? assignmentData.status 
    : 'not_started';
  
  const assignmentDoc = {
    id: assignmentId,
    userId: assignmentData.userId,
    classId: assignmentData.classId || null,
    title: assignmentData.title,
    description: assignmentData.description || '',
    type: assignmentData.type || 'other',
    dueDate: assignmentData.dueDate || null,
    status: status,
    createdAt: now,
    updatedAt: now,
  };
  
  await getDb().collection(ASSIGNMENTS).doc(assignmentId).set(assignmentDoc);
  return assignmentId;
}

async function getAssignmentById(assignmentId, userId) {
  const doc = await getDb().collection(ASSIGNMENTS).doc(assignmentId).get();
  if (!doc.exists) {
    throw new Error('Assignment not found');
  }
  const data = doc.data();
  if (data.userId !== userId) {
    throw new Error('Unauthorized: Assignment belongs to another user');
  }
  return { id: doc.id, ...data };
}

async function updateAssignment(assignmentId, userId, updates) {
  await getAssignmentById(assignmentId, userId); // Verify ownership
  
  // Validate status if it's being updated
  if (updates.status !== undefined) {
    const validStatuses = ['not_started', 'in_progress', 'completed'];
    if (!validStatuses.includes(updates.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
  }
  
  await getDb().collection(ASSIGNMENTS).doc(assignmentId).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function deleteAssignment(assignmentId, userId) {
  await getAssignmentById(assignmentId, userId); // Verify ownership
  await getDb().collection(ASSIGNMENTS).doc(assignmentId).delete();
}

async function listUserAssignments(userId, limit = 100) {
  try {
    const q = await getDb().collection(ASSIGNMENTS)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return q.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    if (error.message && error.message.includes('index')) {
      const q = await getDb().collection(ASSIGNMENTS)
        .where('userId', '==', userId)
        .limit(limit)
        .get();
      const assignments = q.docs.map(d => ({ id: d.id, ...d.data() }));
      return assignments.sort((a, b) => {
        const aTime = a.createdAt?._seconds || a.createdAt?.seconds || 0;
        const bTime = b.createdAt?._seconds || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
    }
    throw error;
  }
}

async function listClassAssignments(classId, userId, limit = 100) {
  try {
    const q = await getDb().collection(ASSIGNMENTS)
      .where('userId', '==', userId)
      .where('classId', '==', classId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return q.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    if (error.message && error.message.includes('index')) {
      const q = await getDb().collection(ASSIGNMENTS)
        .where('userId', '==', userId)
        .where('classId', '==', classId)
        .limit(limit)
        .get();
      const assignments = q.docs.map(d => ({ id: d.id, ...d.data() }));
      return assignments.sort((a, b) => {
        const aTime = a.createdAt?._seconds || a.createdAt?.seconds || 0;
        const bTime = b.createdAt?._seconds || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
    }
    throw error;
  }
}

// Exams Collection
async function createExam(examData) {
  const examId = examData.id || `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  // Calculate status based on date
  const examDate = examData.date ? new Date(examData.date) : null;
  let status = 'upcoming';
  if (examDate && !isNaN(examDate.getTime())) {
    const now = new Date();
    const durationMinutes = examData.durationMinutes || 60;
    const endDate = new Date(examDate.getTime() + durationMinutes * 60000);
    if (now > endDate) {
      status = 'completed';
    } else if (now >= examDate && now <= endDate) {
      status = 'in_progress';
    }
  }
  
  const examDoc = {
    id: examId,
    userId: examData.userId,
    classId: examData.classId || null,
    title: examData.title,
    description: examData.description || '',
    date: examData.date || null,
    durationMinutes: examData.durationMinutes || 60,
    location: examData.location || null,
    instructions: examData.instructions || null,
    status: status,
    createdAt: now,
    updatedAt: now,
  };
  
  await getDb().collection(EXAMS).doc(examId).set(examDoc);
  return examId;
}

async function getExamById(examId, userId) {
  const doc = await getDb().collection(EXAMS).doc(examId).get();
  if (!doc.exists) {
    throw new Error('Exam not found');
  }
  const data = doc.data();
  if (data.userId !== userId) {
    throw new Error('Unauthorized: Exam belongs to another user');
  }
  return { id: doc.id, ...data };
}

async function updateExam(examId, userId, updates) {
  await getExamById(examId, userId); // Verify ownership
  
  // Recalculate status if date is being updated
  if (updates.date !== undefined || updates.durationMinutes !== undefined) {
    const currentExam = await getExamById(examId, userId);
    let examDate = null;
    if (updates.date) {
      examDate = new Date(updates.date);
    } else if (currentExam.date) {
      if (typeof currentExam.date === 'string') {
        examDate = new Date(currentExam.date);
      } else if (currentExam.date._seconds) {
        examDate = new Date(currentExam.date._seconds * 1000);
      } else if (currentExam.date.seconds) {
        examDate = new Date(currentExam.date.seconds * 1000);
      }
    }
    const durationMinutes = updates.durationMinutes !== undefined ? updates.durationMinutes : (currentExam.durationMinutes || 60);
    
    if (examDate) {
      const now = new Date();
      const endDate = new Date(examDate.getTime() + durationMinutes * 60000);
      if (now > endDate) {
        updates.status = 'completed';
      } else if (now >= examDate && now <= endDate) {
        updates.status = 'in_progress';
      } else {
        updates.status = 'upcoming';
      }
    }
  }
  
  // Validate status if it's being updated
  if (updates.status !== undefined) {
    const validStatuses = ['upcoming', 'completed', 'missed', 'in_progress'];
    if (!validStatuses.includes(updates.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
  }
  
  await getDb().collection(EXAMS).doc(examId).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function deleteExam(examId, userId) {
  await getExamById(examId, userId); // Verify ownership
  await getDb().collection(EXAMS).doc(examId).delete();
}

async function listClassExams(classId, userId, limit = 100) {
  try {
    const q = await getDb().collection(EXAMS)
      .where('userId', '==', userId)
      .where('classId', '==', classId)
      .orderBy('date', 'asc')
      .limit(limit)
      .get();
    return q.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    if (error.message && error.message.includes('index')) {
      const q = await getDb().collection(EXAMS)
        .where('userId', '==', userId)
        .where('classId', '==', classId)
        .limit(limit)
        .get();
      const exams = q.docs.map(d => ({ id: d.id, ...d.data() }));
      return exams.sort((a, b) => {
        const aTime = a.date?._seconds || a.date?.seconds || 0;
        const bTime = b.date?._seconds || b.date?.seconds || 0;
        return aTime - bTime;
      });
    }
    throw error;
  }
}

module.exports = {
  getDb,
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
  // PDF/Class Files functions
  createPDFFile,
  getPDFFileById,
  updatePDFFile,
  deletePDFFile,
  listClassFiles,
  listUserPDFs,
  savePDFChatMessage,
  getPDFChatHistory,
  // Assignment functions
  createAssignment,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  listUserAssignments,
  listClassAssignments,
  // Exam functions
  createExam,
  getExamById,
  updateExam,
  deleteExam,
  listClassExams,
};


