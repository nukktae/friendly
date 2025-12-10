import { Ionicons } from '@expo/vector-icons';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { chatWithLectures, chatWithTranscript, getChatHistory, deleteChat, deleteAllChatHistory } from '@/src/services/lecture/lectureService';
import { ChatMessage } from '@/src/types/lecture.types';

interface LectureChatbotProps {
  userId: string;
  transcriptionId?: string; // Optional: if provided, chat will be focused on this specific transcript
}

export default function LectureChatbot({ userId, transcriptionId }: LectureChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, [userId]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await getChatHistory(userId, 50);
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
      // If transcriptionId is provided, use transcript-specific chat, otherwise use global chat
      const response = transcriptionId 
        ? await chatWithTranscript(transcriptionId, userId, question)
        : await chatWithLectures(userId, question);

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

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId, userId);
      setMessages((prev) => prev.filter((msg) => msg.chatId !== chatId));
    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('Error', 'Failed to delete chat message');
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

  if (isLoadingHistory) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6B7C32" />
        <Text style={styles.loadingText}>Loading chat history...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Chat Card Container */}
      <View style={styles.chatCard}>
        {/* Header Row Inside Card */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Ionicons name="chatbubbles" size={16} color="#0F3F2E" />
            </View>
            <Text style={styles.headerTitle}>Lecture Assistant</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowMenu(!showMenu)}
            style={styles.menuButton}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#4A4A4A" />
          </TouchableOpacity>
          {showMenu && (
            <View style={styles.menu}>
              <TouchableOpacity
                onPress={() => {
                  setShowMenu(false);
                  handleClearAll();
                }}
                style={styles.menuItem}
              >
                <Ionicons name="trash-outline" size={16} color="#dc2626" />
                <Text style={styles.menuItemText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={40} color="#8A8A8A" style={{ opacity: 0.8 }} />
              <Text style={styles.emptyStateTitle}>Start a conversation</Text>
              <Text style={styles.emptyStateText}>
                {transcriptionId 
                  ? 'Ask me anything about this lecture transcript'
                  : 'Ask me anything about your lectures'}
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
                      <Text style={styles.referencesLabel}>Referenced:</Text>
                      <View style={styles.referencesList}>
                        {message.lecturesReferenced.slice(0, 3).map((ref, idx) => (
                          <View key={idx} style={styles.referenceTag}>
                            <Text style={styles.referenceText} numberOfLines={1}>
                              {ref}
                            </Text>
                          </View>
                        ))}
                        {message.lecturesReferenced.length > 3 && (
                          <Text style={styles.moreReferences}>
                            +{message.lecturesReferenced.length - 3} more
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
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <ActivityIndicator size="small" color="#0F3F2E" />
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
            placeholder={transcriptionId ? "Ask about this transcript..." : "Ask about your lectures..."}
            placeholderTextColor="#8A8A8A"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="arrow-forward"
              size={18}
              color={!inputText.trim() || isLoading ? '#8A8A8A' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  chatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 20,
    marginTop: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    position: 'relative',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 63, 46, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  menuButton: {
    padding: 4,
  },
  menu: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
    minWidth: 140,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 6,
  },
  menuItemText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 8,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A4A4A',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8A8A8A',
    textAlign: 'center',
    maxWidth: '85%',
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#0F3F2E',
  },
  assistantBubble: {
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: 'rgba(15, 63, 46, 0.18)',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#111111',
  },
  messageLoadingText: {
    marginTop: 8,
    fontStyle: 'italic',
    color: '#6b7280',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  assistantTime: {
    color: '#8A8A8A',
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
  },
  referenceTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 120,
  },
  referenceText: {
    fontSize: 11,
    color: '#4b5563',
  },
  moreReferences: {
    fontSize: 11,
    color: '#9ca3af',
    alignSelf: 'center',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 63, 46, 0.18)',
    marginTop: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111111',
    maxHeight: 100,
    padding: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0F3F2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
});
