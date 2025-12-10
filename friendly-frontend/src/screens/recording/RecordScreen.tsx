import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert,
    TextInput,
} from 'react-native';
import { useAudioRecorder, RecordingPresets } from 'expo-audio';
import { useApp } from '../../context/AppContext';
import { Platform } from 'react-native';
import {
  startTranscribing,
  uploadAudioChunk,
  transcribeLecture,
  generateSummary,
  generateChecklist,
  updateChecklist,
  toggleChecklistItem,
  getLecture,
  createLecture,
  getLectureTranscripts,
} from '../../services/lecture/lectureService';
import { Lecture, ActionItem } from '../../types/lecture.types';
import LectureChatbot from '@/src/components/modules/lecture/LectureChatbot';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface RecordScreenProps {
  lectureId?: string; // Existing lecture ID (if transcribing an existing lecture)
  onBack: () => void;
  onSave?: () => void;
}

export default function RecordScreen({ lectureId: propLectureId, onBack, onSave }: RecordScreenProps) {
  const { user } = useApp();
  console.log('[RecordScreen] Component rendered - propLectureId:', propLectureId);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'tasks' | 'transcript' | 'chat'>('summary');
  
  // Recording state
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [lectureId, setLectureId] = useState<string | null>(propLectureId || null);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  
  // Web-specific MediaRecorder for better control
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webAudioChunksRef = useRef<Blob[]>([]);
  const webStreamRef = useRef<MediaStream | null>(null);
  const webChunkBlobsRef = useRef<Blob[]>([]); // Store chunks for live transcription
  const lastChunkUploadTimeRef = useRef<number>(0);
  
  // Lecture data
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newItemText, setNewItemText] = useState('');
  
  // Transcripts list
  const [transcripts, setTranscripts] = useState<Array<{
    transcriptionId: string | null;
    transcript: string;
    createdAt: string | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number } | Date;
    isCurrent: boolean;
    isLive?: boolean;
  }>>([]);
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(false);
  const transcriptsLoadedRef = useRef(false);
  
  // Debug log for state changes
  useEffect(() => {
    console.log('[RecordScreen] State update - isRecording:', isRecording, 'lectureId:', lectureId, 'transcripts.length:', transcripts.length, 'isLoadingTranscripts:', isLoadingTranscripts);
  }, [isRecording, lectureId, transcripts.length, isLoadingTranscripts]);
  
  // Create transcripts from lecture data if API doesn't return any
  useEffect(() => {
    if (lecture && transcriptsLoadedRef.current && transcripts.length === 0) {
      console.log('[RecordScreen] No transcripts from API, creating from lecture data');
      const newTranscripts = [];
      
      if (lecture.transcript) {
        newTranscripts.push({
          transcriptionId: lecture.transcriptionId || null,
          transcript: lecture.transcript,
          createdAt: lecture.createdAt,
          isCurrent: true,
        });
      }
      
      // Add liveTranscript if it's different from main transcript
      if (lecture.liveTranscript && lecture.liveTranscript !== lecture.transcript) {
        newTranscripts.push({
          transcriptionId: null,
          transcript: lecture.liveTranscript,
          createdAt: lecture.createdAt,
          isCurrent: false,
          isLive: true,
        });
      }
      
      if (newTranscripts.length > 0) {
        console.log('[RecordScreen] Setting transcripts from lecture data:', newTranscripts);
        setTranscripts(newTranscripts);
      }
    }
  }, [lecture, transcripts.length]);
  
  // Language selection
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ko' | 'auto'>('auto');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  
  const languages = [
    { code: 'auto' as const, name: 'Auto-detect', flag: '🌐' },
    { code: 'en' as const, name: 'English', flag: '🇺🇸' },
    { code: 'ko' as const, name: '한국어', flag: '🇰🇷' },
  ];
  
  // Chunk upload interval
  const chunkUploadInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastChunkTime = useRef<number>(0);
  const isRecordingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const recordingUriRef = useRef<string | null>(null); // Store URI during recording
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const waveforms = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Update lectureId when prop changes
  useEffect(() => {
    console.log('[RecordScreen] propLectureId changed:', propLectureId);
    if (propLectureId && propLectureId !== lectureId) {
      console.log('[RecordScreen] Updating lectureId from prop:', propLectureId);
      setLectureId(propLectureId);
    }
  }, [propLectureId]);
  
  // Load lecture data when lectureId is available
  useEffect(() => {
    console.log('[RecordScreen] useEffect - lectureId:', lectureId, 'user?.uid:', user?.uid);
    if (lectureId && user?.uid) {
      console.log('[RecordScreen] Loading lecture and transcripts...');
      loadLecture();
      loadTranscripts();
    } else {
      console.log('[RecordScreen] Skipping load - missing lectureId or user.uid');
      console.log('[RecordScreen] Current state - lectureId:', lectureId, 'propLectureId:', propLectureId, 'user?.uid:', user?.uid);
    }
  }, [lectureId, user?.uid]);
  
  // Reload transcripts after recording stops
  useEffect(() => {
    console.log('[RecordScreen] Recording state changed - isRecording:', isRecording, 'lectureId:', lectureId);
    if (!isRecording && lectureId && user?.uid) {
      console.log('[RecordScreen] Reloading transcripts after recording stopped...');
      loadTranscripts();
    }
  }, [isRecording, lectureId, user?.uid]);

  const loadLecture = async () => {
    if (!lectureId || !user?.uid) return;
    try {
      console.log('[RecordScreen] Loading lecture data...');
      const data = await getLecture(lectureId, user.uid);
      console.log('[RecordScreen] Lecture data loaded:', JSON.stringify(data, null, 2));
      setLecture(data);
      if (data.summary) {
        setActionItems(data.summary.actionItems || []);
      }
      if (data.liveTranscript) {
        setLiveTranscript(data.liveTranscript);
      }
      // Store transcriptionId if available
      if (data.transcriptionId) {
        setTranscriptionId(data.transcriptionId);
      }
    } catch (error) {
      console.error('[RecordScreen] Error loading lecture:', error);
    }
  };
  
  const loadTranscripts = async () => {
    console.log('[RecordScreen] loadTranscripts called - lectureId:', lectureId, 'user?.uid:', user?.uid);
    if (!lectureId || !user?.uid) {
      console.log('[RecordScreen] loadTranscripts skipped - missing lectureId or user.uid');
      transcriptsLoadedRef.current = true;
      return;
    }
    setIsLoadingTranscripts(true);
    transcriptsLoadedRef.current = false;
    console.log('[RecordScreen] Fetching transcripts from API...');
    try {
      const data = await getLectureTranscripts(lectureId, user.uid);
      console.log('[RecordScreen] API response:', JSON.stringify(data, null, 2));
      const loadedTranscripts = data.transcripts || [];
      
      console.log('[RecordScreen] Loaded transcripts count:', loadedTranscripts.length);
      console.log('[RecordScreen] Transcripts data:', loadedTranscripts);
      setTranscripts(loadedTranscripts);
      transcriptsLoadedRef.current = true;
      console.log('[RecordScreen] Transcripts state updated');
    } catch (error) {
      console.error('[RecordScreen] Error loading transcripts:', error);
      setTranscripts([]);
      transcriptsLoadedRef.current = true;
    } finally {
      setIsLoadingTranscripts(false);
      console.log('[RecordScreen] Loading complete');
    }
  };
  
  const formatDate = (timestamp: string | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number } | Date): string => {
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      const seconds = (timestamp as any)._seconds || (timestamp as any).seconds || 0;
      date = new Date(seconds * 1000);
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };
  
  const formatTimestampTime = (timestamp: string | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number } | Date): string => {
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      const seconds = (timestamp as any)._seconds || (timestamp as any).seconds || 0;
      date = new Date(seconds * 1000);
    }
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  useEffect(() => {
    if (isRecording && !isPaused) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Ripple animation
      Animated.loop(
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();

      // Waveform animations
      waveforms.forEach((anim, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 100),
            Animated.timing(anim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });

      // Timer
      const timer = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isRecording, isPaused]);

  useEffect(() => {
    // Initial entrance animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Cleanup: Clear interval on unmount
    return () => {
      if (chunkUploadInterval.current) {
        clearInterval(chunkUploadInterval.current);
        chunkUploadInterval.current = null;
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const uploadChunk = async (audioBlob?: Blob) => {
    if (!lectureId || !user?.uid || !isRecordingRef.current || isPausedRef.current) {
      return;
    }

    try {
      let blobToUpload: Blob | null = null;

      if (Platform.OS === 'web') {
        // On web, use the provided blob or get from chunks
        if (audioBlob) {
          blobToUpload = audioBlob;
        } else if (webChunkBlobsRef.current.length > 0) {
          // Combine recent chunks (last 10 seconds worth)
          // MediaRecorder collects data every 1 second, so last 10 chunks = ~10 seconds
          const recentChunks = webChunkBlobsRef.current.slice(-10); // Last 10 chunks (~10 seconds)
          if (recentChunks.length === 0) {
            return; // No chunks to upload
          }
          blobToUpload = new Blob(recentChunks, { type: 'audio/webm' });
          
          // Don't clear chunks - we want overlapping windows for better transcription
          // The backend will handle deduplication if needed
        } else {
          return; // No chunks available yet
        }

        if (!blobToUpload || blobToUpload.size === 0) {
          return; // Invalid blob
        }

        // Create blob URL for upload
        const blobUrl = URL.createObjectURL(blobToUpload);
        
        console.log(`Uploading chunk: ${blobToUpload.size} bytes`);
        
        // DEBUG: Log language before uploading chunk
        console.log(`[RecordScreen] Uploading chunk with language: "${selectedLanguage}"`);
        
        // Upload chunk
        const result = await uploadAudioChunk(lectureId, blobUrl, user.uid, selectedLanguage);
        
        // Clean up blob URL
        URL.revokeObjectURL(blobUrl);
        
        // Update live transcript
        if (result.liveTranscript) {
          setLiveTranscript(result.liveTranscript);
          console.log('Live transcript updated:', result.liveTranscript.substring(0, 100) + '...');
        }
      } else {
        // Native platforms - would need to get chunk from expo-audio
        // For now, skip on native (expo-audio limitation)
        console.log('Chunk upload skipped on native platform');
      }
    } catch (error) {
      // Silently fail chunk uploads - don't interrupt recording
      console.warn('Failed to upload chunk:', error);
    }
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    // For web, use browser's MediaDevices API
    if (Platform.OS === 'web') {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          Alert.alert(
            'Microphone Not Supported',
            'Your browser does not support microphone access. Please use a modern browser like Chrome, Firefox, or Safari.',
            [{ text: 'OK' }]
          );
          return false;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop());
        console.log('Microphone permission granted');
        return true;
      } catch (error: any) {
        console.error('Microphone permission denied:', error);
        const errorMessage = error?.message || 'Unknown error';
        
        if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
          Alert.alert(
            'Microphone Permission Required',
            'Please allow microphone access to record lectures. Click the microphone icon in your browser\'s address bar to grant permission.',
            [{ text: 'OK' }]
          );
        } else if (errorMessage.includes('NotFoundError')) {
          Alert.alert(
            'No Microphone Found',
            'No microphone was found on your device. Please connect a microphone and try again.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Microphone Error',
            `Unable to access microphone: ${errorMessage}`,
            [{ text: 'OK' }]
          );
        }
        return false;
      }
    }

    // For native platforms, permissions are handled automatically by expo-audio
    // but we can still try to prepare the recorder which will trigger permission request
    return true;
  };

  const startRecording = async () => {
    console.log('[RecordScreen] startRecording called');
    
    try {
      // Request microphone permission
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Microphone access is required to record lectures.');
        return;
      }

      // Create lecture if we don't have one
      let currentLectureId = lectureId;
      if (!currentLectureId) {
        console.log('[RecordScreen] Creating new lecture...');
        const newLecture = await createLecture(user?.uid || '', {
          title: `Lecture ${new Date().toLocaleDateString()}`,
        });
        currentLectureId = newLecture.lectureId;
        setLectureId(currentLectureId);
        setLecture(newLecture.lecture);
      }

      // Start transcription session
      await startTranscribing(currentLectureId, user?.uid || '');

      // Start recording
      setIsRecording(true);
      isRecordingRef.current = true;
      isPausedRef.current = false;
      setShowSummary(false);
      setRecordingTime(0);
      setLiveTranscript('');

      // Start audio recording
      if (Platform.OS === 'web') {
        // Web platform - use MediaRecorder
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          webStreamRef.current = stream;
          webAudioChunksRef.current = [];
          webChunkBlobsRef.current = [];
          
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          });
          webMediaRecorderRef.current = mediaRecorder;
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              webAudioChunksRef.current.push(event.data);
              webChunkBlobsRef.current.push(event.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(webAudioChunksRef.current, { type: 'audio/webm' });
            const blobUrl = URL.createObjectURL(audioBlob);
            recordingUriRef.current = blobUrl;
          };
          
          mediaRecorder.start(1000); // Collect data every second
        } catch (error: any) {
          console.error('Error starting web MediaRecorder:', error);
          setIsRecording(false);
          Alert.alert('Error', 'Failed to start recording');
          return;
        }
      } else {
        // Native platform - use expo-audio
        try {
          await audioRecorder.prepareToRecordAsync();
          await audioRecorder.record();
        } catch (error: any) {
          console.error('Error starting native recording:', error);
          setIsRecording(false);
          Alert.alert('Error', 'Failed to start recording');
          return;
        }
      }

      // Start recording timer
      const timer = setInterval(() => {
        if (isRecordingRef.current && !isPausedRef.current) {
          setRecordingTime((prev) => prev + 1);
        }
      }, 1000);
      
      chunkUploadInterval.current = timer;

      // Start uploading chunks periodically (every 15 seconds)
      const chunkTimer = setInterval(async () => {
        if (isRecordingRef.current && !isPausedRef.current && currentLectureId) {
          await uploadChunk();
        }
      }, 15000); // Upload chunk every 15 seconds
      
      (chunkUploadInterval as any).chunkTimer = chunkTimer;
      
      console.log('[RecordScreen] Recording started successfully');
    } catch (error: any) {
      console.error('[RecordScreen] Error starting recording:', error);
      Alert.alert('Error', error.message || 'Failed to start recording');
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const pauseRecording = async () => {
    console.log('[RecordScreen] pauseRecording called');
    
    if (Platform.OS === 'web') {
      // Web platform - pause MediaRecorder
      if (webMediaRecorderRef.current && isRecording) {
        if (isPaused) {
          webMediaRecorderRef.current.resume();
        } else {
          webMediaRecorderRef.current.pause();
        }
      }
    } else {
      // Native platform - expo-audio doesn't support pause/resume
      // Just toggle the state for UI purposes
      // Note: Recording will continue, but UI will show as paused
      console.warn('[RecordScreen] Pause/resume not fully supported on native platform');
    }
    
    setIsPaused(!isPaused);
    isPausedRef.current = !isPaused;
  };

  const stopRecording = async () => {
    console.log('[RecordScreen] stopRecording called');
    
    if (!lectureId || !user?.uid) {
      Alert.alert('Error', 'Lecture ID or user ID is missing');
      return;
    }

    setIsProcessing(true);
    
    // Stop timers
    if (chunkUploadInterval.current) {
      clearInterval(chunkUploadInterval.current);
      chunkUploadInterval.current = null;
    }
    if ((chunkUploadInterval as any).chunkTimer) {
      clearInterval((chunkUploadInterval as any).chunkTimer);
      (chunkUploadInterval as any).chunkTimer = null;
    }
    
    // Stop recording state
    isRecordingRef.current = false;
    isPausedRef.current = false;
    
    let audioUri: string | null = null;

    try {
      // Stop audio recording and get URI
      if (Platform.OS === 'web') {
        // Web platform - stop MediaRecorder and create blob
        if (webMediaRecorderRef.current) {
          webMediaRecorderRef.current.stop();
          webMediaRecorderRef.current = null;
        }
        
        // Stop all tracks
        if (webStreamRef.current) {
          webStreamRef.current.getTracks().forEach(track => track.stop());
          webStreamRef.current = null;
        }
        
        // Create final audio blob
        if (webAudioChunksRef.current.length > 0) {
          const audioBlob = new Blob(webAudioChunksRef.current, { type: 'audio/webm' });
          const blobUrl = URL.createObjectURL(audioBlob);
          audioUri = blobUrl;
        }
      } else {
        // Native platform - stop expo-audio recorder
        await audioRecorder.stop();
        // Wait a bit for the URI to be available
        await new Promise(resolve => setTimeout(resolve, 300));
        // Access URI from recorder after stopping
        audioUri = (audioRecorder as any).uri || null;
      }

      if (!audioUri) {
        throw new Error('No audio recording available');
      }

      // Transcribe the audio
      console.log('[RecordScreen] Transcribing audio...');
      const transcriptionResult = await transcribeLecture(
        lectureId,
        audioUri,
        user.uid,
        recordingTime,
        selectedLanguage
      );

      // Clean up blob URL if it was created
      if (audioUri.startsWith('blob:')) {
        URL.revokeObjectURL(audioUri);
      }

      // Update state with transcription results
      setTranscriptionId(transcriptionResult.transcriptionId);
      
      // Reload lecture to get updated data
      await loadLecture();
      
      // Generate summary and checklist
      try {
        console.log('[RecordScreen] Generating summary...');
        const summary = await generateSummary(transcriptionResult.transcriptionId);
        setActionItems(summary.actionItems || []);
        
        // Reload lecture again to get summary
        await loadLecture();
      } catch (summaryError: any) {
        console.error('[RecordScreen] Error generating summary:', summaryError);
        // Don't fail the whole process if summary generation fails
      }

      setIsRecording(false);
      setIsPaused(false);
      setIsProcessing(false);
      setShowSummary(true); // Show summary screen after stopping
      
      console.log('[RecordScreen] Recording stopped and transcribed successfully');
    } catch (error: any) {
      console.error('[RecordScreen] Error stopping recording:', error);
      Alert.alert('Error', error.message || 'Failed to process recording');
      setIsProcessing(false);
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const toggleCheckbox = async (id: string) => {
    if (!transcriptionId) {
      Alert.alert('Error', 'Transcription ID is missing');
      return;
    }

    try {
      const updatedItem = await toggleChecklistItem(transcriptionId, id);
      // Update local state
      setActionItems(prevItems =>
        prevItems.map(item => 
          item.id === id ? updatedItem : item
        )
      );
    } catch (error: any) {
      console.error('[RecordScreen] Error toggling checkbox:', error);
      Alert.alert('Error', error.message || 'Failed to update checklist item');
    }
  };

  const addChecklistItem = async () => {
    if (!newItemText.trim()) return;
    
    if (!transcriptionId) {
      Alert.alert('Error', 'Transcription ID is missing');
      return;
    }

    try {
      const updatedItems = await updateChecklist(transcriptionId, {
        add: { text: newItemText.trim() },
      });
      setActionItems(updatedItems);
      setNewItemText('');
    } catch (error: any) {
      console.error('[RecordScreen] Error adding checklist item:', error);
      Alert.alert('Error', error.message || 'Failed to add checklist item');
    }
  };

  const editChecklistItem = async (id: string) => {
    if (!editText.trim()) return;
    
    if (!transcriptionId) {
      Alert.alert('Error', 'Transcription ID is missing');
      return;
    }

    try {
      const updatedItems = await updateChecklist(transcriptionId, {
        edit: { id, text: editText.trim() },
      });
      setActionItems(updatedItems);
      setEditingItem(null);
      setEditText('');
    } catch (error: any) {
      console.error('[RecordScreen] Error editing checklist item:', error);
      Alert.alert('Error', error.message || 'Failed to update checklist item');
    }
  };

  const deleteChecklistItem = async (id: string) => {
    if (!transcriptionId) {
      Alert.alert('Error', 'Transcription ID is missing');
      return;
    }

    try {
      const updatedItems = await updateChecklist(transcriptionId, {
        delete: { id },
      });
      setActionItems(updatedItems);
    } catch (error: any) {
      console.error('[RecordScreen] Error deleting checklist item:', error);
      Alert.alert('Error', error.message || 'Failed to delete checklist item');
    }
  };

  const saveRecording = async () => {
    console.log('Save button clicked');
    
    // Show mobile-friendly success alert
    Alert.alert(
      'Success',
      'Saved successfully',
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back after showing success
            if (onSave) {
              onSave();
            } else {
              onBack();
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chunkUploadInterval.current) {
        clearInterval(chunkUploadInterval.current);
      }
      if (isRecording && audioRecorder.isRecording) {
        audioRecorder.stop().catch(console.error);
      }
    };
  }, [isRecording, audioRecorder]);

  if (showSummary) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#fafafa', '#ffffff']}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Modern Header */}
        <View style={styles.modernHeader}>
          <TouchableOpacity onPress={onBack} style={styles.modernBackButton}>
            <Ionicons name="arrow-back" size={22} color="#111111" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            {isEditingTitle ? (
              <TextInput
                style={styles.editableTitle}
                value={editedTitle}
                onChangeText={setEditedTitle}
                autoFocus
                onSubmitEditing={() => {
                  if (lecture) {
                    const updatedLecture = {
                      ...lecture,
                      title: editedTitle,
                      summary: lecture.summary ? {
                        ...lecture.summary,
                        title: editedTitle,
                      } : undefined,
                    };
                    setLecture(updatedLecture);
                  }
                  setIsEditingTitle(false);
                }}
                onBlur={() => {
                  if (lecture) {
                    const updatedLecture = {
                      ...lecture,
                      title: editedTitle,
                      summary: lecture.summary ? {
                        ...lecture.summary,
                        title: editedTitle,
                      } : undefined,
                    };
                    setLecture(updatedLecture);
                  }
                  setIsEditingTitle(false);
                }}
              />
            ) : (
              <TouchableOpacity
                onPress={() => {
                  const currentTitle = lecture?.summary?.title || lecture?.title || 'Lecture Recording';
                  setEditedTitle(currentTitle);
                  setIsEditingTitle(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modernHeaderTitle}>
                  {lecture?.summary?.title || lecture?.title || 'Lecture Recording'}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.headerMetaRow}>
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={14} color="#4A4A4A" />
                <Text style={styles.metaChipText}>{formatTime(recordingTime)}</Text>
              </View>
              {lecture?.summary && (
              <View style={styles.metaChip}>
                <Ionicons name="sparkles" size={14} color="#0F3F2E" />
                <Text style={styles.metaChipText}>AI Analyzed</Text>
              </View>
              )}
              {isProcessing && (
                <View style={styles.metaChip}>
                  <ActivityIndicator size="small" color="#6B7C32" />
                  <Text style={styles.metaChipText}>Processing...</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Modern Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'summary' && styles.tabButtonActive]}
            onPress={() => setActiveTab('summary')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="list-outline" 
              size={18} 
              color={activeTab === 'summary' ? '#0F3F2E' : '#8A8A8A'} 
            />
            <Text style={[styles.tabButtonText, activeTab === 'summary' && styles.tabButtonTextActive]}>
              Summary
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'tasks' && styles.tabButtonActive]}
            onPress={() => setActiveTab('tasks')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="checkbox-outline" 
              size={18} 
              color={activeTab === 'tasks' ? '#0F3F2E' : '#8A8A8A'} 
            />
            <Text style={[styles.tabButtonText, activeTab === 'tasks' && styles.tabButtonTextActive]}>
              Tasks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'transcript' && styles.tabButtonActive]}
            onPress={() => setActiveTab('transcript')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="document-text-outline" 
              size={18} 
              color={activeTab === 'transcript' ? '#0F3F2E' : '#8A8A8A'} 
            />
            <Text style={[styles.tabButtonText, activeTab === 'transcript' && styles.tabButtonTextActive]}>
              Transcript
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'chat' && styles.tabButtonActive]}
            onPress={() => setActiveTab('chat')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="chatbubbles-outline" 
              size={18} 
              color={activeTab === 'chat' ? '#0F3F2E' : '#8A8A8A'} 
            />
            <Text style={[styles.tabButtonText, activeTab === 'chat' && styles.tabButtonTextActive]}>
              Chat
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <ScrollView 
          style={styles.summaryScroll} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.summaryContent}
        >
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <View style={styles.tabContent}>
              {isProcessing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#6B7C32" />
                  <Text style={styles.loadingText}>Generating summary...</Text>
                </View>
              ) : lecture?.summary?.keyPoints && lecture.summary.keyPoints.length > 0 ? (
                <>
                  <Text style={styles.sectionHeader}>Summary</Text>
                  {lecture.summary.keyPoints.map((point: string, index: number) => (
                    <View key={index} style={styles.compactKeyPoint}>
                      <View style={styles.pointNumber}>
                        <Text style={styles.pointNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.compactPointText}>{point}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Summary will appear here after processing</Text>
                </View>
              )}
            </View>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <View style={styles.tabContent}>
              {actionItems.map((item) => (
                <View key={item.id} style={styles.taskItem}>
                  <TouchableOpacity
                    onPress={() => toggleCheckbox(item.id)}
                    activeOpacity={0.7}
                    style={styles.checkboxRow}
                  >
                    <View style={[
                      styles.taskCheckbox,
                      item.checked && styles.taskCheckboxChecked
                    ]}>
                      {item.checked && (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      )}
                    </View>
                    {editingItem === item.id ? (
                      <View style={styles.editRow}>
                        <TextInput
                          style={styles.editInput}
                          value={editText}
                          onChangeText={setEditText}
                          autoFocus
                          onSubmitEditing={() => editChecklistItem(item.id)}
                        />
                        <TouchableOpacity onPress={() => editChecklistItem(item.id)}>
                          <Ionicons name="checkmark-circle" size={20} color="#0F3F2E" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                          setEditingItem(null);
                          setEditText('');
                        }}>
                          <Ionicons name="close-circle" size={20} color="#C84545" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <Text style={[
                          styles.taskText,
                          item.checked && styles.taskTextChecked
                        ]}>
                          {item.text}
                        </Text>
                        <View style={styles.taskActions}>
                          <TouchableOpacity
                            onPress={() => {
                              setEditingItem(item.id);
                              setEditText(item.text);
                            }}
                          >
                            <Ionicons name="create-outline" size={18} color="#4A4A4A" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => deleteChecklistItem(item.id)}>
                            <Ionicons name="trash-outline" size={18} color="#C84545" />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
              
              {/* Add new item */}
              <View style={styles.addTaskContainer}>
                <TextInput
                  style={styles.addTaskInput}
                  placeholder="Add new task..."
                  placeholderTextColor="#8A8A8A"
                  value={newItemText}
                  onChangeText={setNewItemText}
                  onSubmitEditing={addChecklistItem}
                />
                <TouchableOpacity
                  style={styles.addTaskButton}
                  onPress={addChecklistItem}
                  disabled={!newItemText.trim()}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={newItemText.trim() ? '#0F3F2E' : '#8A8A8A'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Transcript Tab */}
          {activeTab === 'transcript' && (
            <View style={styles.tabContent}>
              <View style={styles.transcriptCardSummary}>
                <Text style={styles.transcriptTextSummary}>
                  {lecture?.transcript || liveTranscript}
                </Text>
              </View>
            </View>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && user?.uid && (
            <View style={styles.tabContent}>
              <LectureChatbot userId={user.uid} transcriptionId={transcriptionId || undefined} />
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Save Button - Visible across all tabs */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={styles.wideSaveButton}
            onPress={() => {
              console.log('Save button pressed');
              saveRecording();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.wideSaveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Pure White Background */}
      <View style={StyleSheet.absoluteFillObject} />

      {/* Clean Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Recording</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#4A4A4A" />
        </TouchableOpacity>
      </Animated.View>

      {/* Recording Status Chip */}
      {isRecording && (
        <Animated.View style={styles.statusChip}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {isPaused ? 'Paused' : 'Recording'}
          </Text>
        </Animated.View>
      )}

      {/* Content */}
      {isRecording ? (
        <View style={styles.content}>
          {/* Timer Display */}
          <Animated.Text
            style={[
              styles.timer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            {formatTime(recordingTime)}
          </Animated.Text>

          {/* Waveform Visualizer */}
          {!isPaused && (
            <View style={styles.waveformContainer}>
              <View style={styles.waveformGlow} />
              {waveforms.map((anim, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      transform: [
                        {
                          scaleY: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.2, 1],
                          }),
                        },
                      ],
                      opacity: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 0.6],
                      }),
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Live Transcript Card */}
          <Animated.View
            style={[
              styles.liveTranscriptCard,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.liveTranscriptHeader}>Live Transcript</Text>
            <ScrollView 
              style={styles.liveTranscriptScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {liveTranscript ? (
                <Text style={styles.liveTranscriptText}>{liveTranscript}</Text>
              ) : (
                <Text style={styles.liveTranscriptPlaceholder}>
                  Listening… transcript will appear here.
                </Text>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      ) : (
        <ScrollView 
          style={styles.transcriptsContainer}
          contentContainerStyle={styles.transcriptsContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Transcripts List */}
          <View style={styles.transcriptsList}>
            {(() => {
              console.log('[RecordScreen] Rendering transcripts - isLoadingTranscripts:', isLoadingTranscripts, 'transcripts.length:', transcripts.length);
              console.log('[RecordScreen] Transcripts array:', transcripts);
              return isLoadingTranscripts ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="small" color="#6B7C32" />
                  <Text style={styles.emptyText}>Loading transcripts...</Text>
                </View>
              ) : transcripts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
                  <Text style={styles.emptyTitle}>No transcripts yet</Text>
                  <Text style={styles.emptyText}>Start recording to create your first transcript</Text>
                  <Text style={styles.emptyText}>lectureId: {lectureId || 'none'}</Text>
                </View>
              ) : (
                transcripts.map((transcript: {
                  transcriptionId: string | null;
                  transcript: string;
                  createdAt: string | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number } | Date;
                  isCurrent: boolean;
                  isLive?: boolean;
                }, index: number) => {
                  console.log(`[RecordScreen] Rendering transcript ${index}:`, transcript);
                  return (
                    <View key={index} style={[
                      styles.transcriptCard,
                      transcript.isCurrent && styles.transcriptCardActive
                    ]}>
                      {/* Timestamp Row */}
                      <View style={styles.transcriptTimestampRow}>
                        <Text style={styles.transcriptDate}>{formatDate(transcript.createdAt)}</Text>
                        <Text style={styles.transcriptTimeSeparator}> </Text>
                        <Text style={styles.transcriptTime}>{formatTimestampTime(transcript.createdAt)}</Text>
                      </View>
                      
                      {/* Status Tags */}
                      {(transcript.isCurrent || transcript.isLive) && (
                        <View style={styles.transcriptStatusRow}>
                          {transcript.isCurrent && (
                            <View style={styles.currentTag}>
                              <Text style={styles.currentTagText}>CURRENT</Text>
                            </View>
                          )}
                          {transcript.isLive && (
                            <View style={styles.liveTag}>
                              <View style={styles.liveTagDot} />
                              <Text style={styles.liveTagText}>LIVE</Text>
                            </View>
                          )}
                        </View>
                      )}
                      
                      {/* Message Text */}
                      <Text style={styles.transcriptPreview}>
                        {transcript.transcript}
                      </Text>
                    </View>
                  );
                })
              );
            })()}
          </View>
        </ScrollView>
      )}

      {/* Language Indicator During Recording */}
      {isRecording && (
        <View style={styles.languageIndicator}>
          <Text style={styles.languageIndicatorText}>
            {languages.find(l => l.code === selectedLanguage)?.name}
          </Text>
        </View>
      )}

      {/* Bottom Controls Section */}
      <View style={styles.controls}>
        {!isRecording && (
          <>
            {/* Language Selector - Apple Style */}
            <View style={styles.languageSection}>
              <Text style={styles.languageLabel}>Language</Text>
              <View style={styles.languageButtons}>
                {languages.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageButton,
                      selectedLanguage === lang.code && styles.languageButtonActive,
                    ]}
                    onPress={() => setSelectedLanguage(lang.code)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.languageButtonText,
                        selectedLanguage === lang.code && styles.languageButtonTextActive,
                      ]}
                    >
                      {lang.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Spacing between language and button */}
            <View style={{ height: 24 }} />
          </>
        )}
        
        {!isRecording ? (
          <TouchableOpacity
            style={styles.startButton}
            onPress={startRecording}
            activeOpacity={0.9}
          >
            <Ionicons name="mic" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Start Recording</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.recordingControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={pauseRecording}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={24}
                color="#0F3F2E"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopRecording}
            >
              <View style={styles.stopSquare} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="bookmark-outline" size={24} color="#0F3F2E" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    letterSpacing: -0.3,
  },
  statusChip: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 63, 46, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F3F2E',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F3F2E',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 180,
  },
  timer: {
    fontSize: 48,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 24,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 4,
    marginBottom: 32,
    position: 'relative',
  },
  waveformGlow: {
    position: 'absolute',
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(15, 63, 46, 0.08)',
    borderRadius: 24,
  },
  waveformBar: {
    width: 2,
    height: 40,
    backgroundColor: 'rgba(15, 63, 46, 0.6)',
    borderRadius: 1,
  },
  visualContainer: {
    marginBottom: 48,
  },
  readyState: {
    alignItems: 'center',
  },
  neumorphicCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  micGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  readyText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  readySubtext: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  recordingState: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  ripple: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
  },
  ripple1: {
    borderColor: '#ef4444',
  },
  ripple2: {
    borderColor: '#fca5a5',
  },
  recordingIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  recordingGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  transcriptsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  transcriptsContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 180,
  },
  transcriptsList: {
    gap: 16,
  },
  transcriptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 0,
  },
  transcriptCardActive: {
    borderWidth: 1,
    borderColor: 'rgba(15, 63, 46, 0.18)',
    backgroundColor: 'rgba(15, 63, 46, 0.03)',
  },
  transcriptTimestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  transcriptDate: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8A8A8A',
  },
  transcriptTimeSeparator: {
    fontSize: 13,
    color: '#8A8A8A',
    marginHorizontal: 4,
  },
  transcriptTime: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8A8A8A',
  },
  transcriptStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
    gap: 8,
  },
  currentTag: {
    backgroundColor: 'rgba(15, 63, 46, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  currentTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F3F2E',
    letterSpacing: 0.3,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  liveTagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C84545',
  },
  liveTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C84545',
    letterSpacing: 0.3,
  },
  transcriptPreview: {
    fontSize: 16,
    lineHeight: 23.2,
    color: '#111111',
    fontWeight: '400',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: 20,
  },
  languageSection: {
    paddingHorizontal: 24,
  },
  languageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A4A4A',
    marginBottom: 8,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  languageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  languageButtonActive: {
    backgroundColor: 'rgba(15, 63, 46, 0.08)',
    borderColor: 'rgba(15, 63, 46, 0.18)',
  },
  languageButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4A4A4A',
  },
  languageButtonTextActive: {
    color: '#0F3F2E',
    fontWeight: '500',
  },
  languageIndicator: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'center',
  },
  languageIndicatorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  startButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: '#0F3F2E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  mainButton: {
    width: '100%',
    maxWidth: 300,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#6B7C32',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  mainButtonGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mainButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  recordingControlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 40,
    gap: 24,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F3F2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  // Summary Styles
  modernHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
  },
  modernBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerInfo: {
    gap: 12,
  },
  modernHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111111',
    letterSpacing: -0.3,
    paddingVertical: 4,
  },
  editableTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111111',
    letterSpacing: -0.3,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#0F3F2E',
    minWidth: 200,
  },
  headerMetaRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(15, 63, 46, 0.08)',
    borderRadius: 10,
    gap: 6,
  },
  metaChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4A4A4A',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    marginTop: 0,
    paddingBottom: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#0F3F2E',
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8A8A8A',
  },
  tabButtonTextActive: {
    color: '#0F3F2E',
    fontWeight: '500',
  },
  summaryScroll: {
    flex: 1,
  },
  summaryContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  tabContent: {
    padding: 0,
    gap: 0,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 12,
    marginTop: 8,
  },
  compactKeyPoint: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  pointNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(15, 63, 46, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(15, 63, 46, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  pointNumberText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F3F2E',
  },
  compactPointText: {
    flex: 1,
    fontSize: 16,
    color: '#111111',
    lineHeight: 23.2,
    fontWeight: '500',
  },
  taskItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 10,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  taskCheckboxChecked: {
    backgroundColor: '#0F3F2E',
    borderColor: '#0F3F2E',
  },
  taskText: {
    flex: 1,
    fontSize: 15,
    color: '#111111',
    fontWeight: '500',
    marginLeft: 12,
  },
  taskTextChecked: {
    color: '#8A8A8A',
    textDecorationLine: 'line-through',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  liveLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveTranscriptCard: {
    width: '100%',
    backgroundColor: '#F7F7F7',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: 'rgba(15, 63, 46, 0.18)',
    marginTop: 32,
  },
  liveTranscriptHeader: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A4A4A',
    marginBottom: 12,
  },
  liveTranscriptScroll: {
    maxHeight: 160,
  },
  liveTranscriptText: {
    fontSize: 15,
    color: '#111111',
    lineHeight: 21.75,
    fontWeight: '400',
  },
  liveTranscriptPlaceholder: {
    fontSize: 15,
    color: '#8A8A8A',
    fontStyle: 'italic',
    fontWeight: '300',
    lineHeight: 21.75,
  },
  transcriptText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 26,
    fontWeight: '400',
  },
  transcriptCardSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  transcriptTextSummary: {
    fontSize: 16,
    color: '#111111',
    lineHeight: 24.32,
    fontWeight: '400',
  },
  floatingActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    paddingTop: 24,
    paddingBottom: 32,
  },
  compactDiscardButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 69, 69, 0.15)',
  },
  compactSaveButton: {
    borderRadius: 18,
    backgroundColor: '#0F3F2E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  compactSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6b7280',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 0,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    marginLeft: 12,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#0F3F2E',
    paddingVertical: 4,
  },
  addTaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 63, 46, 0.18)',
    marginTop: 8,
  },
  addTaskInput: {
    flex: 1,
    fontSize: 15,
    color: '#4A4A4A',
  },
  addTaskButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  wideSaveButton: {
    width: '100%',
    backgroundColor: '#0F3F2E',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  wideSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

