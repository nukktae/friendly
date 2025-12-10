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
  Image,
} from 'react-native';
import { useAudioRecorder, RecordingPresets } from 'expo-audio';
import { PDFFile, chatWithPDF, getPDFChatHistory, transcribeAudioForPDF } from '@/src/services/pdf/pdfService';
import { SkeletonList } from '@/src/components/common/Skeleton';

// Component to render formatted text with markdown-like formatting
function FormattedText({ content, textStyle }: { content: string; textStyle: any }) {
  const sanitizeText = (text: string): string => {
    return text
      .replace(/<View[^>]*>.*?<\/View>/gis, '')
      .replace(/<div[^>]*>.*?<\/div>/gis, '')
      .replace(/\[Object\]/g, '')
      .replace(/\[Array\]/g, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  };

  const parseContent = (text: string) => {
    const sanitized = sanitizeText(text);
    const parts: Array<{ type: string; content: string; level?: number }> = [];
    const lines = sanitized.split('\n');

    let i = 0;
    let currentParagraph: string[] = [];
    
    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paraText = currentParagraph.join(' ').trim();
        if (paraText) {
          parts.push({ type: 'paragraph', content: paraText });
        }
        currentParagraph = [];
      }
    };

    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (!line) {
        flushParagraph();
        i++;
        continue;
      }

      // Check for numbered list (1. item or 1) item)
      const numberedMatch = line.match(/^(\d+)[\.\)]\s+(.+)$/);
      if (numberedMatch) {
        flushParagraph();
        parts.push({ type: 'numbered-item', content: numberedMatch[2], level: parseInt(numberedMatch[1]) });
        i++;
        continue;
      }

      // Check for bullet list (- item, • item, or * item)
      const bulletMatch = line.match(/^[-•*]\s+(.+)$/);
      if (bulletMatch) {
        flushParagraph();
        parts.push({ type: 'bullet-item', content: bulletMatch[1] });
        i++;
        continue;
      }

      // Check for sub-bullet (indented)
      const subBulletMatch = line.match(/^\s+[-•*]\s+(.+)$/);
      if (subBulletMatch) {
        flushParagraph();
        parts.push({ type: 'bullet-item', content: subBulletMatch[1] });
        i++;
        continue;
      }

      // Accumulate paragraph text
      currentParagraph.push(line);
      i++;
    }
    
    flushParagraph();

    return parts;
  };

  const renderBoldText = (text: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText) {
          parts.push(
            <Text key={key++} style={textStyle}>
              {beforeText}
            </Text>
          );
        }
      }
      parts.push(
        <Text key={key++} style={[textStyle, styles.boldText]}>
          {match[1]}
        </Text>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText) {
        parts.push(
          <Text key={key++} style={textStyle}>
            {remainingText}
          </Text>
        );
      }
    }

    return parts.length > 0 ? parts : <Text style={textStyle}>{text}</Text>;
  };

  const parts = parseContent(content);
  
  return (
    <View>
      {parts.map((part, index) => {
        if (part.type === 'numbered-item') {
          return (
            <View key={index} style={styles.listItem}>
              <Text style={[textStyle, styles.listNumber]}>{part.level}.</Text>
              <View style={styles.listContent}>
                {renderBoldText(part.content)}
              </View>
            </View>
          );
        }
        
        if (part.type === 'bullet-item') {
          return (
            <View key={index} style={styles.listItem}>
              <Text style={[textStyle, styles.bullet]}>•</Text>
              <View style={styles.listContent}>
                {renderBoldText(part.content)}
              </View>
            </View>
          );
        }
        
        if (part.type === 'bold-text') {
          return (
            <View key={index} style={styles.paragraph}>
              {renderBoldText(part.content)}
            </View>
          );
        }
        
        return (
          <View key={index} style={styles.paragraph}>
            {renderBoldText(part.content)}
          </View>
        );
      })}
    </View>
  );
}

interface PDFChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chatId?: string;
  pageReferences?: string[];
}

interface PDFChatPanelProps {
  pdf: PDFFile;
  userId: string;
  selectedText?: string;
  onSelectedTextClear?: () => void;
  onCaptureScreenshot?: () => Promise<string | null>; // Returns base64 image data or null
  currentPage?: number; // Current PDF page number
}

