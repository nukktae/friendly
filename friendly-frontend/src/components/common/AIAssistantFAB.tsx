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
import { chatWithLectures, getChatHistory, deleteAllChatHistory } from '../../services/lecture/lectureService';
import { ChatMessage } from '../../types/lecture.types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  const scrollViewRef = useRef<ScrollView>(null);
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadChatHistory();
        }
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

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const question = inputText.trim();
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
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubbles" size={22} color="#ffffff" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.overlayTouch}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          />
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
                <View style={styles.headerLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="sparkles" size={18} color="#6B7C32" />
                </View>
                  <View>
                <Text style={styles.headerTitle}>AI Assistant</Text>
                <Text style={styles.headerSubtitle}>Academic Helper</Text>
              </View>
                </View>
                <View style={styles.headerRight}>
                  <TouchableOpacity
                    onPress={handleClearAll}
                    style={styles.clearButton}
                  >
                    <Ionicons name="trash-outline" size={18} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIsOpen(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
              </View>

              {/* Drag Handle */}
              <View style={styles.dragHandle} />

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
                    <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyStateTitle}>Start a conversation</Text>
                    <Text style={styles.emptyStateText}>
                      Ask me about your lectures, assignments, or schedule
                                    </Text>
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
                      {message.role === 'assistant' && (
                        <View style={styles.assistantAvatar}>
                          <Ionicons name="sparkles" size={12} color="#6B7C32" />
                      </View>
                    )}
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
                            <Text style={styles.referencesLabel}>Referenced lectures:</Text>
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
                        <Text
                          style={[
                            styles.messageTime,
                            message.role === 'user' ? styles.userTime : styles.assistantTime,
                          ]}
                        >
                          {formatTime(message.timestamp)}
                      </Text>
                    </View>
                  </View>
                  ))
                )}

                {isLoading && (
                  <View style={[styles.messageRow, styles.assistantRow]}>
                    <View style={styles.assistantAvatar}>
                      <Ionicons name="sparkles" size={12} color="#6B7C32" />
                  </View>
                    <View style={[styles.messageBubble, styles.assistantBubble]}>
                      <ActivityIndicator size="small" color="#6B7C32" />
                      <Text style={[styles.messageText, styles.assistantText, styles.messageLoadingText]}>
                        Thinking...
                      </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask about your lectures..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  maxLength={500}
                  editable={!isLoading}
                  onSubmitEditing={handleSend}
                />
                <TouchableOpacity
                  onPress={handleSend}
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
                  ]}
                  disabled={!inputText.trim() || isLoading}
                >
                  <Ionicons 
                    name="send" 
                    size={18}
                    color={!inputText.trim() || isLoading ? '#9ca3af' : '#ffffff'}
                  />
                </TouchableOpacity>
            </View>
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
    backgroundColor: '#6B7C32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },
  modalContent: {
    height: screenHeight * 0.75,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    padding: 6,
  },
  closeButton: {
    padding: 6,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#6B7C32',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#f9fafb',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#ffffff',
  },
  assistantText: {
    color: '#111827',
  },
  messageLoadingText: {
    marginTop: 8,
    fontStyle: 'italic',
    color: '#6b7280',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  assistantTime: {
    color: '#9ca3af',
  },
  referencesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  referencesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  referencesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  referenceTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 100,
  },
  referenceText: {
    fontSize: 11,
    color: '#4b5563',
  },
  moreReferences: {
    fontSize: 11,
    color: '#9ca3af',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6B7C32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
});

export default AIAssistantFAB;
