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
  userId: string,
  language: string = 'auto'
): Promise<{ transcript: string; liveTranscript: string }> {
  const formData = new FormData();
  
  // Handle web platform - audioUri might be a blob URL
  if (typeof window !== 'undefined' && (audioUri.startsWith('blob:') || audioUri.startsWith('http://') || audioUri.startsWith('https://'))) {
    try {
      // Fetch the audio blob from the URI
      const response = await fetch(audioUri);
      const blob = await response.blob();
      
      // Determine mime type from blob
      const mimeType = blob.type || 'audio/webm';
      const extension = mimeType.includes('webm') ? 'webm' : mimeType.includes('m4a') ? 'm4a' : 'webm';
      
      // Create a File object from the blob
      const file = new File([blob], `chunk_${Date.now()}.${extension}`, { type: mimeType });
      formData.append('audio', file);
    } catch (error) {
      console.error('Error fetching audio blob for chunk:', error);
      throw new Error('Failed to process audio chunk for upload');
    }
  } else {
    // Native platforms - use React Native FormData format
    const { mimeType, extension } = getAudioFileType(audioUri);
    formData.append('audio', {
      uri: audioUri,
      type: mimeType,
      name: `chunk_${Date.now()}.${extension}`,
    } as any);
  }
  
  formData.append('userId', userId);
  formData.append('language', language);
  
  // DEBUG: Log everything about what we're sending
  console.log('\n========== FRONTEND CHUNK DEBUG ==========');
  console.log(`[uploadAudioChunk] LectureId: ${lectureId}`);
  console.log(`[uploadAudioChunk] UserId: ${userId}`);
  console.log(`[uploadAudioChunk] Language parameter received: "${language}"`);
  console.log(`[uploadAudioChunk] Language type: ${typeof language}`);
  console.log(`[uploadAudioChunk] Language === 'ko': ${language === 'ko'}`);
  console.log(`[uploadAudioChunk] Language === 'en': ${language === 'en'}`);
  console.log(`[uploadAudioChunk] Language === 'auto': ${language === 'auto'}`);
  console.log('==========================================\n');

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
  duration: number,
  language: string = 'auto'
): Promise<{ transcript: string; transcriptionId: string; message: string }> {
  const formData = new FormData();
  const { mimeType, extension } = getAudioFileType(audioUri);

  // Handle web platform differently - need to fetch the blob and create a File
  if (typeof window !== 'undefined' && audioUri.startsWith('blob:') || audioUri.startsWith('http://') || audioUri.startsWith('https://')) {
    try {
      // Fetch the audio blob from the URI
      const response = await fetch(audioUri);
      const blob = await response.blob();
      
      // Create a File object from the blob
      const file = new File([blob], `lecture_${lectureId}.${extension}`, { type: mimeType });
      formData.append('audio', file);
    } catch (error) {
      console.error('Error fetching audio blob:', error);
      throw new Error('Failed to process audio file for upload');
    }
  } else {
    // For native platforms, use the React Native FormData format
    formData.append('audio', {
      uri: audioUri,
      type: mimeType,
      name: `lecture_${lectureId}.${extension}`,
    } as any);
  }
  
  // CRITICAL: Ensure language is explicitly set - don't allow undefined/null
  // If language is not provided, use 'auto' for auto-detection (NOT 'en')
  const languageToSend = language && language !== '' && language !== null && language !== undefined 
    ? language 
    : 'auto';
  
  formData.append('userId', userId);
  formData.append('duration', duration.toString());
  formData.append('language', languageToSend); // Explicitly append the language
  
  // CRITICAL CHECK: Warn if we're sending 'en' when user might want Korean
  if (languageToSend === 'en') {
    console.warn(`[transcribeLecture] ⚠️  WARNING: Sending language='en'. If you're speaking Korean, select Korean (한국어) in the UI!`);
  }
  
  // DEBUG: Log everything about what we're sending
  console.log('\n========== FRONTEND TRANSCRIBE DEBUG ==========');
  console.log(`[transcribeLecture] LectureId: ${lectureId}`);
  console.log(`[transcribeLecture] UserId: ${userId}`);
  console.log(`[transcribeLecture] Duration: ${duration}`);
  console.log(`[transcribeLecture] Language parameter received: "${language}"`);
  console.log(`[transcribeLecture] Language type: ${typeof language}`);
  console.log(`[transcribeLecture] Language === 'ko': ${language === 'ko'}`);
  console.log(`[transcribeLecture] Language === 'en': ${language === 'en'}`);
  console.log(`[transcribeLecture] Language === 'auto': ${language === 'auto'}`);
  console.log(`[transcribeLecture] Language to send: "${languageToSend}"`);
  
  // Log FormData contents (for debugging) - Note: FormData.entries() might not work in all browsers
  console.log(`[transcribeLecture] FormData entries (attempting to log):`);
  try {
    // Type assertion for FormData entries - may not be available in all environments
    const entries = (formData as any).entries?.();
    if (entries) {
      for (const [key, value] of entries) {
        console.log(`  ${key}: ${value} (type: ${typeof value})`);
      }
    }
  } catch (e: any) {
    console.log(`  (Cannot iterate FormData: ${e?.message || String(e)})`);
  }
  console.log('==========================================\n');

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
  duration: number,
  language: string = 'en'
): Promise<{ transcript: string; transcriptionId: string; message: string }> {
  return transcribeLecture(lectureId, audioUri, userId, duration, language);
}

