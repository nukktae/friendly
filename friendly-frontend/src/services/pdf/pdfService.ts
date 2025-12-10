import { ENV } from '@/src/config/env';
import { isWeb } from '@/src/lib/platform';

const API_BASE = ENV.API_BASE;

export interface PDFFile {
  id: string;
  userId: string;
  classId?: string | null;
  title: string;
  originalFilename: string;
  storagePath: string;
  downloadUrl: string;
  size: number;
  pages: number;
  fileType: 'pdf';
  extractedText?: string;
  analysis?: {
    summary: string;
    keyPoints: string[];
    topics: string[];
    analyzedAt: string | { _seconds: number; _nanoseconds: number };
  };
  pageAnalyses?: {
    [pageNumber: number]: {
      summary: string;
      keyPoints: string[];
      topics: string[];
      analyzedAt: string | { _seconds: number; _nanoseconds: number };
      pageNumber: number;
    };
  };
  annotations?: Array<{
    page: number;
    type: 'highlight' | 'note' | 'drawing';
    content: string;
    position: { x: number; y: number; width: number; height: number };
  }>;
  createdAt: string | { _seconds: number; _nanoseconds: number };
  updatedAt: string | { _seconds: number; _nanoseconds: number };
}

export interface PDFAnalysis {
  summary: string;
  keyPoints: string[];
  topics: string[];
  analyzedAt: Date;
}

export interface PDFChatMessage {
  chatId: string;
  fileId: string;
  userId: string;
  question: string;
  answer: string;
  pageReferences: string[];
  timestamp: string | { _seconds: number; _nanoseconds: number };
}

/**
 * Upload PDF file
 */
export async function uploadPDF(
  fileUri: string,
  userId: string,
  options?: {
    title?: string;
    classId?: string;
  }
): Promise<PDFFile> {
  const formData = new FormData();

  // Handle file differently for web vs native
  if (isWeb()) {
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const filename = fileUri.split('/').pop() || `pdf_${Date.now()}.pdf`;
      const file = new File([blob], filename, { type: 'application/pdf' });
      formData.append('pdf', file);
    } catch (error) {
      console.error('Error converting file to blob:', error);
      throw new Error('Failed to process PDF file');
    }
  } else {
    // React Native
    const filename = fileUri.split('/').pop() || `pdf_${Date.now()}.pdf`;
    const fileData: any = {
      uri: fileUri,
      type: 'application/pdf',
      name: filename,
    };
    formData.append('pdf', fileData);
  }

  formData.append('userId', userId);
  if (options?.title) {
    formData.append('title', options.title);
  }
  if (options?.classId) {
    formData.append('classId', options.classId);
  }

  const endpoint = options?.classId
    ? `${API_BASE}/api/classes/${options.classId}/files`
    : `${API_BASE}/api/pdfs`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = 'Failed to upload PDF';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
      
      // Extract more detailed error information if available
      if (error.details) {
        errorMessage = `${errorMessage}\n\nDetails: ${error.details}`;
      }
      
      // Provide helpful message for bucket-related errors
      if (errorMessage.includes('bucket') || errorMessage.includes('Storage')) {
        errorMessage = `${errorMessage}\n\nPlease check Firebase Storage configuration in the backend.`;
      }
    } catch (parseError) {
      // If JSON parsing fails, try to get text response
      try {
        const text = await response.text();
        if (text) {
          errorMessage = `Upload failed: ${text.substring(0, 200)}`;
        }
      } catch (textError) {
        errorMessage = `Upload failed with status ${response.status}`;
      }
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.file;
}

/**
 * Get PDF metadata
 */
export async function getPDF(fileId: string, userId: string): Promise<PDFFile> {
  const response = await fetch(`${API_BASE}/api/pdfs/${fileId}?userId=${userId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch PDF');
  }

  const data = await response.json();
  const file = data.file;
  
  // Replace localhost with API_BASE for mobile devices in downloadUrl if present
  if (file && file.downloadUrl && file.downloadUrl.includes('localhost')) {
    const url = new URL(file.downloadUrl);
    file.downloadUrl = file.downloadUrl.replace(`http://localhost:${url.port}`, API_BASE);
  }
  
  return file;
}

/**
 * Get PDF download URL
 */
export async function getPDFDownloadUrl(fileId: string, userId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/pdfs/${fileId}/download?userId=${userId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get download URL');
  }

  const data = await response.json();
  let downloadUrl = data.downloadUrl;
  
  // Replace localhost with API_BASE for mobile devices
  // This ensures PDFs work when accessing from mobile via QR code
  if (downloadUrl && downloadUrl.includes('localhost')) {
    const url = new URL(downloadUrl);
    downloadUrl = downloadUrl.replace(`http://localhost:${url.port}`, API_BASE);
  }
  
  return downloadUrl;
}

