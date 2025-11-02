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
    View
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface RecordScreenProps {
  onBack: () => void;
  onSave?: () => void;
}

export default function RecordScreen({ onBack, onSave }: RecordScreenProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'tasks' | 'transcript'>('summary');
  
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

  // Mock AI summary data
  const [summary, setSummary] = useState({
    title: 'Algorithm Lecture - Sorting Algorithms',
    duration: '12:34',
    keyPoints: [
      'Introduction to sorting algorithms and their complexity',
      'Detailed explanation of Quick Sort implementation',
      'Comparison between Merge Sort and Quick Sort',
      'Best and worst case scenarios for different algorithms',
      'Practical applications in real-world problems',
    ],
    actionItems: [
      { id: '1', text: 'Implement Quick Sort in your preferred language', checked: false },
      { id: '2', text: 'Complete practice problems on sorting', checked: false },
      { id: '3', text: 'Review Big O notation concepts', checked: false },
      { id: '4', text: 'Prepare for next week\'s algorithm quiz', checked: false },
    ],
    transcript: `Welcome to today's lecture on sorting algorithms. We'll be focusing on Quick Sort and Merge Sort.

Let's start with Quick Sort. Quick Sort is a divide-and-conquer algorithm that works by selecting a 'pivot' element and partitioning the array around it.

The time complexity of Quick Sort is O(n log n) on average, but can degrade to O(n²) in the worst case when the pivot selection is poor.

Now, let's compare this with Merge Sort. Merge Sort has a guaranteed O(n log n) time complexity but requires additional space.

The key difference is that Quick Sort is in-place while Merge Sort requires extra memory for merging.

In practical applications, Quick Sort is often preferred for its cache-friendly nature and lower constant factors.`,
  });

  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});

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
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = () => {
    setIsRecording(true);
    setShowSummary(false);
    setRecordingTime(0);
  };

  const pauseRecording = () => {
    setIsPaused(!isPaused);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setShowSummary(true);
  };

  const toggleCheckbox = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const saveRecording = () => {
    if (onSave) {
      onSave();
    } else {
      onBack();
    }
  };

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
            <Text style={styles.modernHeaderTitle}>{summary.title}</Text>
            <View style={styles.headerMetaRow}>
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={14} color="#6b7280" />
                <Text style={styles.metaChipText}>{summary.duration}</Text>
              </View>
              <View style={styles.metaChip}>
                <Ionicons name="sparkles" size={14} color="#a855f7" />
                <Text style={styles.metaChipText}>AI Analyzed</Text>
              </View>
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
              {summary.keyPoints.map((point, index) => (
                <View key={index} style={styles.compactKeyPoint}>
                  <View style={styles.pointNumber}>
                    <Text style={styles.pointNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.compactPointText}>{point}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <View style={styles.tabContent}>
              {summary.actionItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.compactCheckbox}
                  onPress={() => toggleCheckbox(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.modernCheckCircle,
                    checkedItems[item.id] && styles.modernCheckCircleChecked
                  ]}>
                    {checkedItems[item.id] && (
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    )}
                  </View>
                  <Text style={[
                    styles.compactCheckboxText,
                    checkedItems[item.id] && styles.compactCheckboxTextChecked
                  ]}>
                    {item.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Transcript Tab */}
          {activeTab === 'transcript' && (
            <View style={styles.tabContent}>
              <View style={styles.transcriptCard}>
                <Text style={styles.transcriptText}>{summary.transcript}</Text>
              </View>
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

        {/* Waveform Visualizer */}
        {isRecording && !isPaused && (
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
          {!isRecording ? (
            <View style={styles.readyState}>
              <View style={styles.neumorphicCircle}>
                <LinearGradient
                  colors={['#6B7C32', '#556B2F']}
                  style={styles.micGradient}
                >
                  <Ionicons name="mic" size={56} color="#ffffff" />
                </LinearGradient>
              </View>
              <Text style={styles.readyText}>Ready to Record</Text>
              <Text style={styles.readySubtext}>Tap to start capturing</Text>
            </View>
          ) : (
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
          )}
        </Animated.View>

        {/* Recording Tips */}
        {!isRecording && (
          <Animated.View
            style={[
              styles.tipsCard,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.tipItem}>
              <View style={styles.tipIconCircle}>
                <Ionicons name="volume-high" size={18} color="#10b981" />
              </View>
              <Text style={styles.tipText}>Find a quiet environment</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipIconCircle}>
                <Ionicons name="chatbubble" size={18} color="#3b82f6" />
              </View>
              <Text style={styles.tipText}>Speak clearly and steadily</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipIconCircle}>
                <Ionicons name="sparkles" size={18} color="#a855f7" />
              </View>
              <Text style={styles.tipText}>AI will analyze automatically</Text>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Modern Controls */}
      <Animated.View
        style={[
          styles.controls,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
          },
        ]}
      >
        {!isRecording ? (
          <TouchableOpacity
            style={styles.mainButton}
            onPress={startRecording}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#6B7C32', '#556B2F']}
              style={styles.mainButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="mic" size={32} color="#ffffff" />
              <Text style={styles.mainButtonText}>Start Recording</Text>
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
      </Animated.View>
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
  controls: {
    paddingHorizontal: 32,
    paddingBottom: 48,
    alignItems: 'center',
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
  transcriptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
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
});

