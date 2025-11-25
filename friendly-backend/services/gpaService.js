const { getDb } = require('./firestoreService');

const GPA_COLLECTION = 'gpa_data';

/**
 * Get GPA data for a user
 */
async function getGpaData(userId) {
  try {
    const db = getDb();
    const doc = await db.collection(GPA_COLLECTION).doc(userId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      userId: data.userId || userId,
      courses: data.courses || [],
      totalCreditsRequired: data.totalCreditsRequired || 120,
      completedRequiredCourses: data.completedRequiredCourses || [],
      completedCoreCategories: data.completedCoreCategories || [],
      graduationRequirementsAnalysis: data.graduationRequirementsAnalysis || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error('Error getting GPA data:', error);
    throw new Error(`Failed to get GPA data: ${error.message}`);
  }
}

/**
 * Save GPA data for a user
 */
async function saveGpaData(userId, data) {
  try {
    const db = getDb();
    const now = new Date();

    const gpaData = {
      userId,
      courses: data.courses || [],
      totalCreditsRequired: data.totalCreditsRequired || 120,
      completedRequiredCourses: data.completedRequiredCourses || [],
      completedCoreCategories: data.completedCoreCategories || [],
      graduationRequirementsAnalysis: data.graduationRequirementsAnalysis || null,
      updatedAt: now,
    };

    // Check if document exists
    const doc = await db.collection(GPA_COLLECTION).doc(userId).get();
    
    if (!doc.exists) {
      gpaData.createdAt = now;
    }

    await db.collection(GPA_COLLECTION).doc(userId).set(gpaData, { merge: true });

    return gpaData;
  } catch (error) {
    console.error('Error saving GPA data:', error);
    throw new Error(`Failed to save GPA data: ${error.message}`);
  }
}

/**
 * Add a course to user's GPA data
 */
async function addCourse(userId, course) {
  const gpaData = await getGpaData(userId);
  
  const courseToAdd = {
    id: course.id || `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: course.name,
    credits: course.credits,
    grade: course.grade,
    semester: course.semester,
    year: course.year,
    createdAt: course.createdAt || new Date(),
    updatedAt: new Date(),
  };

  const updatedCourses = [...(gpaData?.courses || []), courseToAdd];
  
  return await saveGpaData(userId, {
    ...gpaData,
    courses: updatedCourses,
    totalCreditsRequired: gpaData?.totalCreditsRequired || course.totalCreditsRequired || 120,
  });
}

/**
 * Update a course in user's GPA data
 */
async function updateCourse(userId, courseId, updates) {
  const gpaData = await getGpaData(userId);
  
  if (!gpaData) {
    throw new Error('GPA data not found');
  }

  const updatedCourses = gpaData.courses.map((course) =>
    course.id === courseId
      ? { ...course, ...updates, updatedAt: new Date() }
      : course
  );

  return await saveGpaData(userId, {
    ...gpaData,
    courses: updatedCourses,
  });
}

/**
 * Delete a course from user's GPA data
 */
async function deleteCourse(userId, courseId) {
  const gpaData = await getGpaData(userId);
  
  if (!gpaData) {
    throw new Error('GPA data not found');
  }

  const updatedCourses = gpaData.courses.filter(
    (course) => course.id !== courseId
  );

  return await saveGpaData(userId, {
    ...gpaData,
    courses: updatedCourses,
  });
}

module.exports = {
  getGpaData,
  saveGpaData,
  addCourse,
  updateCourse,
  deleteCourse,
};

