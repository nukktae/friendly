import { ENV } from '../../config/env';
import { Lecture, ActionItem } from '../../types/lecture.types';

const API_BASE = ENV.API_BASE || 'http://localhost:4000';

/**
 * Create a new lecture (simple creation without starting recording)
 */
export async function createLecture(
  userId: string,
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
  }
): Promise<{ lectureId: string; lecture: Lecture }> {
  const response = await fetch(`${API_BASE}/api/lectures`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      title: metadata?.title,
      description: metadata?.description,
      tags: metadata?.tags,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create lecture');
  }

  return await response.json();
}

/**
 * Start transcribing an existing lecture
 * This should be called when user clicks "Start Transcribing" on an existing lecture
 */
export async function startTranscribing(lectureId: string, userId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/lectures/${lectureId}/start-transcribing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start transcribing');
  }

  const data = await response.json();
  return data.lectureId;
}

/**
 * Helper function to detect audio file type from URI
 */
function getAudioFileType(uri: string): { mimeType: string; extension: string } {
  const lowerUri = uri.toLowerCase();
  
  if (lowerUri.endsWith('.mp3')) {
    return { mimeType: 'audio/mpeg', extension: 'mp3' };
  } else if (lowerUri.endsWith('.m4a')) {
    return { mimeType: 'audio/m4a', extension: 'm4a' };
  } else if (lowerUri.endsWith('.wav')) {
    return { mimeType: 'audio/wav', extension: 'wav' };
  } else if (lowerUri.endsWith('.webm')) {
    return { mimeType: 'audio/webm', extension: 'webm' };
  }
  
  // Default to m4a for iOS/Android recording
  return { mimeType: 'audio/m4a', extension: 'm4a' };
}

/**
 * Upload audio chunk for live transcription (every 10-30 sec during recording)
 */
export async function uploadAudioChunk(
  lectureId: string,
  audioUri: string,
  userId: string
): Promise<{ transcript: string; liveTranscript: string }> {
  const formData = new FormData();
  const { mimeType, extension } = getAudioFileType(audioUri);
  
  // In React Native, FormData accepts file objects with uri, type, and name
  formData.append('audio', {
    uri: audioUri,
    type: mimeType,
    name: `chunk_${Date.now()}.${extension}`,
  } as any);
  
  formData.append('userId', userId);

  const response = await fetch(`${API_BASE}/api/lectures/${lectureId}/transcribe-chunk`, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header - let fetch set it with boundary
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload audio chunk');
  }

  return await response.json();
}

/**
 * Transcribe audio file - main endpoint for recording flow
 * This will transcribe the audio using Whisper and delete it, only saving the transcript
 * Returns transcriptionId which is used for subsequent operations (summary, checklist, etc.)
 * Supports MP3, M4A, WAV, and WebM formats
 */
