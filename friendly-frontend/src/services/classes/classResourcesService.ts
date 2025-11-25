import { ENV } from '@/src/config/env';
import {
  ClassAssignment,
  ClassFile,
  ClassNote,
  ClassRecording,
} from '@/src/types';

const API_BASE = ENV.API_BASE;

type ResourceKey = 'files' | 'recordings' | 'assignments' | 'notes';

const FALLBACK_KEYS: Record<ResourceKey, string[]> = {
  files: ['files', 'data', 'items', 'result'],
  recordings: ['recordings', 'data', 'items', 'result'],
  assignments: ['assignments', 'data', 'items', 'result'],
  notes: ['notes', 'data', 'items', 'result'],
};

const buildUrl = (path: string, params?: Record<string, string>) => {
  const url = `${API_BASE}${path}`;
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString();
    return `${url}?${queryString}`;
  }
  return url;
};

async function fetchCollection<T>(path: string, key: ResourceKey, userId?: string): Promise<T[]> {
  if (!path) {
    return [];
  }

  try {
    const params: Record<string, string> | undefined = userId ? { userId } : undefined;
    const response = await fetch(buildUrl(path, params));

    // Handle 404 gracefully - endpoint doesn't exist yet, return empty array
    if (response.status === 404) {
      return [];
    }

    // Handle 400 Bad Request - might be missing userId, return empty array gracefully
    if (response.status === 400) {
      console.warn(`Bad request for ${key} (might be missing userId):`, path);
      return [];
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to fetch ${key}`);
    }

    const payload = await response.json();

    if (Array.isArray(payload)) {
      return payload as T[];
    }

    for (const candidate of FALLBACK_KEYS[key]) {
      const value = (payload as Record<string, unknown>)[candidate];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }

    return [];
  } catch (error) {
    // If it's a network error or other issue, log but don't throw
    // This prevents error banners from showing when endpoints don't exist
    console.warn(`Failed to fetch ${key} from ${path}:`, error);
    return [];
  }
}

export async function fetchClassFiles(classId: string, userId?: string): Promise<ClassFile[]> {
  if (!classId) {
    return [];
  }
  return fetchCollection<ClassFile>(`/api/classes/${classId}/files`, 'files', userId);
}

export async function fetchClassRecordings(classId: string, userId?: string): Promise<ClassRecording[]> {
  if (!classId) {
    return [];
  }
  
  // Try the new endpoint first (lectures-based)
  if (userId) {
    try {
      const response = await fetch(`${API_BASE}/api/lectures/class/${classId}/recordings?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.recordings)) {
          return data.recordings as ClassRecording[];
        }
      }
    } catch (error) {
      console.warn('Failed to fetch recordings from lectures endpoint:', error);
    }
  }
  
  // Fallback to classes endpoint (with userId if available)
  return fetchCollection<ClassRecording>(`/api/classes/${classId}/recordings`, 'recordings', userId);
}

export async function fetchClassAssignments(classId: string, userId?: string): Promise<ClassAssignment[]> {
  if (!classId) {
    return [];
  }
  return fetchCollection<ClassAssignment>(`/api/classes/${classId}/assignments`, 'assignments', userId);
}

export async function fetchClassNotes(classId: string, userId?: string): Promise<ClassNote[]> {
  if (!classId) {
    return [];
  }
  return fetchCollection<ClassNote>(`/api/classes/${classId}/notes`, 'notes', userId);
}

export async function createAssignment(
  classId: string,
  userId: string,
  assignmentData: {
    title: string;
    description?: string;
    type?: 'ppt' | 'report' | 'team-meeting' | 'exam' | 'homework' | 'project' | 'other';
    dueDate?: string;
  }
): Promise<ClassAssignment> {
  const requestBody: any = {
    userId,
    title: assignmentData.title,
    description: assignmentData.description || '',
    type: assignmentData.type || 'other',
  };

  // Only include dueDate if it's provided
  if (assignmentData.dueDate) {
    requestBody.dueDate = assignmentData.dueDate;
  }

  const url = `${API_BASE}/api/classes/${classId}/assignments`;
  console.log('Creating assignment:', { url, requestBody });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log('Assignment creation response:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  });

  if (!response.ok) {
    let errorMessage = 'Failed to create assignment';
    let errorData: any = null;
    try {
      errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      console.error('Assignment creation error response:', errorData);
    } catch (e) {
      const text = await response.text();
      console.error('Assignment creation error (non-JSON):', text);
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('Assignment creation success:', data);
  
  if (!data.assignment) {
    console.error('Invalid response structure:', data);
    throw new Error('Invalid response from server');
  }
  return data.assignment;
}

export async function getUserClasses(userId: string): Promise<Array<{ id: string; title: string }>> {
  try {
    const response = await fetch(`${API_BASE}/api/lectures?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch classes');
    }
    const data = await response.json();
    return (data.lectures || []).map((lecture: any) => ({
      id: lecture.id,
      title: lecture.title,
    }));
  } catch (error) {
    console.error('Error fetching user classes:', error);
    return [];
  }
}

export async function updateAssignment(
  assignmentId: string,
  classId: string,
  userId: string,
  assignmentData: {
    title?: string;
    description?: string;
    type?: 'ppt' | 'report' | 'team-meeting' | 'exam' | 'homework' | 'project' | 'other';
    dueDate?: string;
    status?: 'not_started' | 'in_progress' | 'completed';
  }
): Promise<ClassAssignment> {
  const requestBody: any = { userId };
  
  if (assignmentData.title !== undefined) requestBody.title = assignmentData.title;
  if (assignmentData.description !== undefined) requestBody.description = assignmentData.description;
  if (assignmentData.type !== undefined) requestBody.type = assignmentData.type;
  if (assignmentData.dueDate !== undefined) requestBody.dueDate = assignmentData.dueDate || null;
  if (assignmentData.status !== undefined) requestBody.status = assignmentData.status;

  const response = await fetch(`${API_BASE}/api/classes/${classId}/assignments/${assignmentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to update assignment';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch (e) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.assignment;
}

export async function deleteAssignment(
  assignmentId: string,
  classId: string,
  userId: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/classes/${classId}/assignments/${assignmentId}?userId=${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = 'Failed to delete assignment';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch (e) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
}

