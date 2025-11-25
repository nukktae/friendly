export interface ClassFile {
  id: string;
  title: string;
  size?: string;
  pages?: number;
  uploadedAt?: string;
  fileType?: 'pdf' | 'slides' | 'doc' | 'other';
  downloadUrl?: string;
}

export interface ClassRecording {
  id: string;
  title: string;
  recordedAt?: string;
  duration?: number;
  status: 'processing' | 'ready' | 'failed';
  transcriptId?: string;
  playbackUrl?: string;
}

export interface ClassAssignment {
  id: string;
  classId?: string;
  title: string;
  dueDate?: string;
  description?: string;
  type?: 'ppt' | 'report' | 'team-meeting' | 'exam' | 'homework' | 'project' | 'other';
  status: 'not_started' | 'in_progress' | 'completed' | 'pending' | 'submitted' | 'graded' | 'past_due';
  submissionUrl?: string;
}

export interface ClassNote {
  id: string;
  title: string;
  content: string;
  updatedAt?: string;
}

