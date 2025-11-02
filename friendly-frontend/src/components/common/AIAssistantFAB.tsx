import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Assignment {
  id: string;
  title: string;
  date: Date;
  dateKey: string;
  time: string;
  type: string;
  location?: string;
  color: string;
}

interface Message {
  id: string;
  text?: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'assignments';
  assignments?: Assignment[];
}

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
}

const AIAssistantFAB: React.FC<AIAssistantFABProps> = ({ scheduleData, userData }) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I\'m your AI academic assistant. I can help you with your classes, assignments, schedule, and study questions. How can I assist you today?',
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const modalScaleAnim = useRef(new Animated.Value(0)).current;
  const modalTranslateAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fabRotateAnim = useRef(new Animated.Value(0)).current;
  const fabScaleAnim = useRef(new Animated.Value(1)).current;
  const typingAnim = useRef(new Animated.Value(0)).current;

  // Track mounted state and cleanup
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Pan responder for swipe down to close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return gestureState.dy > 20 && Math.abs(gestureState.dx) < 100;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          modalTranslateAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100) {
          closePanel();
        } else {
          Animated.spring(modalTranslateAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const openPanel = () => {
    setIsOpen(true);
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  const handleFABPress = () => {
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  };

  // Get all assignments from schedule data
  const getAllAssignments = () => {
    if (!scheduleData) return [];
    const assignments: any[] = [];
    const today = new Date();
    
    Object.keys(scheduleData).forEach(dateKey => {
      const items = scheduleData[dateKey];
      items.forEach((item: ScheduleItem) => {
        if (item.type === 'assignment' || item.type === 'exam') {
          const itemDate = new Date(dateKey);
          if (itemDate >= today) {
            assignments.push({
              ...item,
              date: itemDate,
              dateKey: dateKey,
            });
          }
        }
      });
    });
    
    return assignments.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Enhanced AI logic for academic assistance with schedule awareness
    const message = userMessage.toLowerCase();
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];
    
    // Get today's schedule if available
    const todaySchedule: ScheduleItem[] = scheduleData?.[todayKey] || [];
    const upcomingClasses = todaySchedule.filter((item: ScheduleItem) => item.type === 'class');
    const upcomingAssignments = todaySchedule.filter((item: ScheduleItem) => item.type === 'assignment');
    const upcomingExams = todaySchedule.filter((item: ScheduleItem) => item.type === 'exam');
    
    if (message.includes('today') || message.includes('now') || message.includes('current')) {
      if (todaySchedule.length === 0) {
        return `You have a free day today! This could be a great opportunity to:
        
• Catch up on reading or assignments
• Review notes from recent classes
• Work on upcoming projects
• Take a well-deserved break

Is there anything specific you'd like to work on today?`;
      }
      
      let response = `Here's what you have today:\n\n`;
      todaySchedule.forEach((item: ScheduleItem) => {
        response += `• ${item.title} (${item.time})\n`;
      });
      
      return response + `\nWould you like help preparing for any of these, or do you need study tips for a specific subject?`;
    }
    
    if (message.includes('schedule') || message.includes('class') || message.includes('when')) {
      return `I can see your academic schedule! You have classes in subjects like organic gardening, sustainable farming, and more. 

Would you like me to:
• Show you what's coming up this week
• Help you prepare for a specific class
• Create a study schedule around your class times
• Suggest the best times for homework based on your free periods?`;
    }
    
    if (message.includes('assignment') || message.includes('homework') || message.includes('due') || 
        message.includes('this week') || message.includes('upcoming')) {
      
      const allAssignments = getAllAssignments();
      const thisWeekAssignments = allAssignments.filter(a => {
        const daysUntil = Math.ceil((a.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 7;
      });
      
      if (thisWeekAssignments.length > 0) {
        // Return special response that will trigger card UI
        return 'SHOW_ASSIGNMENTS:' + JSON.stringify(thisWeekAssignments);
      }
      
      return `Great news! You don't have any assignments due this week.\n\nThis is a perfect time to:\n\n• Get ahead on reading\n• Review past material\n• Work on long-term projects\n• Take a well-deserved break\n\nWould you like to check next week's schedule?`;
    }
    
    if (message.includes('study') || message.includes('exam') || message.includes('test')) {
      if (upcomingExams.length > 0) {
        return `I see you have an exam coming up: ${upcomingExams[0].title}! Here's how I can help you prepare:

• Create a study schedule leading up to the exam
• Suggest active recall techniques for better retention
• Help you identify key topics to focus on
• Recommend study break intervals to avoid burnout

What subject is the exam on, and how much time do you have to prepare?`;
      }
      
      return `Great! I can help you create an effective study plan. Based on your class schedule, I recommend:

• **Active Learning**: Summarize concepts in your own words
• **Spaced Repetition**: Review material over multiple sessions
• **Practice Testing**: Quiz yourself regularly
• **Study Groups**: Collaborate with classmates

What subject would you like to focus on, and what's your learning style preference?`;
    }
    
    if (message.includes('time') || message.includes('manage') || message.includes('organize')) {
      return `Time management is crucial for academic success! Based on your schedule, here are personalized tips:

🕐 **Between Classes**: Use 15-30 min gaps for quick reviews
📚 **Study Blocks**: Schedule 2-3 hour focused sessions
⏰ **Peak Hours**: Identify when you're most alert for difficult subjects
🎯 **Task Batching**: Group similar activities together

Would you like me to help you create a weekly study schedule that works around your class times?`;
    }
    
    if (message.includes('stress') || message.includes('overwhelmed') || message.includes('anxiety')) {
      return `I understand academic stress can be overwhelming. Here are some strategies that can help:

🧘 **Mindfulness**: Take 5-minute breathing breaks between tasks
📋 **Organization**: Break big projects into smaller, manageable steps
💪 **Self-Care**: Maintain regular sleep, exercise, and nutrition
🎯 **Perspective**: Focus on progress, not perfection

Remember, it's okay to ask for help from professors or counseling services. What specific aspect is causing you the most stress right now?`;
    }
    
    if (message.includes('help') || message.includes('how') || message.includes('what can you')) {
      return `I'm your AI academic assistant! Here's how I can help you succeed:

📅 **Schedule Management**: Optimize your time around classes
📝 **Assignment Planning**: Break down projects and set deadlines  
📚 **Study Strategies**: Personalized learning techniques
🎯 **Goal Setting**: Academic planning and progress tracking
⏰ **Time Management**: Efficient scheduling and productivity tips
🧠 **Study Skills**: Memory techniques and exam preparation

I can see your actual class schedule and assignments to give you personalized advice. What would you like to work on first?`;
    }
    
    // Subject-specific help
    if (message.includes('garden') || message.includes('plant') || message.includes('organic')) {
      return `I see you're studying organic gardening! Here are some study tips for this hands-on subject:

🌱 **Practical Application**: Try to connect theory with actual gardening
📖 **Visual Learning**: Use diagrams for plant life cycles and soil composition
🔄 **Process Maps**: Create flowcharts for composting, planting schedules
📝 **Field Notes**: Keep detailed observations of plant growth

Would you like help creating study materials for a specific gardening topic, or do you have questions about an upcoming assignment?`;
    }
    
    return `That's a great question! I'm here to help with your academic success. I can assist with:

• **Study Planning**: Create personalized schedules around your classes
• **Assignment Management**: Break down projects and track deadlines
• **Learning Strategies**: Find the best study methods for your subjects
• **Time Management**: Optimize your schedule for maximum productivity

What specific academic challenge are you facing right now?`;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Start typing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(typingAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Simulate AI thinking delay
    timeoutRef.current = setTimeout(async () => {
      // Check if component is still mounted before updating state
      if (!isMounted) return;
      
      const aiResponse = await generateAIResponse(inputText);
      
      // Check if component is still mounted after async operation
      if (!isMounted) return;
      
      // Check if response is for assignments
      if (aiResponse.startsWith('SHOW_ASSIGNMENTS:')) {
        const assignmentsData = JSON.parse(aiResponse.replace('SHOW_ASSIGNMENTS:', ''));
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          isUser: false,
          timestamp: new Date(),
          type: 'assignments',
          assignments: assignmentsData,
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: aiResponse,
          isUser: false,
          timestamp: new Date(),
          type: 'text',
        };
        setMessages(prev => [...prev, aiMessage]);
      }
      
      setIsTyping(false);
      typingAnim.stopAnimation();
      typingAnim.setValue(0);
    }, 1000 + Math.random() * 1000);
  };

  const fabRotation = fabRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      {/* FAB Button */}
      <TouchableOpacity
        style={[styles.fab, styles.fabButton]}
        onPress={handleFABPress}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons 
          name={isOpen ? "close" : "chatbubbles"} 
          size={24} 
          color="#ffffff" 
        />
      </TouchableOpacity>

      {/* Modal Overlay */}
      {isOpen && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.overlayTouch}
            onPress={closePanel}
            activeOpacity={1}
          />
          
          {/* AI Chat Modal */}
          <View style={styles.chatModal}>
          <KeyboardAvoidingView
            style={styles.chatContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {/* Drag Handle */}
            <View style={styles.dragHandle} />
            
            {/* Header */}
            <View style={styles.chatHeader}>
              <View style={styles.headerContent}>
                <View style={styles.aiIndicator}>
                  <Ionicons name="sparkles" size={20} color="#6B7C32" />
                </View>
                <Text style={styles.headerTitle}>AI Assistant</Text>
                <Text style={styles.headerSubtitle}>Academic Helper</Text>
              </View>
              <TouchableOpacity onPress={closePanel} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              style={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messagesContent}
            >
              {messages.map((message) => {
                // Render assignments as cards
                if (message.type === 'assignments' && message.assignments) {
                  return (
                    <View key={message.id} style={styles.assignmentsResponse}>
                      <View style={styles.aiAvatarStandalone}>
                        <Ionicons name="sparkles" size={14} color="#6B7C32" />
                      </View>
                      <View style={styles.assignmentsContainer}>
                        <Text style={styles.assignmentsTitle}>Your Assignments This Week</Text>
                        {message.assignments.map((assignment: Assignment) => {
                          const assignmentDate = typeof assignment.date === 'string' ? new Date(assignment.date) : assignment.date;
                          const daysUntil = Math.ceil((assignmentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          const dateStr = assignmentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                          const isUrgent = daysUntil <= 2;
                          
                          return (
                            <TouchableOpacity
                              key={assignment.id}
                              style={[
                                styles.assignmentCard,
                                isUrgent && styles.assignmentCardUrgent
                              ]}
                              onPress={() => {
                                router.push({
                                  pathname: '/assignment/[id]',
                                  params: {
                                    id: assignment.id,
                                    title: assignment.title,
                                    date: assignment.dateKey,
                                    time: assignment.time,
                                    type: assignment.type,
                                    location: assignment.location || '',
                                    color: assignment.color,
                                  }
                                });
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.assignmentIndicator, { backgroundColor: assignment.color }]} />
                              <View style={styles.assignmentContent}>
                                <View style={styles.assignmentHeader}>
                                  <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                                  <View style={[
                                    styles.assignmentType,
                                    { backgroundColor: assignment.type === 'exam' ? '#fef2f2' : '#f0f9ff' }
                                  ]}>
                                    <Text style={[
                                      styles.assignmentTypeText,
                                      { color: assignment.type === 'exam' ? '#dc2626' : '#2563eb' }
                                    ]}>
                                      {assignment.type === 'exam' ? 'EXAM' : 'DUE'}
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.assignmentMeta}>
                                  <View style={styles.assignmentMetaItem}>
                                    <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                                    <Text style={styles.assignmentMetaText}>{dateStr}</Text>
                                  </View>
                                  <View style={styles.assignmentDot} />
                                  <View style={styles.assignmentMetaItem}>
                                    <Ionicons name="time-outline" size={14} color="#6b7280" />
                                    <Text style={styles.assignmentMetaText}>{assignment.time}</Text>
                                  </View>
                                </View>
                                <View style={[
                                  styles.daysChip,
                                  isUrgent && styles.daysChipUrgent
                                ]}>
                                  <Text style={[
                                    styles.daysChipText,
                                    isUrgent && styles.daysChipTextUrgent
                                  ]}>
                                    {daysUntil} day{daysUntil !== 1 ? 's' : ''} left
                                  </Text>
                                </View>
                              </View>
                              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                            </TouchableOpacity>
                          );
                        })}
                        <Text style={styles.assignmentsFooter}>
                          Tap on any assignment to see full details
                        </Text>
                      </View>
                    </View>
                  );
                }
                
                // Regular text message
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageContainer,
                      message.isUser ? styles.userMessage : styles.aiMessage,
                    ]}
                  >
                    {!message.isUser && (
                      <View style={styles.aiAvatar}>
                        <Ionicons name="sparkles" size={14} color="#6B7C32" />
                      </View>
                    )}
                    <View
                      style={[
                        styles.messageBubble,
                        message.isUser ? styles.userBubble : styles.aiBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          message.isUser ? styles.userText : styles.aiText,
                        ]}
                      >
                        {message.text}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Typing Indicator */}
              {isTyping && (
                <View style={[styles.messageContainer, styles.aiMessage]}>
                  <View style={styles.aiAvatar}>
                    <Ionicons name="sparkles" size={14} color="#6B7C32" />
                  </View>
                  <View style={[styles.messageBubble, styles.aiBubble]}>
                    <View style={styles.typingIndicator}>
                      <Animated.View style={[
                        styles.typingDot, 
                        styles.dot1,
                        {
                          opacity: typingAnim.interpolate({
                            inputRange: [0, 0.33, 0.66, 1],
                            outputRange: [0.3, 1, 0.3, 0.3],
                          }),
                        }
                      ]} />
                      <Animated.View style={[
                        styles.typingDot, 
                        styles.dot2,
                        {
                          opacity: typingAnim.interpolate({
                            inputRange: [0, 0.33, 0.66, 1],
                            outputRange: [0.3, 0.3, 1, 0.3],
                          }),
                        }
                      ]} />
                      <Animated.View style={[
                        styles.typingDot, 
                        styles.dot3,
                        {
                          opacity: typingAnim.interpolate({
                            inputRange: [0, 0.33, 0.66, 1],
                            outputRange: [0.3, 0.3, 0.3, 1],
                          }),
                        }
                      ]} />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask about your classes, assignments, or schedule..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  onPress={handleSendMessage}
                  style={[
                    styles.sendButton,
                    inputText.trim() ? styles.sendButtonActive : styles.sendButtonInactive,
                  ]}
                  disabled={!inputText.trim()}
                >
                  <Ionicons 
                    name="send" 
                    size={20} 
                    color={inputText.trim() ? "#ffffff" : "#9ca3af"} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // FAB Styles
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 9999,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6B7C32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal Overlay
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10000,
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Chat Modal
  chatModal: {
    width: '100%',
    height: screenHeight * 0.8,
    maxHeight: screenHeight * 0.9,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  chatContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  // Drag Handle
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },

  // Header
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  headerContent: {
    flex: 1,
  },
  aiIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Messages
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    maxHeight: screenHeight * 0.5,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#6B7C32',
    borderBottomRightRadius: 8,
  },
  aiBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#ffffff',
  },
  aiText: {
    color: '#1f2937',
  },

  // Typing Indicator
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9ca3af',
  },
  dot1: {
    animationDelay: '0ms',
  },
  dot2: {
    animationDelay: '150ms',
  },
  dot3: {
    animationDelay: '300ms',
  },

  // Input
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f9fafb',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    maxHeight: 80,
    paddingVertical: 8,
    paddingRight: 12,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#6B7C32',
  },
  sendButtonInactive: {
    backgroundColor: 'transparent',
  },
  // Assignment Card Styles
  assignmentsResponse: {
    marginBottom: 16,
    width: '100%',
  },
  aiAvatarStandalone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  assignmentsContainer: {
    width: '100%',
  },
  assignmentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  assignmentCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  assignmentCardUrgent: {
    borderColor: '#fecaca',
    backgroundColor: '#fffbfb',
  },
  assignmentIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  assignmentContent: {
    flex: 1,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  assignmentTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  assignmentType: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  assignmentTypeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  assignmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  assignmentMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignmentMetaText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  assignmentDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#d1d5db',
  },
  daysChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  daysChipUrgent: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  daysChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  daysChipTextUrgent: {
    color: '#dc2626',
  },
  assignmentsFooter: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
});

export default AIAssistantFAB;
