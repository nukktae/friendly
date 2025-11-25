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
import LectureChatbot from '../../components/lecture/LectureChatbot';

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
    createdAt: string | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number };
    isCurrent: boolean;
    isLive?: boolean;
  }>>([]);
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(false);
  const transcriptsLoadedRef = useRef(false);
  
  // Debug log for state changes
  useEffect(() => {
    console.log('[RecordScreen] State update - isRecording:', isRecording, 'lectureId:', lectureId, 'transcripts.length:', transcripts.length, 'isLoadingTranscripts:', isLoadingTranscripts);
  }, [isRecording, lectureId, transcripts.length, isLoadingTranscripts]);
  
  // Create transcripts from lecture data if API didn't return any
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
  
  // Load lecture data and transcripts when available
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
  
  const formatDate = (timestamp: string | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number }): string => {
    let date: Date;
    if (typeof timestamp === 'string') {
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
  
  const formatTimestampTime = (timestamp: string | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number }): string => {
    let date: Date;
    if (typeof timestamp === 'string') {
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
    console.log('startRecording called', { lectureId, userId: user?.uid });
    
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to record lectures');
      return;
    }

    // Request microphone permission first
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      console.log('Microphone permission denied');
      return;
    }

    let currentLectureId = lectureId;

    // If no lectureId provided, create a new lecture
    if (!currentLectureId) {
      console.log('No lectureId provided, creating new lecture...');
      try {
        const result = await createLecture(user.uid, {
          title: 'New Lecture Recording',
        });
        currentLectureId = result.lectureId;
        setLectureId(currentLectureId);
        console.log('Created new lecture:', currentLectureId);
      } catch (error) {
        console.error('Failed to create lecture:', error);
        Alert.alert('Error', `Failed to create lecture: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
    }

    try {
      console.log('Starting transcription for lecture:', currentLectureId);
      // Start transcribing the existing lecture
      await startTranscribing(currentLectureId, user.uid);

      // On web, use MediaRecorder API directly for better control
      if (Platform.OS === 'web') {
        try {
          // Get user media stream
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          webStreamRef.current = stream;
          webAudioChunksRef.current = [];
          
          // Create MediaRecorder
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          });
          webMediaRecorderRef.current = mediaRecorder;
          
          // Collect audio chunks for final recording and live transcription
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              webAudioChunksRef.current.push(event.data);
              // Also store for live transcription (keep last 20 chunks for rolling window)
              webChunkBlobsRef.current.push(event.data);
              if (webChunkBlobsRef.current.length > 20) {
                webChunkBlobsRef.current.shift(); // Remove oldest chunk
              }
            }
          };
          
          // Create blob URI when recording stops
          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(webAudioChunksRef.current, { type: 'audio/webm' });
            const blobUrl = URL.createObjectURL(audioBlob);
            recordingUriRef.current = blobUrl;
            console.log('Web recording stopped, blob URL created:', blobUrl);
          };
          
          // Start recording with timeslice for chunk collection
          mediaRecorder.start(1000); // Collect data every second
          setIsRecording(true);
          isRecordingRef.current = true;
          isPausedRef.current = false;
          setShowSummary(false);
          setRecordingTime(0);
          setLiveTranscript('');
          lastChunkTime.current = Date.now();
          lastChunkUploadTimeRef.current = Date.now();
          recordingUriRef.current = null;
          webChunkBlobsRef.current = [];
          
          // Start periodic chunk uploads for live transcription (every 10 seconds)
          chunkUploadInterval.current = setInterval(() => {
            if (isRecordingRef.current && !isPausedRef.current) {
              uploadChunk();
            }
          }, 10000); // Upload chunk every 10 seconds
          
          console.log('Web MediaRecorder started with live transcription');
        } catch (error: any) {
          console.error('Error starting web MediaRecorder:', error);
          throw error;
        }
      } else {
        // Native platforms use expo-audio
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setIsRecording(true);
        isRecordingRef.current = true;
        isPausedRef.current = false;
        setShowSummary(false);
        setRecordingTime(0);
        setLiveTranscript('');
        lastChunkTime.current = Date.now();
        lastChunkUploadTimeRef.current = Date.now();
        recordingUriRef.current = null;
        
        // Note: Live chunk uploads not available on native due to expo-audio limitations
        // Will rely on final transcription after recording stops
      }

      // Start periodic chunk uploads for live transcription (every 15 seconds)
      chunkUploadInterval.current = setInterval(() => {
        uploadChunk();
      }, 15000); // Upload chunk every 15 seconds
      
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Error starting recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide more helpful error messages
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        Alert.alert(
          'Microphone Permission Denied',
          'Please allow microphone access in your browser settings and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', `Failed to start transcribing: ${errorMessage}`);
      }
    }
  };

  const pauseRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        // Handle web MediaRecorder pause/resume
        const mediaRecorder = webMediaRecorderRef.current;
        if (!mediaRecorder) return;
        
        if (isPaused) {
          // Resume recording
          if (mediaRecorder.state === 'inactive') {
            mediaRecorder.start(1000);
          }
          setIsPaused(false);
          isPausedRef.current = false;
        } else {
          // Pause recording
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
          }
          setIsPaused(true);
          isPausedRef.current = true;
        }
      } else {
        // Native platforms
        if (isPaused) {
          await audioRecorder.record();
          setIsPaused(false);
          isPausedRef.current = false;
        } else {
          await audioRecorder.pause();
          setIsPaused(true);
          isPausedRef.current = true;
        }
      }
    } catch (error) {
      console.error('Error pausing recording:', error);
    }
  };

  const stopRecording = async () => {
    if (!lectureId || !user?.uid) return;

    try {
      setIsProcessing(true);
      
      // Stop chunk uploads
      if (chunkUploadInterval.current) {
        clearInterval(chunkUploadInterval.current);
        chunkUploadInterval.current = null;
      }
      
      // Clear URI check interval if it exists
      if ((chunkUploadInterval as any).uriCheckInterval) {
        clearInterval((chunkUploadInterval as any).uriCheckInterval);
        (chunkUploadInterval as any).uriCheckInterval = null;
      }

      // Stop recording - handle web platform differently
      isRecordingRef.current = false;
      isPausedRef.current = false;
      
      let uri: string | null = null;
      
      if (Platform.OS === 'web') {
        // Use web MediaRecorder if available
        const mediaRecorder = webMediaRecorderRef.current;
        const stream = webStreamRef.current;
        
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          // Stop MediaRecorder
          mediaRecorder.stop();
          
          // Stop all tracks in the stream
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          
          // Wait for onstop event to fire and create blob URL
          await new Promise(resolve => setTimeout(resolve, 300));
          
          uri = recordingUriRef.current;
          console.log('Web MediaRecorder stopped, URI:', uri);
        } else {
          // Fallback to expo-audio if MediaRecorder wasn't used
          try {
            uri = recordingUriRef.current || audioRecorder.uri || null;
            if (!uri) {
              await audioRecorder.stop();
              await new Promise(resolve => setTimeout(resolve, 300));
              uri = audioRecorder.uri || null;
            }
          } catch (error: any) {
            console.warn('Error stopping expo-audio recorder:', error?.message);
          }
        }
      } else {
        // Native platforms
        await audioRecorder.stop();
        uri = audioRecorder.uri || null;
      }
      
      // Clean up web resources
      if (Platform.OS === 'web') {
        webMediaRecorderRef.current = null;
        webStreamRef.current = null;
        webAudioChunksRef.current = [];
        webChunkBlobsRef.current = [];
      }
      
      if (!uri) {
        throw new Error('No recording URI available. The recording may have been too short or failed. Please try recording again.');
      }

      console.log('Recording URI:', uri);
      console.log('\n========== RECORD SCREEN DEBUG ==========');
      console.log(`[RecordScreen] About to transcribe with language: "${selectedLanguage}"`);
      console.log(`[RecordScreen] Language type: ${typeof selectedLanguage}`);
      console.log(`[RecordScreen] Language === 'ko': ${selectedLanguage === 'ko'}`);
      console.log(`[RecordScreen] Language === 'en': ${selectedLanguage === 'en'}`);
      console.log(`[RecordScreen] Language === 'auto': ${selectedLanguage === 'auto'}`);
      console.log(`[RecordScreen] Recording time: ${recordingTime}`);
      
      // CRITICAL: Ensure we're sending the correct language
      const languageToSend = selectedLanguage || 'auto';
      console.log(`[RecordScreen] ⚠️  Language to send: "${languageToSend}"`);
      console.log(`[RecordScreen] ⚠️  If you're speaking Korean, make sure Korean (한국어) is selected!`);
      console.log('==========================================\n');

      // Transcribe audio file (this will transcribe using Whisper and delete the audio)
      // Only the transcript is saved, not the audio file
      const transcribeResult = await transcribeLecture(lectureId, uri, user.uid, recordingTime, languageToSend);
      const newTranscriptionId = transcribeResult.transcriptionId;
      setTranscriptionId(newTranscriptionId);

      // Wait for transcription to be saved to database and verify it exists
      let retries = 0;
      let transcriptAvailable = false;
      while (retries < 5 && !transcriptAvailable) {
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          // Try to get the lecture to check if transcript exists
          const lectureData = await getLecture(lectureId, user.uid);
          if (lectureData.transcript) {
            transcriptAvailable = true;
            console.log('Transcript available, proceeding with summary generation');
          }
        } catch (error) {
          console.log(`Waiting for transcript... (attempt ${retries + 1}/5)`);
        }
        retries++;
      }

      if (!transcriptAvailable) {
        console.warn('Transcript not yet available, but proceeding anyway');
      }

      // Generate summary from the transcript using transcriptionId
      try {
        await generateSummary(newTranscriptionId);
      } catch (error: any) {
        console.error('Error generating summary:', error);
        // Don't fail the whole process if summary generation fails
        if (error.message?.includes('Transcript not available')) {
          console.warn('Transcript not available yet, summary generation skipped');
        }
      }

      // Generate checklist from the transcript using transcriptionId
      try {
        await generateChecklist(newTranscriptionId);
      } catch (error: any) {
        console.error('Error generating checklist:', error);
        // Don't fail the whole process if checklist generation fails
        if (error.message?.includes('Transcript not available')) {
          console.warn('Transcript not available yet, checklist generation skipped');
        }
      }

      // Load updated lecture data
      await loadLecture();

    setIsRecording(false);
    isRecordingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    setShowSummary(true);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCheckbox = async (id: string) => {
    if (!transcriptionId) return;

    try {
      const updatedItem = await toggleChecklistItem(transcriptionId, id);
      // Update the item in the local state
      setActionItems(prevItems =>
        prevItems.map(item => (item.id === id ? updatedItem : item))
      );
    } catch (error) {
      console.error('Error toggling checklist item:', error);
      Alert.alert('Error', 'Failed to toggle checklist item');
    }
  };

  const addChecklistItem = async () => {
    if (!newItemText.trim() || !transcriptionId) return;

    try {
      const updatedItems = await updateChecklist(transcriptionId, {
        add: { text: newItemText.trim() },
      });
      setActionItems(updatedItems);
      setNewItemText('');
    } catch (error) {
      console.error('Error adding checklist item:', error);
      Alert.alert('Error', 'Failed to add checklist item');
    }
  };

  const editChecklistItem = async (id: string) => {
    if (!editText.trim() || !transcriptionId) return;

    try {
      const updatedItems = await updateChecklist(transcriptionId, {
        edit: { id, text: editText.trim() },
      });
      setActionItems(updatedItems);
      setEditingItem(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing checklist item:', error);
      Alert.alert('Error', 'Failed to edit checklist item');
    }
  };

  const deleteChecklistItem = async (id: string) => {
    if (!transcriptionId) return;

    try {
      const updatedItems = await updateChecklist(transcriptionId, {
        delete: { id },
      });
      setActionItems(updatedItems);
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      Alert.alert('Error', 'Failed to delete checklist item');
    }
  };

  const saveRecording = () => {
    if (onSave) {
      onSave();
    } else {
      onBack();
    }
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
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.modernHeaderTitle}>
              {lecture?.summary?.title || lecture?.title || 'Lecture Recording'}
            </Text>
            <View style={styles.headerMetaRow}>
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={14} color="#6b7280" />
                <Text style={styles.metaChipText}>{formatTime(recordingTime)}</Text>
              </View>
              {lecture?.summary && (
              <View style={styles.metaChip}>
                <Ionicons name="sparkles" size={14} color="#a855f7" />
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
              size={20} 
              color={activeTab === 'summary' ? '#6B7C32' : '#9ca3af'} 
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
              size={20} 
              color={activeTab === 'tasks' ? '#6B7C32' : '#9ca3af'} 
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
              size={20} 
              color={activeTab === 'transcript' ? '#6B7C32' : '#9ca3af'} 
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
              size={20} 
              color={activeTab === 'chat' ? '#6B7C32' : '#9ca3af'} 
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
                lecture.summary.keyPoints.map((point: string, index: number) => (
                <View key={index} style={styles.compactKeyPoint}>
                  <View style={styles.pointNumber}>
                    <Text style={styles.pointNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.compactPointText}>{point}</Text>
                </View>
                ))
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
                <View key={item.id} style={styles.compactCheckbox}>
                <TouchableOpacity
                  onPress={() => toggleCheckbox(item.id)}
                  activeOpacity={0.7}
                    style={styles.checkboxRow}
                >
                  <View style={[
                    styles.modernCheckCircle,
                      item.checked && styles.modernCheckCircleChecked
                  ]}>
                      {item.checked && (
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
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
                          <Ionicons name="checkmark-circle" size={24} color="#6B7C32" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                          setEditingItem(null);
                          setEditText('');
                        }}>
                          <Ionicons name="close-circle" size={24} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                  <Text style={[
                    styles.compactCheckboxText,
                          item.checked && styles.compactCheckboxTextChecked
                  ]}>
                    {item.text}
                  </Text>
                        <View style={styles.checkboxActions}>
                          <TouchableOpacity
                            onPress={() => {
                              setEditingItem(item.id);
                              setEditText(item.text);
                            }}
                          >
                            <Ionicons name="create-outline" size={18} color="#6b7280" />
                </TouchableOpacity>
                          <TouchableOpacity onPress={() => deleteChecklistItem(item.id)}>
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
              
              {/* Add new item */}
              <View style={styles.addItemContainer}>
                <TextInput
                  style={styles.addItemInput}
                  placeholder="Add new task..."
                  placeholderTextColor="#9ca3af"
                  value={newItemText}
                  onChangeText={setNewItemText}
                  onSubmitEditing={addChecklistItem}
                />
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={addChecklistItem}
                  disabled={!newItemText.trim()}
                >
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color={newItemText.trim() ? '#6B7C32' : '#d1d5db'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Transcript Tab */}
          {activeTab === 'transcript' && (
            <View style={styles.tabContent}>
              <View style={styles.transcriptCard}>
                {isRecording && liveTranscript ? (
                  <>
                    <View style={styles.liveIndicator}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveLabel}>Live Transcription</Text>
                    </View>
                    <Text style={styles.transcriptText}>
                      {liveTranscript}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.transcriptText}>
                    {lecture?.transcript || lecture?.liveTranscript || liveTranscript || 'Transcript will appear here after processing'}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && user?.uid && (
            <View style={styles.tabContent}>
              <LectureChatbot userId={user.uid} transcriptionId={transcriptionId || undefined} />
            </View>
          )}

          {/* Floating Action Buttons */}
          <View style={styles.floatingActions}>
            <TouchableOpacity
              style={styles.compactDiscardButton}
              onPress={onBack}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.compactSaveButton}
              onPress={saveRecording}
            >
              <LinearGradient
                colors={['#6B7C32', '#556B2F']}
                style={styles.compactSaveGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="checkmark" size={20} color="#ffffff" />
                <Text style={styles.compactSaveText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isRecording ? ['#fef2f2', '#ffffff'] : ['#f9fafb', '#ffffff']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Minimal Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Recording</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#1f2937" />
        </TouchableOpacity>
      </Animated.View>

      {/* Status Chip */}
      {isRecording && (
        <Animated.View style={styles.statusChip}>
          <LinearGradient
            colors={isPaused ? ['#fbbf24', '#f59e0b'] : ['#ef4444', '#dc2626']}
            style={styles.statusGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {isPaused ? 'Paused' : 'Recording'}
            </Text>
          </LinearGradient>
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
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            {formatTime(recordingTime)}
          </Animated.Text>

          {/* Live Transcript Display */}
          {liveTranscript && (
            <Animated.View
              style={[
                styles.liveTranscriptContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>Live Transcription</Text>
              </View>
              <ScrollView 
                style={styles.liveTranscriptScroll}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                <Text style={styles.liveTranscriptText}>{liveTranscript}</Text>
              </ScrollView>
            </Animated.View>
          )}

          {/* Waveform Visualizer */}
          {!isPaused && (
            <View style={styles.waveformContainer}>
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
                      opacity: anim,
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Center Visual */}
          <Animated.View
            style={[
              styles.visualContainer,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <View style={styles.recordingState}>
              {/* Animated Ripples */}
              <Animated.View
                style={[
                  styles.ripple,
                  styles.ripple1,
                  {
                    opacity: rippleAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.5, 0.2, 0],
                    }),
                    transform: [
                      {
                        scale: rippleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2.5],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.ripple,
                  styles.ripple2,
                  {
                    opacity: rippleAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 0.15, 0],
                    }),
                    transform: [
                      {
                        scale: rippleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1.3, 3],
                        }),
                      },
                    ],
                  },
                ]}
              />

              {/* Center Icon */}
              <Animated.View
                style={[
                  styles.recordingIcon,
                  {
                    transform: [{ scale: isPaused ? 1 : pulseAnim }],
                  },
                ]}
              >
                <LinearGradient
                  colors={isPaused ? ['#fbbf24', '#f59e0b'] : ['#ef4444', '#dc2626']}
                  style={styles.recordingGradient}
                >
                  <Ionicons
                    name={isPaused ? 'pause' : 'mic'}
                    size={48}
                    color="#ffffff"
                  />
                </LinearGradient>
              </Animated.View>
            </View>
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
                  createdAt: string | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number };
                  isCurrent: boolean;
                  isLive?: boolean;
                }, index: number) => {
                  console.log(`[RecordScreen] Rendering transcript ${index}:`, transcript);
                  return (
                    <View key={index} style={styles.transcriptCard}>
                      <View style={styles.transcriptHeader}>
                        <View style={styles.transcriptMeta}>
                          <Text style={styles.transcriptDate}>{formatDate(transcript.createdAt)}</Text>
                          <Text style={styles.transcriptTime}>{formatTimestampTime(transcript.createdAt)}</Text>
                        </View>
                        {transcript.isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>Current</Text>
                          </View>
                        )}
                        {transcript.isLive && (
                          <View style={styles.liveBadge}>
                            <View style={styles.liveDotSmall} />
                            <Text style={styles.liveBadgeText}>Live</Text>
                          </View>
                        )}
                      </View>
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

      {/* Language Selector */}
      {!isRecording && (
        <View style={styles.languageSelector}>
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
                activeOpacity={0.7}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
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
      )}

      {/* Language Indicator During Recording */}
      {isRecording && (
        <View style={styles.languageIndicator}>
          <Text style={styles.languageIndicatorText}>
            {languages.find(l => l.code === selectedLanguage)?.flag} {languages.find(l => l.code === selectedLanguage)?.name}
          </Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {!isRecording ? (
          <TouchableOpacity
            style={styles.startButton}
            onPress={startRecording}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#6B7C32', '#556B2F']}
              style={styles.startButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="mic" size={24} color="#ffffff" />
              <Text style={styles.startButtonText}>Start Recording</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.recordingControls}>
            <TouchableOpacity
              style={styles.controlButtonSecondary}
              onPress={pauseRecording}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={24}
                color="#6B7C32"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stopButtonContainer}
              onPress={stopRecording}
            >
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.stopButtonGradient}
              >
                <View style={styles.stopSquare} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButtonSecondary}>
              <Ionicons name="bookmark-outline" size={24} color="#6B7C32" />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  statusChip: {
    alignSelf: 'center',
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  statusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  timer: {
    fontSize: 64,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    gap: 6,
    marginBottom: 40,
  },
  waveformBar: {
    width: 4,
    height: 100,
    backgroundColor: '#ef4444',
    borderRadius: 2,
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
  },
  transcriptsContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 120,
  },
  transcriptsList: {
    gap: 16,
  },
  transcriptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transcriptMeta: {
    flex: 1,
  },
  transcriptDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  transcriptTime: {
    fontSize: 13,
    color: '#6b7280',
  },
  currentBadge: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369a1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ef4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptPreview: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    fontWeight: '400',
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
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  languageSelector: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  languageLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  languageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  languageButtonActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#6B7C32',
  },
  languageFlag: {
    fontSize: 20,
  },
  languageButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  languageButtonTextActive: {
    color: '#6B7C32',
    fontWeight: '600',
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
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  startButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6B7C32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 300,
    gap: 24,
  },
  controlButtonSecondary: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stopButtonContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  stopButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopSquare: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  // Summary Styles
  modernHeader: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modernBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerInfo: {
    gap: 8,
  },
  modernHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  headerMetaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    gap: 4,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingHorizontal: 20,
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
    borderBottomColor: '#6B7C32',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabButtonTextActive: {
    color: '#6B7C32',
  },
  summaryScroll: {
    flex: 1,
  },
  summaryContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  tabContent: {
    padding: 20,
    gap: 12,
  },
  compactKeyPoint: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  pointNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  pointNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6B7C32',
  },
  compactPointText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    fontWeight: '500',
  },
  compactCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  modernCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  modernCheckCircleChecked: {
    backgroundColor: '#6B7C32',
    borderColor: '#6B7C32',
  },
  compactCheckboxText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  compactCheckboxTextChecked: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
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
  liveTranscriptContainer: {
    width: '100%',
    maxWidth: 600,
    maxHeight: 200,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  liveTranscriptScroll: {
    maxHeight: 150,
  },
  liveTranscriptText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    fontWeight: '400',
  },
  transcriptText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 26,
    fontWeight: '400',
  },
  floatingActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 20,
  },
  compactDiscardButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  compactSaveButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#6B7C32',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  compactSaveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 18,
    gap: 8,
  },
  compactSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
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
    gap: 12,
  },
  checkboxActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: '#6B7C32',
    paddingVertical: 4,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addItemInput: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  addItemButton: {
    padding: 4,
  },
});

