import { CorrectionCommand, ScheduleItem } from '@/src/services/schedule/scheduleAIService';
import scheduleAIService from '@/src/services/schedule/scheduleAIService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useAudioRecorder, RecordingPresets } from 'expo-audio';
import { useApp } from '@/src/context/AppContext';
import { ENV } from '@/src/config/env';

interface ScheduleReviewModalProps {
  visible: boolean;
  scheduleItems: ScheduleItem[];
  onClose: () => void;
  onConfirm: (items: ScheduleItem[]) => void;
  onRegenerate: (corrections: CorrectionCommand[]) => Promise<ScheduleItem[]>;
}

const ScheduleReviewModal: React.FC<ScheduleReviewModalProps> = ({
  visible,
  scheduleItems,
  onClose,
  onConfirm,
  onRegenerate,
}) => {
  const { user, userProfile } = useApp();
  const userId = userProfile?.uid || user?.uid;
  
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<keyof ScheduleItem | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [corrections, setCorrections] = useState<CorrectionCommand[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Audio recording setup
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  
  // Web-specific MediaRecorder for better control
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webAudioChunksRef = useRef<Blob[]>([]);
  const webStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setItems(scheduleItems);
  }, [scheduleItems]);

  const startRecording = async () => {
    try {
      if (!userId) {
        Alert.alert('Error', 'Please sign in to use voice commands.');
        return;
      }

      console.log('[ScheduleReviewModal] Starting recording...');
      
      if (Platform.OS === 'web') {
        // Web platform - use MediaRecorder API
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          webStreamRef.current = stream;
          
          const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
            ? 'audio/webm' 
            : MediaRecorder.isTypeSupported('audio/mp4') 
            ? 'audio/mp4' 
            : 'audio/webm';
          
          const mediaRecorder = new MediaRecorder(stream, { mimeType });
          webMediaRecorderRef.current = mediaRecorder;
          webAudioChunksRef.current = [];
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              webAudioChunksRef.current.push(event.data);
            }
          };
          
          mediaRecorder.start();
          setIsRecording(true);
        } catch (error: any) {
          console.error('Failed to start web recording:', error);
          Alert.alert('Error', 'Failed to access microphone. Please check your permissions.');
        }
      } else {
        // Native platform - use expo-audio
        try {
          await audioRecorder.record();
          setIsRecording(true);
        } catch (error: any) {
          console.error('Failed to start native recording:', error);
          Alert.alert('Error', 'Failed to start recording. Please check your microphone permissions.');
        }
      }
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', error.message || 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setIsTranscribing(true);
      
      let audioUri: string | null = null;
      
      if (Platform.OS === 'web') {
        // Web platform - stop MediaRecorder and create blob
        if (webMediaRecorderRef.current && webMediaRecorderRef.current.state !== 'inactive') {
          await new Promise<void>((resolve) => {
            if (!webMediaRecorderRef.current) {
              resolve();
              return;
            }
            
            webMediaRecorderRef.current.onstop = () => {
              const blob = new Blob(webAudioChunksRef.current, { 
                type: webMediaRecorderRef.current?.mimeType || 'audio/webm' 
              });
              audioUri = URL.createObjectURL(blob);
              resolve();
            };
            
            webMediaRecorderRef.current.stop();
          });
        }
        
        // Stop all tracks
        if (webStreamRef.current) {
          webStreamRef.current.getTracks().forEach(track => track.stop());
          webStreamRef.current = null;
        }
      } else {
        // Native platform - stop expo-audio recorder
        if (audioRecorder.isRecording) {
          await audioRecorder.stop();
          // Wait a bit for the URI to be available
          await new Promise(resolve => setTimeout(resolve, 300));
          // Access URI from recorder after stopping
          audioUri = (audioRecorder as any).uri || null;
        }
      }
      
      if (!audioUri) {
        setIsTranscribing(false);
        Alert.alert('Error', 'No audio recorded. Please try again.');
        return;
      }
      
      // Transcribe the audio
      await transcribeAndProcess(audioUri);
      
      // Clean up web blob URL
      if (Platform.OS === 'web' && audioUri.startsWith('blob:')) {
        URL.revokeObjectURL(audioUri);
      }
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      setIsTranscribing(false);
      Alert.alert('Error', error.message || 'Failed to process recording. Please try again.');
    }
  };

  const transcribeAndProcess = async (audioUri: string) => {
    try {
      if (!userId) {
        throw new Error('User ID not found');
      }

      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // Web platform - fetch blob and create File
        const response = await fetch(audioUri);
        const blob = await response.blob();
        const mimeType = blob.type || 'audio/webm';
        const extension = mimeType.includes('webm') ? 'webm' : mimeType.includes('m4a') ? 'm4a' : 'webm';
        const file = new File([blob], `voice_command_${Date.now()}.${extension}`, { type: mimeType });
        formData.append('audio', file);
      } else {
        // Native platform - use React Native FormData format
        formData.append('audio', {
          uri: audioUri,
          type: 'audio/m4a',
          name: `voice_command_${Date.now()}.m4a`,
        } as any);
      }
      
      formData.append('userId', userId);
      formData.append('language', 'auto'); // Auto-detect language

      const response = await fetch(`${ENV.API_BASE || 'http://localhost:4000'}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to transcribe audio');
      }

      const data = await response.json();
      const transcription = data.transcript || '';
      
      if (!transcription.trim()) {
        Alert.alert('No Speech Detected', 'Could not detect any speech in the recording. Please try again.');
        setIsTranscribing(false);
        return;
      }
      
      // Process the voice command
      processVoiceCommand(transcription);
      setIsTranscribing(false);
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      setIsTranscribing(false);
      Alert.alert('Error', error.message || 'Failed to transcribe audio. Please try again.');
    }
  };

  const processVoiceCommand = (transcription: string) => {
    // Use ScheduleAIService to parse the command
    const command = scheduleAIService.parseCorrectionCommand(transcription);
    
    if (!command) {
      Alert.alert(
        'Command Not Recognized',
        `Could not understand: "${transcription}"\n\nTry commands like:\n- "Change Mathematics to 10 AM"\n- "Move Physics to Tuesday"\n- "Delete Chemistry"`,
        [{ text: 'OK' }]
      );
      return;
    }

    setCorrections(prev => [...prev, command]);
    
    // Apply the correction immediately for better UX
    const updatedItems = scheduleAIService.applyCorrection(items, command);
    setItems(updatedItems);
    
    // Show success message
    Alert.alert('Command Applied', `Applied: "${transcription}"`, [{ text: 'OK' }]);
  };

  const startEditing = (itemId: string, field: keyof ScheduleItem) => {
    setEditingItem(itemId);
    setEditingField(field);
    const item = items.find(i => i.id === itemId);
    setEditValue(item?.[field]?.toString() || '');
  };

  const saveEdit = () => {
    if (!editingItem || !editingField) return;

    const updatedItems = items.map(item => {
      if (item.id === editingItem) {
        return { ...item, [editingField]: editValue };
      }
      return item;
    });

    setItems(updatedItems);
    setEditingItem(null);
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditingField(null);
    setEditValue('');
  };

  const removeItem = (itemId: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this schedule item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setItems(items.filter(item => item.id !== itemId));
          },
        },
      ]
    );
  };

  const handleRegenerate = async () => {
    if (corrections.length === 0) {
      Alert.alert('No Changes', 'Please make some corrections before regenerating.');
      return;
    }

    setIsRegenerating(true);
    try {
      const regeneratedItems = await onRegenerate(corrections);
      setItems(regeneratedItems);
      setCorrections([]);
    } catch (error) {
      console.error('Failed to regenerate:', error);
      Alert.alert('Error', 'Failed to regenerate schedule. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(items);
    onClose();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#22c55e';
    if (confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Review Schedule</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Voice Command Section */}
          <View style={styles.voiceSection}>
            <Text style={styles.voiceTitle}>Voice Commands</Text>
            <View style={styles.voiceControls}>
              <TouchableOpacity
                style={[
                  styles.voiceButton, 
                  isRecording && styles.voiceButtonActive,
                  isTranscribing && styles.voiceButtonDisabled
                ]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
              >
                {isTranscribing ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={[styles.voiceButtonText, styles.voiceButtonTextActive]}>
                      Transcribing...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons 
                      name={isRecording ? "stop" : "mic"} 
                      size={20} 
                      color={isRecording ? "white" : "#000"} 
                    />
                    <Text style={[styles.voiceButtonText, isRecording && styles.voiceButtonTextActive]}>
                      {isRecording ? 'Stop Recording' : 'Voice Command'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={styles.voiceHint}>
                Try: "Change Mathematics to 10 AM" or "Move Physics to Tuesday"
              </Text>
            </View>
          </View>

          {/* Schedule Items */}
          <ScrollView style={styles.itemsContainer} showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                {/* Item Header */}
                <View style={styles.itemHeader}>
                  <View style={styles.confidenceBadge}>
                    <View 
                      style={[
                        styles.confidenceDot, 
                        { backgroundColor: getConfidenceColor(item.confidence) }
                      ]} 
                    />
                    <Text style={styles.confidenceText}>
                      {getConfidenceText(item.confidence)} Confidence
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => removeItem(item.id)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                {/* Item Fields */}
                <View style={styles.itemFields}>
                  {/* Title */}
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Title</Text>
                    {editingItem === item.id && editingField === 'title' ? (
                      <TextInput
                        style={styles.fieldInput}
                        value={editValue}
                        onChangeText={setEditValue}
                        onSubmitEditing={saveEdit}
                        onBlur={cancelEdit}
                        autoFocus
                      />
                    ) : (
                      <TouchableOpacity 
                        style={styles.fieldValue}
                        onPress={() => startEditing(item.id, 'title')}
                      >
                        <Text style={styles.fieldText}>{item.title}</Text>
                        <Ionicons name="pencil" size={14} color="#666" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Time */}
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Time</Text>
                    {editingItem === item.id && editingField === 'time' ? (
                      <TextInput
                        style={styles.fieldInput}
                        value={editValue}
                        onChangeText={setEditValue}
                        onSubmitEditing={saveEdit}
                        onBlur={cancelEdit}
                        autoFocus
                      />
                    ) : (
                      <TouchableOpacity 
                        style={styles.fieldValue}
                        onPress={() => startEditing(item.id, 'time')}
                      >
                        <Text style={styles.fieldText}>{item.time}</Text>
                        <Ionicons name="pencil" size={14} color="#666" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Day */}
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Day</Text>
                    {editingItem === item.id && editingField === 'day' ? (
                      <TextInput
                        style={styles.fieldInput}
                        value={editValue}
                        onChangeText={setEditValue}
                        onSubmitEditing={saveEdit}
                        onBlur={cancelEdit}
                        autoFocus
                      />
                    ) : (
                      <TouchableOpacity 
                        style={styles.fieldValue}
                        onPress={() => startEditing(item.id, 'day')}
                      >
                        <Text style={styles.fieldText}>{item.day}</Text>
                        <Ionicons name="pencil" size={14} color="#666" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Location */}
                  {item.location && (
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Location</Text>
                      {editingItem === item.id && editingField === 'location' ? (
                        <TextInput
                          style={styles.fieldInput}
                          value={editValue}
                          onChangeText={setEditValue}
                          onSubmitEditing={saveEdit}
                          onBlur={cancelEdit}
                          autoFocus
                        />
                      ) : (
                        <TouchableOpacity 
                          style={styles.fieldValue}
                          onPress={() => startEditing(item.id, 'location')}
                        >
                          <Text style={styles.fieldText}>{item.location}</Text>
                          <Ionicons name="pencil" size={14} color="#666" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={handleRegenerate}
              disabled={isRegenerating || corrections.length === 0}
            >
              <Text style={styles.secondaryButtonText}>
                {isRegenerating ? 'Regenerating...' : 'Regenerate with AI'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.primaryButton} onPress={handleConfirm}>
              <Text style={styles.primaryButtonText}>Confirm Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  voiceSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  voiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  voiceControls: {
    alignItems: 'center',
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  voiceButtonActive: {
    backgroundColor: '#000',
  },
  voiceButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginLeft: 8,
  },
  voiceButtonTextActive: {
    color: 'white',
  },
  voiceButtonDisabled: {
    opacity: 0.7,
  },
  voiceHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  itemsContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  itemCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  itemFields: {
    gap: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 80,
  },
  fieldValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fieldText: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#000',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  primaryButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ScheduleReviewModal;