/**
 * Update PDF metadata
 */
export async function updatePDFMetadata(
  fileId: string,
  userId: string,
  updates: { title?: string; description?: string }
): Promise<PDFFile> {
  const response = await fetch(`${API_BASE}/api/pdfs/${fileId}`, {
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
    throw new Error(error.error || 'Failed to update PDF');
  }

  const data = await response.json();
  return data.file;
}

/**
 * Update PDF annotations
 */
export async function updatePDFAnnotations(
  fileId: string,
  userId: string,
  annotations: Array<{
    page: number;
    type: 'highlight' | 'note' | 'drawing';
    content: string;
    position: { x: number; y: number; width: number; height: number };
  }>
): Promise<PDFFile> {
  const response = await fetch(`${API_BASE}/api/pdfs/${fileId}/annotations`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      annotations,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update annotations');
  }

  const data = await response.json();
  return data.file;
}

/**
 * Analyze PDF content
 */
export async function analyzePDF(fileId: string, userId: string): Promise<PDFAnalysis> {
  const response = await fetch(`${API_BASE}/api/pdfs/${fileId}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze PDF');
  }

  const data = await response.json();
  return data.analysis;
}

/**
 * Analyze a specific page of PDF
 */
export async function analyzePDFPage(
  fileId: string,
  userId: string,
  pageNumber: number
): Promise<PDFAnalysis & { pageNumber: number }> {
  const response = await fetch(`${API_BASE}/api/pdfs/${fileId}/analyze-page`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, pageNumber }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze PDF page');
  }

  const data = await response.json();
  return data.analysis;
}

/**
 * Chat with PDF
 */
export async function chatWithPDF(
  fileId: string,
  userId: string,
  question: string,
  selectedText?: string
): Promise<{ answer: string; chatId: string; pageReferences: string[] }> {
  const response = await fetch(`${API_BASE}/api/pdfs/${fileId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      question,
      selectedText: selectedText?.trim() || undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to chat with PDF');
  }

  return await response.json();
}

/**
 * Get PDF chat history
 */
export async function getPDFChatHistory(
  fileId: string,
  userId: string,
  limit: number = 50
): Promise<PDFChatMessage[]> {
  const response = await fetch(
    `${API_BASE}/api/pdfs/${fileId}/chat/history?userId=${userId}&limit=${limit}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch chat history');
  }

  const data = await response.json();
  return data.history || [];
}

/**
 * Delete PDF
 */
export async function deletePDF(fileId: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/pdfs/${fileId}?userId=${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete PDF');
  }
}

/**
 * List user PDFs
 */
export async function listPDFs(userId: string, classId?: string): Promise<PDFFile[]> {
  const params = new URLSearchParams({ userId });
  if (classId) {
    params.append('classId', classId);
  }

  const response = await fetch(`${API_BASE}/api/pdfs?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list PDFs');
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Transcribe audio for PDF chat
 * This is a general transcription endpoint that doesn't require a lecture
 */
export async function transcribeAudioForPDF(
  audioUri: string,
  userId: string,
  language: string = 'en'
): Promise<{ transcript: string }> {
  const formData = new FormData();
  
  // Handle web platform - audioUri might be a blob URL
  if (isWeb() && (audioUri.startsWith('blob:') || audioUri.startsWith('http://') || audioUri.startsWith('https://'))) {
    try {
      // Fetch the audio blob from the URI
      const response = await fetch(audioUri);
      const blob = await response.blob();
      
      // Determine mime type from blob
      const mimeType = blob.type || 'audio/webm';
      const extension = mimeType.includes('webm') ? 'webm' : mimeType.includes('m4a') ? 'm4a' : 'webm';
      
      // Create a File object from the blob
      const file = new File([blob], `audio_${Date.now()}.${extension}`, { type: mimeType });
      formData.append('audio', file);
    } catch (error) {
      console.error('Error fetching audio blob:', error);
      throw new Error('Failed to process audio file for upload');
    }
  } else {
    // Native platforms - use React Native FormData format
    // Determine file type
    let mimeType = 'audio/m4a';
    let extension = 'm4a';
    
    if (audioUri.includes('.webm')) {
      mimeType = 'audio/webm';
      extension = 'webm';
    } else if (audioUri.includes('.wav')) {
      mimeType = 'audio/wav';
      extension = 'wav';
    } else if (audioUri.includes('.mp3')) {
      mimeType = 'audio/mp3';
      extension = 'mp3';
    }
    
    formData.append('audio', {
      uri: audioUri,
      type: mimeType,
      name: `audio_${Date.now()}.${extension}`,
    } as any);
  }
  
  formData.append('userId', userId);
  formData.append('language', language);

  const response = await fetch(`${API_BASE}/api/transcribe`, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header - let fetch set it with boundary
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to transcribe audio');
  }

  return await response.json();
}

