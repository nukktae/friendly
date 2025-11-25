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

const buildUrl = (path: string) => `${API_BASE}${path}`;

async function fetchCollection<T>(path: string, key: ResourceKey): Promise<T[]> {
  if (!path) {
    return [];
  }

  const response = await fetch(buildUrl(path));

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
}

export async function fetchClassFiles(classId: string): Promise<ClassFile[]> {
  if (!classId) {
    return [];
  }
  return fetchCollection<ClassFile>(`/api/classes/${classId}/files`, 'files');
}

export async function fetchClassRecordings(classId: string): Promise<ClassRecording[]> {
  if (!classId) {
    return [];
  }
  return fetchCollection<ClassRecording>(`/api/classes/${classId}/recordings`, 'recordings');
}

export async function fetchClassAssignments(classId: string): Promise<ClassAssignment[]> {
  if (!classId) {
    return [];
  }
  return fetchCollection<ClassAssignment>(`/api/classes/${classId}/assignments`, 'assignments');
}

export async function fetchClassNotes(classId: string): Promise<ClassNote[]> {
  if (!classId) {
    return [];
  }
  return fetchCollection<ClassNote>(`/api/classes/${classId}/notes`, 'notes');
}

