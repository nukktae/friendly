import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAudioRecorder, RecordingPresets } from 'expo-audio';
import { createAssignment, getUserClasses } from '@/src/services/classes/classResourcesService';
import { useApp } from '@/src/context/AppContext';
import { ENV } from '@/src/config/env';

// Calendar Component
const CalendarComponent: React.FC<{
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}> = ({ selectedDate, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };
  
  const isSameDay = (date1: Date | null, date2: Date | null) => {
    if (!date1 || !date2) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };
  
  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return isSameDay(date, today);
  };
  
  const days = getDaysInMonth(currentMonth);
  
  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={() => {
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
          }}
          style={styles.calendarNavButton}
        >
          <Ionicons name="chevron-back" size={20} color="#18181B" />
        </TouchableOpacity>
        <Text style={styles.calendarMonthText}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
          }}
          style={styles.calendarNavButton}
        >
          <Ionicons name="chevron-forward" size={20} color="#18181B" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.calendarDaysHeader}>
        {dayNames.map((day) => (
          <View key={day} style={styles.calendarDayHeader}>
            <Text style={styles.calendarDayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.calendarGrid}>
        {days.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.calendarDay,
              isSameDay(day, selectedDate) && styles.calendarDaySelected,
              isToday(day) && !isSameDay(day, selectedDate) && styles.calendarDayToday,
            ]}
            onPress={() => day && onDateSelect(day)}
            disabled={!day}
            activeOpacity={0.6}
          >
            {day && (
              <Text
                style={[
                  styles.calendarDayText,
                  isSameDay(day, selectedDate) && styles.calendarDayTextSelected,
                  isToday(day) && !isSameDay(day, selectedDate) && styles.calendarDayTextToday,
                ]}
              >
                {day.getDate()}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const { width: screenWidth } = Dimensions.get('window');

interface CreateAssignmentScreenProps {
  classId?: string;
  onBack: () => void;
  onSuccess?: () => void;
  router?: any;
}

const ASSIGNMENT_TYPES = [
  { value: 'ppt', label: 'PPT', icon: 'document-text' },
  { value: 'report', label: 'Report', icon: 'document' },
  { value: 'team-meeting', label: 'Team Meeting', icon: 'people' },
  { value: 'exam', label: 'Exam', icon: 'school' },
  { value: 'homework', label: 'Homework', icon: 'create' },
  { value: 'project', label: 'Project', icon: 'folder' },
  { value: 'other', label: 'Other', icon: 'ellipse' },
];

export default function CreateAssignmentScreen({
  classId,
  onBack,
  onSuccess,
}: CreateAssignmentScreenProps) {
  const router = useRouter();
  const { user } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'ppt' | 'report' | 'team-meeting' | 'exam' | 'homework' | 'project' | 'other'>('other');
  const [selectedClassId, setSelectedClassId] = useState(classId || '');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(dueDate || new Date());
  const [selectedHour, setSelectedHour] = useState(dueDate ? dueDate.getHours() : 12);
  const [selectedMinute, setSelectedMinute] = useState(dueDate ? dueDate.getMinutes() : 0);
  const [classes, setClasses] = useState<Array<{ id: string; title: string }>>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const modalAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webAudioChunksRef = useRef<Blob[]>([]);
  const webStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadClasses();
    // Animate slide in on mount
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Use the onBack callback which handles navigation properly
      onBack();
    });
  };

  useEffect(() => {
    if (showClassPicker || showCalendarModal) {
      Animated.spring(modalAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      modalAnim.setValue(0);
    }
  }, [showClassPicker, showCalendarModal]);

  const loadClasses = async () => {
    if (!user?.uid) return;
    try {
      setIsLoadingClasses(true);
      const userClasses = await getUserClasses(user.uid);
      setClasses(userClasses);
      if (classId && !selectedClassId) {
        setSelectedClassId(classId);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const transcribeAudio = async (audioUri: string) => {
    try {
      setIsTranscribing(true);
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        const response = await fetch(audioUri);
        const blob = await response.blob();
        const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        formData.append('audio', file);
      } else {
        formData.append('audio', {
          uri: audioUri,
          type: 'audio/m4a',
          name: `audio_${Date.now()}.m4a`,
        } as any);
      }
      
      formData.append('userId', user?.uid || '');
      formData.append('language', 'auto');

      const response = await fetch(`${ENV.API_BASE || 'http://localhost:4000'}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to transcribe audio');
      }

      const data = await response.json();
      setDescription(data.transcript);
      setIsTranscribing(false);
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      Alert.alert('Error', error.message || 'Failed to transcribe audio');
      setIsTranscribing(false);
    }
  };

  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'web') {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        return true;
      } catch (error) {
        Alert.alert('Permission Required', 'Please allow microphone access to record audio');
        return false;
      }
    }
    return true;
  };

  const handleStartRecording = async () => {
    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) return;

      setIsRecording(true);
      setRecordingTime(0);
      
      if (Platform.OS === 'web') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          webStreamRef.current = stream;
          webAudioChunksRef.current = [];
          
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          });
          webMediaRecorderRef.current = mediaRecorder;
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              webAudioChunksRef.current.push(event.data);
            }
          };
          
          mediaRecorder.start(1000);
        } catch (error: any) {
          console.error('Error starting web MediaRecorder:', error);
          setIsRecording(false);
          Alert.alert('Error', 'Failed to start recording');
        }
      } else {
        await audioRecorder.prepareToRecordAsync();
        await audioRecorder.record();
      }

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
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
    } catch (error: any) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      pulseAnim.setValue(1);

      let audioUri: string | null = null;

      if (Platform.OS === 'web') {
        const mediaRecorder = webMediaRecorderRef.current;
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          await new Promise<void>((resolve) => {
            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(webAudioChunksRef.current, { type: 'audio/webm' });
              audioUri = URL.createObjectURL(audioBlob);
              resolve();
            };
            mediaRecorder.stop();
          });
        }
        
        if (webStreamRef.current) {
          webStreamRef.current.getTracks().forEach(track => track.stop());
          webStreamRef.current = null;
        }
      } else {
        const recording = await audioRecorder.stop();
        audioUri = recording.uri;
      }

      if (audioUri) {
        await transcribeAudio(audioUri);
      }
    } catch (error: any) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setIsRecording(false);
    }
  };

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
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
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const handleSubmit = async () => {
    console.log('handleSubmit called', { title, selectedClassId, userId: user?.uid });
    
    if (!title.trim()) {
      console.log('Validation failed: No title');
      Alert.alert('Error', 'Please enter an assignment title');
      return;
    }

    if (!selectedClassId) {
      console.log('Validation failed: No class selected');
      Alert.alert('Error', 'Please select a class');
      return;
    }

    if (!user?.uid) {
      console.log('Validation failed: No user');
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    console.log('Starting assignment creation...', {
      classId: selectedClassId,
      userId: user.uid,
      title: title.trim(),
      description: description.trim(),
      type,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
    });

    try {
      setIsSubmitting(true);
      const result = await createAssignment(selectedClassId, user.uid, {
        title: title.trim(),
        description: description.trim(),
        type,
        dueDate: dueDate ? dueDate.toISOString() : undefined,
      });
      
      console.log('Assignment created successfully:', result);
      
      // Close with smooth animation after a brief delay
      setTimeout(() => {
        setIsClosing(true);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onSuccess?.();
          handleClose();
        });
      }, 500);
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      console.error('Error details:', {
        classId: selectedClassId,
        userId: user?.uid,
        title,
        type,
        dueDate,
        errorMessage: error.message,
        errorStack: error.stack,
      });
      Alert.alert('Error', error.message || 'Failed to create assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: slideAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <StatusBar barStyle="dark-content" hidden={false} translucent backgroundColor="transparent" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.backButton}>
          <Ionicons name="close" size={20} color="#71717A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Assignment</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Class Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Class</Text>
            <TouchableOpacity
              style={[
                styles.classSelector,
                focusedInput === 'class' && styles.inputFocused,
              ]}
              onPress={() => {
                setFocusedInput('class');
                setShowClassPicker(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.classSelectorText, !selectedClass && styles.placeholderText]}>
                {selectedClass ? selectedClass.title : 'Select a class'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={[
                styles.input,
                styles.titleInput,
                focusedInput === 'title' && styles.inputFocused,
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter assignment title"
              placeholderTextColor="#9CA3AF"
              onFocus={() => setFocusedInput('title')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Type Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeGrid}>
              {ASSIGNMENT_TYPES.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.typeButton,
                    type === item.value && styles.typeButtonActive,
                  ]}
                  onPress={() => setType(item.value as any)}
                  activeOpacity={0.96}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={18}
                    color={type === item.value ? '#2F602E' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      type === item.value && styles.typeButtonTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            {isTranscribing ? (
              <View style={styles.transcribingContainer}>
                <Animated.View style={[styles.transcribingIcon, { transform: [{ scale: pulseAnim }] }]}>
                  <Ionicons name="mic" size={18} color="#426b1f" />
                </Animated.View>
                <View style={styles.transcribingTextContainer}>
                  <Text style={styles.transcribingText}>Transcribing...</Text>
                  {isRecording && (
                    <Text style={styles.recordingTime}>{formatRecordingTime(recordingTime)}</Text>
                  )}
                </View>
                {isRecording && (
                  <TouchableOpacity
                    onPress={handleStopRecording}
                    style={styles.stopButton}
                    activeOpacity={0.7}
                  >
                    <View style={styles.stopButtonInner} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.descriptionInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    focusedInput === 'description' && styles.inputFocused,
                  ]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter assignment description (optional)"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  onFocus={() => setFocusedInput('description')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  onPress={isRecording ? handleStopRecording : handleStartRecording}
                  style={styles.micButton}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={isRecording ? "stop" : "mic-outline"} 
                    size={18}
                    color={isRecording ? "#EF4444" : "#2F602E"}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Due Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Deadline</Text>
            <TouchableOpacity
              style={[
                styles.dateSelector,
                focusedInput === 'deadline' && styles.inputFocused,
              ]}
              onPress={() => {
                setFocusedInput('deadline');
                setSelectedCalendarDate(dueDate || new Date());
                setSelectedHour(dueDate ? dueDate.getHours() : 12);
                setSelectedMinute(dueDate ? dueDate.getMinutes() : 0);
                setShowCalendarModal(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              <Text style={[styles.dateSelectorText, !dueDate && styles.placeholderText]}>
                {dueDate
                  ? `${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Select deadline (optional)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={() => {
              console.log('Submit button pressed');
              handleSubmit();
            }}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[
                styles.submitButtonText,
                isSubmitting && styles.submitButtonTextDisabled,
              ]}>
                Create Assignment
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <TouchableOpacity
          style={styles.calendarModalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendarModal(false)}
        >
          <Animated.View
            style={[
              styles.calendarModalContent,
              {
                transform: [
                  {
                    translateY: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>Select Deadline</Text>
              <TouchableOpacity
                onPress={() => setShowCalendarModal(false)}
                style={styles.calendarModalCloseButton}
              >
                <Ionicons name="close" size={20} color="#71717A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.calendarModalBody} showsVerticalScrollIndicator={false}>
              {/* Calendar */}
              <CalendarComponent
                selectedDate={selectedCalendarDate || new Date()}
                onDateSelect={setSelectedCalendarDate}
              />

              {/* Time Picker */}
              <View style={styles.timePickerSection}>
                <Text style={styles.timePickerLabel}>Time</Text>
                <View style={styles.timePickerContainer}>
                  <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerColumnLabel}>Hour</Text>
                    <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.timePickerItem,
                            selectedHour === i && styles.timePickerItemActive,
                          ]}
                          onPress={() => setSelectedHour(i)}
                          activeOpacity={0.6}
                        >
                          <Text
                            style={[
                              styles.timePickerItemText,
                              selectedHour === i && styles.timePickerItemTextActive,
                            ]}
                          >
                            {i.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <Text style={styles.timePickerSeparator}>:</Text>
                  <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerColumnLabel}>Minute</Text>
                    <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                      {[0, 15, 30, 45].map((min) => (
                        <TouchableOpacity
                          key={min}
                          style={[
                            styles.timePickerItem,
                            selectedMinute === min && styles.timePickerItemActive,
                          ]}
                          onPress={() => setSelectedMinute(min)}
                          activeOpacity={0.6}
                        >
                          <Text
                            style={[
                              styles.timePickerItemText,
                              selectedMinute === min && styles.timePickerItemTextActive,
                            ]}
                          >
                            {min.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.calendarModalFooter}>
              <TouchableOpacity
                style={styles.calendarModalCancelButton}
                onPress={() => {
                  setShowCalendarModal(false);
                }}
                activeOpacity={0.6}
              >
                <Text style={styles.calendarModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calendarModalConfirmButton}
                onPress={() => {
                  if (selectedCalendarDate) {
                    const newDate = new Date(selectedCalendarDate);
                    newDate.setHours(selectedHour, selectedMinute, 0, 0);
                    setDueDate(newDate);
                  }
                  setShowCalendarModal(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.calendarModalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Class Picker Modal */}
      <Modal
        visible={showClassPicker}
        transparent
        animationType="none"
        onRequestClose={() => setShowClassPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowClassPicker(false)}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [
                  {
                    translateY: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Class</Text>
              <TouchableOpacity
                onPress={() => setShowClassPicker(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={20} color="#71717A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {isLoadingClasses ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color="#426b1f" />
                </View>
              ) : classes.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>No classes available</Text>
                </View>
              ) : (
                classes.map((classItem) => (
                  <TouchableOpacity
                    key={classItem.id}
                    style={[
                      styles.modalItem,
                      selectedClassId === classItem.id && styles.modalItemActive,
                    ]}
                    onPress={() => {
                      setSelectedClassId(classItem.id);
                      setShowClassPicker(false);
                    }}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        selectedClassId === classItem.id && styles.modalItemTextActive,
                      ]}
                    >
                      {classItem.title}
                    </Text>
                    {selectedClassId === classItem.id && (
                      <Ionicons name="checkmark" size={20} color="#426b1f" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  inputFocused: {
    borderColor: '#3E6A35',
    borderWidth: 1.5,
  },
  placeholder: {
    width: 28,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    color: '#1A1A1A',
  },
  titleInput: {
    height: 50,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
    paddingBottom: 12,
    paddingRight: 50,
    height: 'auto',
  },
  descriptionInputContainer: {
    position: 'relative',
  },
  micButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  transcribingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    minHeight: 120,
  },
  transcribingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F4ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcribingTextContainer: {
    flex: 1,
  },
  transcribingText: {
    fontSize: 14,
    color: '#18181B',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  recordingTime: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 4,
    fontWeight: '400',
  },
  stopButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },
  classSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 48,
  },
  classSelectorText: {
    fontSize: 15,
    color: '#1A1A1A',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    rowGap: 10,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeButtonActive: {
    backgroundColor: '#EDF4ED',
    borderWidth: 1.5,
    borderColor: '#2F602E',
  },
  typeButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#2F602E',
    fontWeight: '600',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 48,
  },
  dateSelectorText: {
    fontSize: 15,
    color: '#1A1A1A',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#3E6A35',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#C7D3C6',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitButtonTextDisabled: {
    color: '#F0F5EF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E4E4E7',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#18181B',
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 14,
    color: '#71717A',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F4F4F5',
  },
  modalItemActive: {
    backgroundColor: '#F0F4ED',
  },
  modalItemText: {
    fontSize: 14,
    color: '#18181B',
    letterSpacing: -0.2,
    flex: 1,
  },
  modalItemTextActive: {
    color: '#426b1f',
    fontWeight: '500',
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  calendarModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E4E4E7',
  },
  calendarModalTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#18181B',
    letterSpacing: -0.3,
  },
  calendarModalCloseButton: {
    padding: 4,
  },
  calendarModalBody: {
    maxHeight: 500,
  },
  calendarContainer: {
    padding: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#18181B',
    letterSpacing: -0.2,
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  calendarDayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  calendarDayHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717A',
    letterSpacing: -0.1,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },
  calendarDaySelected: {
    backgroundColor: '#426b1f',
  },
  calendarDayToday: {
    backgroundColor: '#F0F4ED',
  },
  calendarDayText: {
    fontSize: 14,
    color: '#18181B',
    fontWeight: '400',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  calendarDayTextToday: {
    color: '#426b1f',
    fontWeight: '600',
  },
  timePickerSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  timePickerLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#18181B',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timePickerColumnLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#71717A',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  timePickerScroll: {
    maxHeight: 200,
    width: '100%',
  },
  timePickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 0.5,
    borderColor: 'rgba(228, 228, 231, 0.4)',
  },
  timePickerItemActive: {
    backgroundColor: '#426b1f',
    borderColor: '#426b1f',
  },
  timePickerItemText: {
    fontSize: 14,
    color: '#18181B',
    fontWeight: '400',
    textAlign: 'center',
  },
  timePickerItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timePickerSeparator: {
    fontSize: 20,
    fontWeight: '600',
    color: '#18181B',
    marginTop: 20,
  },
  calendarModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    gap: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E4E4E7',
  },
  calendarModalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 0.5,
    borderColor: 'rgba(228, 228, 231, 0.4)',
  },
  calendarModalCancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#71717A',
  },
  calendarModalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#426b1f',
  },
  calendarModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

