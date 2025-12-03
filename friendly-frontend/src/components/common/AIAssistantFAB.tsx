import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    KeyboardAvoidingView,
  Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioRecorder, RecordingPresets } from 'expo-audio';
import { chatWithLectures, getChatHistory, deleteAllChatHistory, deleteChat } from '../../services/lecture/lectureService';
import { ChatMessage } from '../../types/lecture.types';
import { ENV } from '../../config/env';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Typing Indicator Component
const TypingIndicator: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 200);
    const anim3 = animateDot(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  const opacity1 = dot1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const opacity2 = dot2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const opacity3 = dot3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#71717A',
          opacity: opacity1,
          marginRight: 4,
        }}
      />
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#71717A',
          opacity: opacity2,
          marginRight: 4,
        }}
      />
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#71717A',
          opacity: opacity3,
        }}
      />
    </View>
  );
};

interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  type: 'class' | 'assignment' | 'exam';
  location?: string;
  instructor?: string;
  color: string;
}

interface AIAssistantFABProps {
  scheduleData?: { [key: string]: ScheduleItem[] };
  userData?: any;
  userId: string;
}

const AIAssistantFAB: React.FC<AIAssistantFABProps> = ({ scheduleData, userData, userId }) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [chatHistoryList, setChatHistoryList] = useState<Array<{
    chatId: string;
    question: string;
    answer: string;
    timestamp: string;
  }>>([]);
  const [isLoadingHistoryList, setIsLoadingHistoryList] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const modalAnim = useRef(new Animated.Value(0)).current;
  const sidebarAnim = useRef(new Animated.Value(0)).current;
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webAudioChunksRef = useRef<Blob[]>([]);
  const webStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadChatHistory();
        }
    
    // Cleanup when modal closes
    return () => {
      if (!isOpen && isRecording) {
        handleStopRecording();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (webStreamRef.current) {
        webStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
        }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      Animated.spring(modalAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      modalAnim.setValue(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (showHistorySidebar) {
      Animated.timing(sidebarAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      loadChatHistoryList();
    } else {
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showHistorySidebar]);

  const loadChatHistoryList = async () => {
    try {
      setIsLoadingHistoryList(true);
      const response = await fetch(`${ENV.API_BASE || 'http://localhost:4000'}/api/lectures/chat/history?userId=${userId}&limit=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      
      const data = await response.json();
      // Backend returns chatHistory array
      const history = data.chatHistory || [];
      // Map to expected format
      const formattedHistory = history.map((item: any) => ({
        chatId: item.id || item.chatId,
        question: item.question,
        answer: item.answer,
        timestamp: item.createdAt?._seconds 
          ? new Date(item.createdAt._seconds * 1000).toISOString()
          : item.timestamp || new Date().toISOString(),
      }));
      setChatHistoryList(formattedHistory);
    } catch (error) {
      console.error('Error loading chat history list:', error);
    } finally {
      setIsLoadingHistoryList(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId, userId);
      setChatHistoryList(prev => prev.filter(chat => chat.chatId !== chatId));
      // Also remove from current messages if it's displayed
      setMessages(prev => prev.filter(msg => msg.chatId !== chatId));
      Alert.alert('Success', 'Chat deleted successfully');
    } catch (error: any) {
      console.error('Error deleting chat:', error);
      Alert.alert('Error', error.message || 'Failed to delete chat');
    }
  };

  const handleLoadChat = async (chatId: string) => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`${ENV.API_BASE || 'http://localhost:4000'}/api/lectures/chat/history?userId=${userId}&limit=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      
      const data = await response.json();
      const history = data.chatHistory || [];
      const selectedChat = history.find((item: any) => (item.id || item.chatId) === chatId);
      
      if (selectedChat) {
        const chatMessages: ChatMessage[] = [
          {
            role: 'user',
            content: selectedChat.question,
            timestamp: selectedChat.createdAt?._seconds 
              ? new Date(selectedChat.createdAt._seconds * 1000)
              : new Date(selectedChat.timestamp || Date.now()),
            chatId: selectedChat.id || selectedChat.chatId,
            lecturesReferenced: selectedChat.lecturesReferenced || [],
          },
          {
            role: 'assistant',
            content: selectedChat.answer,
            timestamp: selectedChat.createdAt?._seconds 
              ? new Date(selectedChat.createdAt._seconds * 1000)
              : new Date(selectedChat.timestamp || Date.now()),
            chatId: selectedChat.id || selectedChat.chatId,
            lecturesReferenced: selectedChat.lecturesReferenced || [],
          },
        ];
        setMessages(chatMessages);
        setShowHistorySidebar(false);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadChatHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await getChatHistory(userId, 20);
      if (response.success && response.history) {
        const historyMessages: ChatMessage[] = [];
        response.history.forEach((item) => {
          historyMessages.push({
            role: 'user',
            content: item.question,
            timestamp: new Date(item.timestamp),
            chatId: item.chatId,
            lecturesReferenced: item.lecturesReferenced,
          });
          historyMessages.push({
            role: 'assistant',
            content: item.answer,
            timestamp: new Date(item.timestamp),
            chatId: item.chatId,
            lecturesReferenced: item.lecturesReferenced,
      });
    });
        setMessages(historyMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoadingHistory(false);
      }
  };

  const handleSend = async (text?: string) => {
    const messageToSend = text || inputText.trim();
    if (!messageToSend || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const question = messageToSend;
    setInputText('');
    setIsLoading(true);

    try {
      const response = await chatWithLectures(userId, question);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        chatId: response.chatId,
        lecturesReferenced: response.lecturesReferenced,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending chat message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: error.message || 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete all chat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllChatHistory(userId);
              setMessages([]);
            } catch (error) {
              console.error('Error clearing history:', error);
              Alert.alert('Error', 'Failed to clear chat history');
            }
          },
        },
      ]
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      
      formData.append('userId', userId);
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
      setInputText(data.transcript);
      setIsTranscribing(false);
      setIsRecording(false);
      setRecordingTime(0);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      Alert.alert('Error', error.message || 'Failed to transcribe audio');
      setIsTranscribing(false);
    }
  };

  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        if (file.mimeType?.startsWith('audio/')) {
          await transcribeAudio(file.uri);
        } else {
          Alert.alert('Info', 'File attachment coming soon');
        }
      }
    } catch (error: any) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file');
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

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start pulse animation
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
        await audioRecorder.stop();
        // Wait a bit for the URI to be available
        await new Promise(resolve => setTimeout(resolve, 300));
        audioUri = audioRecorder.uri || null;
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

  const slideY = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight, 0],
  });

  return (
    <>
      {/* FAB Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsOpen(true)}
        onPressIn={() => {
          Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
          }).start();
        }}
        activeOpacity={1}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Ionicons name="chatbubbles" size={20} color="#ffffff" />
        </Animated.View>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideY }],
              },
            ]}
          >
          <KeyboardAvoidingView
              style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={() => setShowHistorySidebar(true)}
                  style={styles.menuButton}
                  activeOpacity={0.6}
                >
                  <Ionicons name="menu" size={20} color="#18181B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Assistant</Text>
                <View style={styles.headerRight}>
                  <TouchableOpacity
                    onPress={() => {
                      if (isRecording) {
                        handleStopRecording();
                      }
                      setIsOpen(false);
                    }}
                    style={styles.actionButton}
                  >
                    <Ionicons name="close" size={18} color="#71717A" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* History Sidebar */}
              {showHistorySidebar && (
                <>
                  <TouchableOpacity
                    style={styles.sidebarOverlay}
                    activeOpacity={1}
                    onPress={() => setShowHistorySidebar(false)}
                  />
                  <Animated.View
                    style={[
                      styles.sidebar,
                      {
                        transform: [
                          {
                            translateX: sidebarAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-screenWidth * 0.85, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <View style={styles.sidebarHeader}>
                      <Text style={styles.sidebarTitle}>Chat History</Text>
                      <TouchableOpacity
                        onPress={() => setShowHistorySidebar(false)}
                        style={styles.sidebarCloseButton}
                        activeOpacity={0.6}
                  >
                        <Ionicons name="close" size={20} color="#71717A" />
              </TouchableOpacity>
            </View>
                    <ScrollView
                      style={styles.sidebarContent}
                      showsVerticalScrollIndicator={false}
                    >
                      {isLoadingHistoryList ? (
                        <View style={styles.sidebarLoading}>
                          <ActivityIndicator size="small" color="#426b1f" />
              </View>
                      ) : chatHistoryList.length === 0 ? (
                        <View style={styles.sidebarEmpty}>
                          <Text style={styles.sidebarEmptyText}>No chat history</Text>
                        </View>
                      ) : (
                        chatHistoryList.map((chat) => (
                          <TouchableOpacity
                            key={chat.chatId}
                            style={styles.chatHistoryItem}
                            onPress={() => handleLoadChat(chat.chatId)}
                            activeOpacity={0.6}
                          >
                            <View style={styles.chatHistoryContent}>
                              <Text style={styles.chatHistoryQuestion} numberOfLines={2}>
                                {chat.question}
                              </Text>
                              <Text style={styles.chatHistoryTime}>
                                {new Date(chat.timestamp).toLocaleDateString()}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => {
                                Alert.alert(
                                  'Delete Chat',
                                  'Are you sure you want to delete this chat?',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Delete',
                                      style: 'destructive',
                                      onPress: () => handleDeleteChat(chat.chatId),
                                    },
                                  ]
                                );
                              }}
                              style={styles.deleteChatButton}
                              activeOpacity={0.6}
                            >
                              <Ionicons name="trash-outline" size={16} color="#71717A" />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </Animated.View>
                </>
              )}


            {/* Messages */}
            <ScrollView
                ref={scrollViewRef}
              style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                {isLoadingHistory ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#6B7C32" />
                    <Text style={styles.loadingText}>Loading history...</Text>
                      </View>
                ) : messages.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                      <Ionicons name="chatbubble-outline" size={32} color="#D1D5DB" />
                    </View>
                    <Text style={styles.emptyStateTitle}>Begin</Text>
                    <Text style={styles.emptyStateText}>
                      Ask about your academic progress
                                    </Text>
                    
                    {/* Suggestion Prompts */}
                    <View style={styles.suggestionsContainer}>
                      <TouchableOpacity
                        style={styles.suggestionButton}
                        onPress={() => handleSend("What are my assignments this week?")}
                        activeOpacity={0.5}
                        disabled={isLoading}
                      >
                        <Text style={styles.suggestionText}>Assignments this week</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.suggestionButton}
                        onPress={() => handleSend("When is my next exam?")}
                        activeOpacity={0.5}
                        disabled={isLoading}
                      >
                        <Text style={styles.suggestionText}>Next exam</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.suggestionButton}
                        onPress={() => handleSend("Summarize my recent lectures")}
                        activeOpacity={0.5}
                        disabled={isLoading}
                      >
                        <Text style={styles.suggestionText}>Recent lectures</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.suggestionButton}
                        onPress={() => handleSend("What's on my schedule today?")}
                        activeOpacity={0.5}
                        disabled={isLoading}
                      >
                        <Text style={styles.suggestionText}>Today's schedule</Text>
                      </TouchableOpacity>
                    </View>
                                  </View>
                ) : (
                  messages.map((message, index) => (
                  <View
                      key={index}
                    style={[
                        styles.messageRow,
                        message.role === 'user' ? styles.userRow : styles.assistantRow,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                          message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                            message.role === 'user' ? styles.userText : styles.assistantText,
                        ]}
                      >
                          {message.content}
                        </Text>
                        {message.lecturesReferenced && message.lecturesReferenced.length > 0 && (
                          <View style={styles.referencesContainer}>
                            <View style={styles.referencesList}>
                              {message.lecturesReferenced.slice(0, 2).map((ref, idx) => (
                                <View key={idx} style={styles.referenceTag}>
                                  <Text style={styles.referenceText} numberOfLines={1}>
                                    {ref}
                                  </Text>
                                </View>
                              ))}
                              {message.lecturesReferenced.length > 2 && (
                                <Text style={styles.moreReferences}>
                                  +{message.lecturesReferenced.length - 2}
                                </Text>
                              )}
                            </View>
                          </View>
                        )}
                    </View>
                  </View>
                  ))
                )}

                {isLoading && (
                  <View style={[styles.messageRow, styles.assistantRow]}>
                    <View style={[styles.messageBubble, styles.assistantBubble]}>
                      <TypingIndicator />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            {isTranscribing ? (
              <View style={styles.transcribingContainer}>
                <View style={styles.transcribingContent}>
                  <Animated.View style={[styles.transcribingIcon, { transform: [{ scale: pulseAnim }] }]}>
                    <Ionicons name="mic" size={20} color="#426b1f" />
                  </Animated.View>
                  <View style={styles.transcribingTextContainer}>
                    <Text style={styles.transcribingText}>Transcribing...</Text>
                    {isRecording && (
                      <Text style={styles.recordingTime}>{formatRecordingTime(recordingTime)}</Text>
                    )}
                  </View>
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
            <View style={styles.inputContainer}>
                <View style={styles.inputField}>
                  <TouchableOpacity
                    onPress={handleAttachFile}
                    style={styles.iconButton}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="attach-outline" size={18} color="#71717A" />
                  </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                    placeholder="Type a message..."
                    placeholderTextColor="#A1A1AA"
                  multiline
                  maxLength={500}
                  editable={!isLoading}
                  onSubmitEditing={() => handleSend()}
                />
                  <TouchableOpacity
                    onPress={isRecording ? handleStopRecording : handleStartRecording}
                    style={styles.iconButton}
                    activeOpacity={0.6}
                  >
                    <Ionicons 
                      name={isRecording ? "stop" : "mic-outline"} 
                      size={18}
                      color={isRecording ? "#EF4444" : "#426b1f"}
                    />
                  </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSend()}
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
                  ]}
                  disabled={!inputText.trim() || isLoading}
                    activeOpacity={0.6}
                >
                  <Ionicons 
                      name="arrow-up" 
                      size={16}
                      color={!inputText.trim() || isLoading ? '#A1A1AA' : '#FFFFFF'}
                  />
                </TouchableOpacity>
            </View>
              </View>
            )}
          </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#426b1f',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 9999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
  },
  menuButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: '#18181B',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 6,
    marginLeft: 4,
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    zIndex: 1000,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: screenWidth * 0.85,
    backgroundColor: '#FAFAFA',
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
  },
  sidebarTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#18181B',
    letterSpacing: -0.3,
  },
  sidebarCloseButton: {
    padding: 4,
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarLoading: {
    padding: 40,
    alignItems: 'center',
  },
  sidebarEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  sidebarEmptyText: {
    fontSize: 13,
    color: '#71717A',
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  chatHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F4F4F5',
    backgroundColor: '#FFFFFF',
  },
  chatHistoryContent: {
    flex: 1,
    marginRight: 12,
  },
  chatHistoryQuestion: {
    fontSize: 13,
    color: '#18181B',
    fontWeight: '400',
    letterSpacing: -0.2,
    marginBottom: 4,
    lineHeight: 18,
  },
  chatHistoryTime: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  deleteChatButton: {
    padding: 6,
    borderRadius: 6,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    color: '#71717A',
    fontWeight: '400',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#18181B',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  emptyStateText: {
    fontSize: 12,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.1,
  },
  suggestionsContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 6,
  },
  suggestionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionText: {
    fontSize: 13,
    color: '#3F3F46',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  messageRow: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: '#426b1f',
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#E4E4E7',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '400',
  },
  assistantText: {
    color: '#18181B',
    fontWeight: '400',
  },
  referencesContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#F4F4F5',
  },
  referencesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  referenceTag: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: 120,
  },
  referenceText: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  moreReferences: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '400',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(228, 228, 231, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 6,
    minHeight: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#18181B',
    maxHeight: 100,
    letterSpacing: -0.2,
    backgroundColor: 'transparent',
    textAlignVertical: 'center',
    marginTop: 2,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#426b1f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'transparent',
  },
  transcribingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E4E4E7',
  },
  transcribingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transcribingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginTop: 2,
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
});

export default AIAssistantFAB;
