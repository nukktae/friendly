import { ENV } from '@/src/config/env';
import { Course, GPAData } from '@/src/types/gpa.types';

const API_BASE = ENV.API_BASE || 'http://localhost:4000';

/**
 * Get GPA data for a user
 */
export async function getGPAData(userId: string): Promise<GPAData | null> {
  try {
    console.log('[getGPAData] Fetching GPA data for userId:', userId);
    console.log('[getGPAData] API URL:', `${API_BASE}/api/gpa/${userId}`);
    
    const response = await fetch(`${API_BASE}/api/gpa/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[getGPAData] Response status:', response.status);
    console.log('[getGPAData] Response ok:', response.ok);

    if (response.status === 404) {
      console.log('[getGPAData] 404 - GPA data not found, returning null');
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      console.error('[getGPAData] Error response:', error);
      throw new Error(error.error || 'Failed to fetch GPA data');
    }

    const data = await response.json();
    console.log('[getGPAData] Success, received data:', data);
    return data.gpaData || data;
  } catch (error: any) {
    console.error('[getGPAData] Error:', error);
    // If backend is not available, try local storage fallback
    if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
      console.log('[getGPAData] Network error, trying local storage fallback');
      return await getGPADataLocal(userId);
    }
    throw error;
  }
}

/**
 * Save GPA data for a user
 */
export async function saveGPAData(
  userId: string,
  data: Partial<GPAData>
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/gpa/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save GPA data');
    }

    // Also save locally as backup
    await saveGPADataLocal(userId, data as GPAData);
  } catch (error: any) {
    // If backend is not available, save locally
    if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
      await saveGPADataLocal(userId, data as GPAData);
      return;
    }
    throw error;
  }
}

/**
 * Add a course to user's GPA data
 */
export async function addCourse(userId: string, course: Course): Promise<void> {
  const gpaData = await getGPAData(userId);
  
  const updatedCourses = [...(gpaData?.courses || []), course];
  
  await saveGPAData(userId, {
    ...gpaData,
    courses: updatedCourses,
    updatedAt: new Date(),
  });
}

/**
 * Update a course in user's GPA data
 */
export async function updateCourse(
  userId: string,
  courseId: string,
  updates: Partial<Course>
): Promise<void> {
  const gpaData = await getGPAData(userId);
  
  if (!gpaData) {
    throw new Error('GPA data not found');
  }

  const updatedCourses = gpaData.courses.map((course) =>
    course.id === courseId
      ? { ...course, ...updates, updatedAt: new Date() }
      : course
  );

  await saveGPAData(userId, {
    ...gpaData,
    courses: updatedCourses,
    updatedAt: new Date(),
  });
}

/**
 * Delete a course from user's GPA data
 */
export async function deleteCourse(
  userId: string,
  courseId: string
): Promise<void> {
  const gpaData = await getGPAData(userId);
  
  if (!gpaData) {
    throw new Error('GPA data not found');
  }

  const updatedCourses = gpaData.courses.filter(
    (course) => course.id !== courseId
  );

  await saveGPAData(userId, {
    ...gpaData,
    courses: updatedCourses,
    updatedAt: new Date(),
  });
}

// Local storage fallback functions
async function getGPADataLocal(userId: string): Promise<GPAData | null> {
  try {
    const { getStorageAdapter } = await import('@/src/lib/storage');
    const storage = getStorageAdapter();
    const stored = await storage.getItem(`@gpa_data_${userId}`);
    if (stored) {
      const data = JSON.parse(stored);
      // Convert date strings back to Date objects
      if (data.courses) {
        data.courses = data.courses.map((course: any) => ({
          ...course,
          createdAt: new Date(course.createdAt),
          updatedAt: new Date(course.updatedAt),
        }));
      }
      return data;
    }
    return null;
  } catch (error) {
    console.error('Failed to load GPA data from local storage:', error);
    return null;
  }
}

async function saveGPADataLocal(userId: string, data: GPAData): Promise<void> {
  try {
    const { getStorageAdapter } = await import('@/src/lib/storage');
    const storage = getStorageAdapter();
    await storage.setItem(`@gpa_data_${userId}`, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save GPA data to local storage:', error);
  }
}