/**
 * Fetch lecture data
 */
export async function getLectureTranscripts(
  lectureId: string,
  userId: string
): Promise<{
  success: boolean;
  lectureId: string;
  transcripts: Array<{
    transcriptionId: string | null;
    transcript: string;
    createdAt: string | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number };
    isCurrent: boolean;
    isLive?: boolean;
  }>;
  count: number;
}> {
  const response = await fetch(`${API_BASE}/api/lectures/${lectureId}/transcripts?userId=${userId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch transcripts');
  }
  
  return await response.json();
}

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
export async function chatWithTranscript(
  transcriptionId: string,
  userId: string,
  question: string
): Promise<{ success: boolean; chatId: string; answer: string; transcriptionId: string; lectureId: string; lecturesReferenced: string[] }> {
  const response = await fetch(`${API_BASE}/api/lectures/transcription/${transcriptionId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, question }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to chat with transcript');
  }

  return await response.json();
}

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
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = 'Failed to fetch lectures';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        // If response is not JSON, use status text
        errorMessage = `Failed to fetch lectures: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error: any) {
    // Re-throw if it's already an Error with a message
    if (error instanceof Error) {
      throw error;
    }
    // Handle network errors
    if (error?.message?.includes('Network request failed') || 
        error?.message?.includes('Failed to fetch') ||
        error?.name === 'TypeError') {
      throw new Error(`Network request failed. Please ensure the backend server is running at ${API_BASE}`);
    }
    throw error;
  }
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
 * Update/edit a lecture
 */
export async function updateLecture(
  lectureId: string,
  userId: string,
  updates: {
    title?: string;
    description?: string;
    tags?: string[];
    day?: string;
    time?: string;
    place?: string;
    status?: 'draft' | 'recording' | 'processing' | 'completed' | 'failed';
  }
): Promise<{ success: boolean; lectureId: string; lecture: Lecture }> {
  const response = await fetch(`${API_BASE}/api/lectures/${lectureId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      ...updates,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update lecture');
  }

  return await response.json();
}

/**
 * Delete a lecture
 */
export async function deleteLecture(lectureId: string, userId: string): Promise<void> {
  console.log('[deleteLecture] Starting delete function');
  console.log('[deleteLecture] lectureId:', lectureId);
  console.log('[deleteLecture] userId:', userId);
  console.log('[deleteLecture] API_BASE:', API_BASE);

  if (!lectureId || !userId) {
    const errorMsg = `Missing required parameters: lectureId=${lectureId}, userId=${userId}`;
    console.error('[deleteLecture] ❌', errorMsg);
    throw new Error('Lecture ID and User ID are required');
  }

  const url = `${API_BASE}/api/lectures/${lectureId}?userId=${userId}`;
  console.log('[deleteLecture] Request URL:', url);
  console.log('[deleteLecture] Making DELETE request...');

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[deleteLecture] Response status:', response.status);
    console.log('[deleteLecture] Response ok:', response.ok);
    console.log('[deleteLecture] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = 'Failed to delete lecture';
      let errorData = null;
      
      try {
        errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
        console.error('[deleteLecture] Error response data:', errorData);
      } catch (e) {
        const text = await response.text();
        console.error('[deleteLecture] Failed to parse error response. Raw text:', text);
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      
      console.error('[deleteLecture] ❌ Delete failed:', errorMessage);
      console.error('[deleteLecture] Status code:', response.status);
      throw new Error(errorMessage);
    }

    // Check if response has content before trying to parse
    const contentType = response.headers.get('content-type');
    console.log('[deleteLecture] Response content-type:', contentType);
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await response.json();
        console.log('[deleteLecture] ✅ Delete successful. Response:', data);
      } catch (e) {
        // Response might be empty, which is fine for DELETE
        console.log('[deleteLecture] ✅ Delete successful (empty response)');
      }
    } else {
      console.log('[deleteLecture] ✅ Delete successful (no JSON response)');
    }
  } catch (error: any) {
    console.error('[deleteLecture] ❌ Fetch error:', error);
    console.error('[deleteLecture] Error name:', error.name);
    console.error('[deleteLecture] Error message:', error.message);
    console.error('[deleteLecture] Error stack:', error.stack);
    
    // Re-throw with more context if it's not already an Error with message
    if (error.message) {
      throw error;
    } else {
      throw new Error(`Network error: ${error.message || 'Failed to connect to server'}`);
    }
  }
}

