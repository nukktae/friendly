export interface Lecture {
  id: string;
  userId: string;
  title: string;
  createdAt: string | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number };
  duration: number;
  audioUrl?: string;
  transcript?: string;
  transcriptionId?: string;
  liveTranscript?: string;
  summary?: {
    keyPoints: string[];
    actionItems: ActionItem[];
    title: string;
  };
  status: 'draft' | 'recording' | 'processing' | 'completed' | 'failed';
  description?: string;
  tags?: string[];
  chatHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number };
  }>;
}

export interface ActionItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chatId?: string;
  lecturesReferenced?: string[];
}