export async function transcribeLecture(
  lectureId: string,
  audioUri: string,
  userId: string,
  duration: number
): Promise<{ transcript: string; transcriptionId: string; message: string }> {
  const formData = new FormData();
  const { mimeType, extension } = getAudioFileType(audioUri);

  formData.append('audio', {
    uri: audioUri,
    type: mimeType,
    name: `lecture_${lectureId}.${extension}`,
  } as any);
  
  formData.append('userId', userId);
  formData.append('duration', duration.toString());

  const response = await fetch(`${API_BASE}/api/lectures/${lectureId}/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to transcribe lecture');
  }

  return await response.json();
}

/**
 * @deprecated Use transcribeLecture instead. This function is kept for backward compatibility.
 */
export async function uploadAudio(
  lectureId: string,
  audioUri: string,
  userId: string,
  duration: number
): Promise<{ transcript: string; transcriptionId: string; message: string }> {
  return transcribeLecture(lectureId, audioUri, userId, duration);
}

/**
 * Fetch lecture data
 */
export async function getLecture(lectureId: string, userId: string): Promise<Lecture> {
  const response = await fetch(`${API_BASE}/api/lectures/${lectureId}?userId=${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch lecture');
  }

  const data = await response.json();
  return data.lecture;
}

/**
 * Generate summary from transcript using transcriptionId
 */
export async function generateSummary(transcriptionId: string): Promise<{
  keyPoints: string[];
  actionItems: ActionItem[];
  title: string;
  transcriptionId: string;
  lectureId: string;
}> {
  const response = await fetch(`${API_BASE}/api/lectures/transcription/${transcriptionId}/summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate summary');
  }

  const data = await response.json();
  return data.summary;
}

/**
 * Generate checklist from transcript using transcriptionId
 */
export async function generateChecklist(transcriptionId: string): Promise<{
  actionItems: ActionItem[];
  transcriptionId: string;
  lectureId: string;
}> {
  const response = await fetch(`${API_BASE}/api/lectures/transcription/${transcriptionId}/checklist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate checklist');
  }

  const data = await response.json();
  return data;
}

/**
 * Update checklist items using transcriptionId
 */
export async function updateChecklist(
  transcriptionId: string,
  checklistUpdates: {
    add?: { text: string };
    edit?: { id: string; text: string };
    delete?: { id: string };
  }
): Promise<ActionItem[]> {
  const response = await fetch(`${API_BASE}/api/lectures/transcription/${transcriptionId}/checklist`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(checklistUpdates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update checklist');
  }

  const data = await response.json();
  return data.actionItems;
}

/**
 * Toggle checklist item (check/uncheck) using transcriptionId
 */
export async function toggleChecklistItem(
  transcriptionId: string,
  itemId: string
): Promise<ActionItem> {
  const response = await fetch(`${API_BASE}/api/lectures/transcription/${transcriptionId}/checklist/${itemId}/toggle`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to toggle checklist item');
  }

  const data = await response.json();
  return data.item;
}

/**
 * Chat with global chatbot about lectures
 */
export async function chatWithLectures(
  userId: string,
  question: string
): Promise<{ success: boolean; chatId: string; answer: string; lecturesReferenced: string[] }> {
  const response = await fetch(`${API_BASE}/api/lectures/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      question,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send chat message');
  }

  return await response.json();
}

/**
 * Get chat history for a user
 */
export async function getChatHistory(
  userId: string,
  limit: number = 50
): Promise<{
  success: boolean;
  history: Array<{
    chatId: string;
    question: string;
    answer: string;
    lecturesReferenced: string[];
    timestamp: string;
  }>;
}> {
  const response = await fetch(`${API_BASE}/api/lectures/chat/history?userId=${userId}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch chat history');
  }

  return await response.json();
}

/**
 * Delete a single chat message
 */
export async function deleteChat(chatId: string, userId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/api/lectures/chat/${chatId}?userId=${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete chat message');
  }

  return await response.json();
}

/**
 * Delete all chat history for a user
 */
export async function deleteAllChatHistory(userId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/api/lectures/chat/history/all?userId=${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete chat history');
  }

  return await response.json();
}

/**
 * Get all lectures with optional filters
 */
export async function getLectures(params?: {
  userId?: string;
  status?: 'draft' | 'recording' | 'processing' | 'completed' | 'failed';
  limit?: number;
  offset?: number;
}): Promise<{
  lectures: Lecture[];
  count: number;
  total: number;
  limit?: number;
  offset?: number;
}> {
  const queryParams = new URLSearchParams();
  if (params?.userId) queryParams.append('userId', params.userId);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const url = `${API_BASE}/api/lectures${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch lectures');
  }

  return await response.json();
}

/**
 * List all lectures for a user (with optional filters)
 */
export async function listLectures(
  userId: string,
  filters?: {
    status?: 'draft' | 'recording' | 'processing' | 'completed' | 'failed';
    limit?: number;
    offset?: number;
  }
): Promise<{
  lectures: Lecture[];
  count: number;
  total: number;
  limit?: number;
  offset?: number;
}> {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.limit) queryParams.append('limit', filters.limit.toString());
  if (filters?.offset) queryParams.append('offset', filters.offset.toString());

  const url = `${API_BASE}/api/lectures/user/${userId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch lectures');
  }

  return await response.json();
}

/**
 * Delete a lecture
 */
export async function deleteLecture(lectureId: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/lectures/${lectureId}?userId=${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete lecture');
  }
}