export function PDFChatPanel({ 
  pdf, 
  userId, 
  selectedText = '', 
  onSelectedTextClear,
  onCaptureScreenshot,
  currentPage = 1,
}: PDFChatPanelProps) {
  const [messages, setMessages] = useState<PDFChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Audio recorder for voice input
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  
  // Web-specific MediaRecorder for better control
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webAudioChunksRef = useRef<Blob[]>([]);
  const webStreamRef = useRef<MediaStream | null>(null);
  const recordingUriRef = useRef<string | null>(null);

  // Debug selected text changes
  useEffect(() => {
    console.log('💬 PDFChatPanel - selectedText changed:', {
      hasText: !!selectedText,
      length: selectedText?.length || 0,
      preview: selectedText?.substring(0, 50) || '',
    });
  }, [selectedText]);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, [pdf.id, userId]);

  // Update input text when selected text changes (only if input is empty)
  useEffect(() => {
    if (selectedText && selectedText.trim().length > 0 && !inputText.trim()) {
      setInputText(selectedText);
    }
  }, [selectedText]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const history = await getPDFChatHistory(pdf.id, userId, 50);
      if (history && history.length > 0) {
        const historyMessages: PDFChatMessage[] = [];
        history.forEach((item) => {
          historyMessages.push({
            role: 'user',
            content: item.question,
            timestamp: typeof item.timestamp === 'string'
              ? new Date(item.timestamp)
              : new Date((item.timestamp as any)._seconds * 1000),
            chatId: item.chatId,
          });
          historyMessages.push({
            role: 'assistant',
            content: item.answer,
            timestamp: typeof item.timestamp === 'string'
              ? new Date(item.timestamp)
              : new Date((item.timestamp as any)._seconds * 1000),
            chatId: item.chatId,
            pageReferences: item.pageReferences,
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

    // Check if input text might be selected text (user pasted it)
    // If input starts with quoted text or looks like a selection, use it as context
    let textToInclude = selectedText && selectedText.trim().length > 0 
      ? selectedText.trim() 
      : undefined;
    
    // If no selected text but input looks like a quote/selection, extract it
    if (!textToInclude && inputText.includes('"') && inputText.length > 50) {
      const quotedMatch = inputText.match(/"([^"]+)"/);
      if (quotedMatch && quotedMatch[1].length > 10) {
        textToInclude = quotedMatch[1];
        console.log('📝 Extracted quoted text as selection:', textToInclude.substring(0, 50));
      }
    }

    const userMessage: PDFChatMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const textToSend = inputText.trim();
    
    console.log('📤 Sending message:', {
      question: textToSend.substring(0, 50),
      hasSelectedText: !!textToInclude,
      selectedTextLength: textToInclude?.length || 0,
    });
    
    const screenshotToSend = screenshotUri; // Store before clearing
    setInputText('');
    setIsLoading(true);
    setScreenshotUri(null); // Clear screenshot after sending
    onSelectedTextClear?.();

    try {
      // TODO: Include screenshot image data in the API call when backend supports it
      // For now, we'll just send the text message
      const response = await chatWithPDF(pdf.id, userId, textToSend, textToInclude);

      const assistantMessage: PDFChatMessage = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        chatId: response.chatId,
        pageReferences: response.pageReferences,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending chat message:', error);
      const errorMessage: PDFChatMessage = {
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
      'Are you sure you want to delete all chat history for this PDF?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
          },
        },
      ]
    );
  };

  // Handle screenshot capture
  const handleCaptureScreenshot = async () => {
    if (!onCaptureScreenshot) {
      Alert.alert('Error', 'Screenshot capture is not available');
      return;
    }

    try {
      const imageData = await onCaptureScreenshot();
      if (imageData) {
        setScreenshotUri(imageData);
        // Don't add text placeholder, just show the image preview
      }
    } catch (error: any) {
      console.error('Error capturing screenshot:', error);
      Alert.alert('Error', 'Failed to capture screenshot. Please try again.');
    }
  };

  // Remove screenshot
  const handleRemoveScreenshot = () => {
    setScreenshotUri(null);
  };

  // Handle mic recording
  const requestMicrophonePermission = async (): Promise<boolean> => {
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
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (error: any) {
        console.error('Microphone permission denied:', error);
        const errorMessage = error?.message || 'Unknown error';
        
        if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
          Alert.alert(
            'Microphone Permission Required',
            'Please allow microphone access to record voice messages. Click the microphone icon in your browser\'s address bar to grant permission.',
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
    return true;
  };

  const handleStartRecording = async () => {
    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) return;

      setIsRecording(true);
      
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
          
          // Collect audio chunks
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              webAudioChunksRef.current.push(event.data);
            }
          };
          
          // Create blob URI when recording stops
          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(webAudioChunksRef.current, { type: 'audio/webm' });
            const blobUrl = URL.createObjectURL(audioBlob);
            recordingUriRef.current = blobUrl;
          };
          
          // Start recording
          mediaRecorder.start(1000); // Collect data every second
        } catch (error: any) {
          console.error('Error starting web MediaRecorder:', error);
          setIsRecording(false);
          Alert.alert('Error', 'Failed to start recording. Please try again.');
        }
      } else {
        // Native platforms use expo-audio
        await audioRecorder.prepareToRecordAsync();
        await audioRecorder.record();
      }
    } catch (error: any) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      let recordingUri: string | null = null;
      
      // On web, use MediaRecorder
      if (Platform.OS === 'web') {
        if (webMediaRecorderRef.current && webMediaRecorderRef.current.state !== 'inactive') {
          webMediaRecorderRef.current.stop();
          
          // Stop all tracks
          if (webStreamRef.current) {
            webStreamRef.current.getTracks().forEach(track => track.stop());
            webStreamRef.current = null;
          }
          
          // Wait a bit for the blob URL to be created
          await new Promise(resolve => setTimeout(resolve, 100));
          recordingUri = recordingUriRef.current;
        }
      } else {
        // Native platforms use expo-audio
        await audioRecorder.stop();
        // Wait a bit for the URI to be available
        await new Promise(resolve => setTimeout(resolve, 300));
        recordingUri = audioRecorder.uri || null;
      }
      
      setIsRecording(false);

      if (!recordingUri) {
        Alert.alert('Error', 'No recording found. Please try again.');
        return;
      }

      // Show loading indicator
      setIsLoading(true);

      try {
        // Transcribe audio using Whisper API
        const result = await transcribeAudioForPDF(recordingUri, userId, 'en');
        
        // Clean up blob URL if it was created
        if (Platform.OS === 'web' && recordingUri.startsWith('blob:')) {
          URL.revokeObjectURL(recordingUri);
        }
        
        // Set the transcribed text to input
        if (result.transcript && result.transcript.trim()) {
          setInputText(result.transcript.trim());
        } else {
          Alert.alert('No Transcription', 'No speech was detected in the recording. Please try again.');
        }
      } catch (transcribeError: any) {
        console.error('Error transcribing audio:', transcribeError);
        Alert.alert(
          'Transcription Failed',
          transcribeError.message || 'Failed to transcribe audio. Please try again or type your question.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoading(false);
        // Clean up refs
        webMediaRecorderRef.current = null;
        webAudioChunksRef.current = [];
        recordingUriRef.current = null;
      }
    } catch (error: any) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
      setIsRecording(false);
      setIsLoading(false);
      
      // Clean up web resources
      if (Platform.OS === 'web') {
        if (webStreamRef.current) {
          webStreamRef.current.getTracks().forEach(track => track.stop());
          webStreamRef.current = null;
        }
        webMediaRecorderRef.current = null;
        webAudioChunksRef.current = [];
        recordingUriRef.current = null;
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoadingHistory) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
          <SkeletonList count={3} itemHeight={80} />
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Compact Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <TouchableOpacity
          onPress={() => setShowMenu(!showMenu)}
          style={styles.menuButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#6b7280" />
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
              <Text style={styles.menuItemText}>Clear history</Text>
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
            <View style={styles.emptyIconContainer}>
              <Ionicons name="chatbubbles-outline" size={32} color="#d1d5db" />
            </View>
            <Text style={styles.emptyStateTitle}>Start chatting</Text>
            <Text style={styles.emptyStateText}>
              Ask questions or select text from the PDF to get started
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
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Ionicons name="sparkles" size={12} color="#6B7C32" />
                  </View>
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                {message.role === 'assistant' ? (
                  <FormattedText
                    content={message.content}
                    textStyle={[
                      styles.messageText,
                      styles.assistantText,
                    ]}
                  />
                ) : (
                  <Text
                    style={[
                      styles.messageText,
                      styles.userText,
                    ]}
                  >
                    {message.content}
                  </Text>
                )}
                {message.pageReferences && message.pageReferences.length > 0 && (
                  <View style={styles.referencesContainer}>
                    <View style={styles.referencesList}>
                      {message.pageReferences.map((ref, idx) => (
                        <View key={idx} style={styles.referenceTag}>
                          <Text style={styles.referenceText}>{ref}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
              {message.role === 'user' && (
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatar, styles.userAvatar]}>
                    <Ionicons name="person" size={12} color="#ffffff" />
                  </View>
                </View>
              )}
            </View>
          ))
        )}

        {isLoading && (
          <View style={[styles.messageRow, styles.assistantRow]}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="sparkles" size={12} color="#6B7C32" />
              </View>
            </View>
            <View style={[styles.messageBubble, styles.assistantBubble, styles.loadingBubble]}>
              <ActivityIndicator size="small" color="#6B7C32" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Selected Text Indicator */}
      {selectedText && selectedText.trim().length > 0 ? (
        <View style={styles.selectedTextContainer}>
          <View style={styles.selectedTextHeader}>
            <View style={styles.selectedTextBadge}>
              <Ionicons name="text" size={12} color="#6B7C32" />
              <Text style={styles.selectedTextLabel}>Highlighted</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                onSelectedTextClear?.();
                setInputText('');
              }}
              style={styles.clearSelectionButton}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Ionicons name="close" size={14} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          <View style={styles.selectedTextContent}>
            <Text style={styles.selectedTextPreview} numberOfLines={2}>
              "{selectedText.substring(0, 120)}{selectedText.length > 120 ? '...' : ''}"
            </Text>
          </View>
          <Text style={styles.selectedTextHint}>
            💡 Your question will focus on this highlighted text
          </Text>
        </View>
      ) : null}

      {/* Screenshot Preview */}
      {screenshotUri && (
        <View style={styles.screenshotPreviewContainer}>
          <Image source={{ uri: screenshotUri }} style={styles.screenshotPreview} />
          <TouchableOpacity
            style={styles.removeScreenshotButton}
            onPress={handleRemoveScreenshot}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.screenshotLabel}>
            <Text style={styles.screenshotLabelText}>Page {currentPage}</Text>
          </View>
        </View>
      )}

      {/* Modern Input */}
      <View style={styles.inputWrapper}>
        <View style={styles.inputContainer}>
          {/* Screenshot Button */}
          {onCaptureScreenshot && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCaptureScreenshot}
              disabled={isLoading}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="camera"
                size={20}
                color={isLoading ? '#d1d5db' : '#6B7C32'}
              />
            </TouchableOpacity>
          )}
          
          {/* Mic Button */}
          <TouchableOpacity
            style={[styles.actionButton, isRecording && styles.actionButtonActive]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isRecording ? "stop-circle" : "mic"}
              size={20}
              color={isLoading ? '#d1d5db' : isRecording ? '#dc2626' : '#6B7C32'}
            />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Type your question..."
            placeholderTextColor="#9ca3af"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading && !isRecording}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading || isRecording}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="send"
              size={16}
              color={!inputText.trim() || isLoading || isRecording ? '#d1d5db' : '#ffffff'}
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
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.2,
  },
  menuButton: {
    padding: 4,
  },
  menu: {
    position: 'absolute',
    top: 44,
    right: 12,
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
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  menuItemText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  messageRow: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userAvatar: {
    backgroundColor: '#6B7C32',
    borderColor: '#6B7C32',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
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
  loadingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  userText: {
    color: '#ffffff',
  },
  assistantText: {
    color: '#111827',
  },
  referencesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  referencesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  referenceTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  referenceText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedTextContainer: {
    backgroundColor: '#f0fdf4',
    borderTopWidth: 1,
    borderTopColor: '#6B7C32',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  selectedTextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  selectedTextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6B7C32',
  },
  selectedTextLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7C32',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedTextContent: {
    marginBottom: 6,
  },
  selectedTextPreview: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  selectedTextHint: {
    fontSize: 11,
    color: '#6B7C32',
    fontStyle: 'italic',
  },
  clearSelectionButton: {
    padding: 4,
  },
  screenshotPreviewContainer: {
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
    position: 'relative',
  },
  screenshotPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    resizeMode: 'contain',
  },
  removeScreenshotButton: {
    position: 'absolute',
    top: 18,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenshotLabel: {
    position: 'absolute',
    bottom: 18,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  screenshotLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  inputWrapper: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    lineHeight: 20,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6B7C32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputHint: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
  },
  paragraph: {
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 4,
  },
  listNumber: {
    fontWeight: '600',
    marginRight: 8,
    minWidth: 20,
  },
  bullet: {
    marginRight: 8,
    marginLeft: 4,
  },
  listContent: {
    flex: 1,
  },
  boldText: {
    fontWeight: '600',
  },
});
