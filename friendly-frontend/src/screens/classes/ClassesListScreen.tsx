import EmptyState from '@/src/components/common/EmptyState';
import AIAssistantFAB from '@/src/components/common/AIAssistantFAB';
import SegmentedControl from '@/src/components/common/SegmentedControl';
import MonthCalendarView from '@/src/components/modules/classes/MonthCalendarView';
import InlineClassPreview from '@/src/components/modules/classes/InlineClassPreview';
import { useApp } from '@/src/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { ScheduleItem } from '@/src/services/schedule/scheduleAIService';
import scheduleAIService from '@/src/services/schedule/scheduleAIService';
import scheduleStorageService, { UserSchedule } from '@/src/services/schedule/scheduleStorageService';
import googleCalendarService from '@/src/services/calendar/googleCalendarService';
import { getLectures } from '@/src/services/lecture/lectureService';
import { Lecture } from '@/src/types/lecture.types';
import { useColorScheme } from '@/src/hooks/use-color-scheme';

interface ClassesPageProps {
  title: string;
  onBack: () => void;
}

const ClassesPage: React.FC<ClassesPageProps> = ({
  title,
  onBack,
}) => {
  const router = useRouter();
  const { userProfile, user } = useApp();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [classes, setClasses] = useState<ScheduleItem[]>([]);
  const [schedules, setSchedules] = useState<UserSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [showPopover, setShowPopover] = useState(false);
  const [popoverAnimation] = useState(new Animated.Value(0));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [monthFadeAnim] = useState(new Animated.Value(1));
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [viewModeAnim] = useState(new Animated.Value(0));
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [editMenuAnimation] = useState(new Animated.Value(0));

  const storageService = scheduleStorageService;
  const calendarService = googleCalendarService;
  const aiService = scheduleAIService;

  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayShort = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  // Helper function to parse day and time from description
  const parseDescription = (description: string): { day: string; time: string } => {
    let day = '';
    let time = '';
    
    // Parse format: "Day: Tuesday | Time: 03:00 PM"
    const dayMatch = description.match(/Day:\s*([^|]+)/i);
    const timeMatch = description.match(/Time:\s*([^|]+)/i);
    
    if (dayMatch) {
      day = dayMatch[1].trim();
    }
    
    if (timeMatch) {
      time = timeMatch[1].trim();
    }
    
    return { day, time };
  };

  // Convert Lecture to ScheduleItem format
  const lectureToScheduleItem = (lecture: Lecture): ScheduleItem => {
    const { day, time } = parseDescription(lecture.description || '');
    
    // Use tags as fallback for day if not found in description
    let finalDay = day;
    if (!finalDay && lecture.tags && lecture.tags.length > 0) {
      // Tags are lowercase (e.g., "tuesday"), convert to capitalized day name
      const tagDay = lecture.tags[0];
      finalDay = tagDay.charAt(0).toUpperCase() + tagDay.slice(1);
    }
    
    // Extract location from description if available (format: "Day: Tuesday | Time: 03:00 PM | Place: Room 101")
    const placeMatch = lecture.description?.match(/Place:\s*([^|]+)/i);
    const location = placeMatch ? placeMatch[1].trim() : undefined;
    
    return {
      id: lecture.id,
      title: lecture.title,
      time: time || 'TBD',
      day: finalDay || 'Unknown',
      location: location,
      type: 'class' as const,
      confidence: 1.0,
    };
  };

  // Load classes and schedules
  useEffect(() => {
    const loadData = async () => {
      const userId = userProfile?.uid || user?.uid;

      if (!userId || userId === 'guest') {
        setIsLoading(false);
        setClasses([]);
        setSchedules([]);
        return;
      }

      try {
        setIsLoading(true);
        
        // Load classes from lectures API
        const response = await getLectures({ userId });
        const scheduleItems: ScheduleItem[] = response.lectures.map(lecture => 
          lectureToScheduleItem(lecture)
        );
        setClasses(scheduleItems);
        
        // Load schedules
        const userSchedules = await storageService.getUserSchedules(userId);
        setSchedules(userSchedules || []);
      } catch (error: any) {
        // Check if it's a network error
        const isNetworkError = 
          error?.message?.includes('Network request failed') ||
          error?.message?.includes('Failed to fetch') ||
          error?.name === 'TypeError' ||
          error?.code === 'NETWORK_ERROR';
        
        if (isNetworkError) {
          console.warn('Network error - backend may not be running:', error?.message || error);
          // Still try to load local schedules even if API fails
          try {
            const userSchedules = await storageService.getUserSchedules(userId);
            setSchedules(userSchedules || []);
          } catch (storageError) {
            console.error('Failed to load local schedules:', storageError);
          }
        } else {
          console.error('Failed to load data:', error);
        }
        
        // Set empty classes on error (but keep any local schedules)
        setClasses([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userProfile?.uid, user?.uid]);

  const handleClassClick = (classItem: ScheduleItem) => {
    router.push({
      pathname: '/class/[id]',
      params: {
        id: classItem.id,
        title: classItem.title,
        time: classItem.time,
        type: 'class',
        location: classItem.location || '',
        day: classItem.day,
      },
    });
  };

  const showPopoverMenu = () => {
    setShowPopover(true);
    Animated.spring(popoverAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const hidePopoverMenu = () => {
    Animated.spring(popoverAnimation, {
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      setShowPopover(false);
    });
  };

  const handleImageSelected = async (imageUri: string) => {
    const userId = userProfile?.uid || user?.uid;
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please sign in again.');
      return;
    }
    
    // Navigate immediately to schedule review screen with loading state
    router.push({
      pathname: '/schedule-review',
      params: {
        isLoading: 'true',
        imageUri: imageUri,
        userId: userId,
      },
    });
    
    hidePopoverMenu();
  };

  const handleChooseFromGallery = async () => {
    try {
      const mediaPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!mediaPermission.granted) {
        const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!mediaResult.granted) {
          Alert.alert('Permission Required', 'Photo library access is required.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await handleImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleGoogleCalendarImport = async () => {
    hidePopoverMenu();
    try {
      const isAuthenticated = await calendarService.isAuthenticated();
      
      if (!isAuthenticated) {
        const signedIn = await calendarService.signInWithFallback();
        if (!signedIn) {
          Alert.alert(
            'Google Calendar Setup Required', 
            'To sync with Google Calendar, you need to set up OAuth credentials.',
            [{ text: 'OK' }]
          );
          return;
        }
        return;
      }

      setIsLoading(true);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 30);
      
      const syncedItems = await calendarService.syncFromGoogleCalendar(startDate, endDate);
      
      if (syncedItems.length === 0) {
        Alert.alert('No Events Found', 'No events found in your Google Calendar for the next 30 days.');
        return;
      }

      if (userProfile?.uid) {
        const newSchedule: Omit<UserSchedule, 'id' | 'createdAt' | 'updatedAt'> = {
          userId: userProfile.uid,
          title: `Google Calendar Sync - ${new Date().toLocaleDateString()}`,
          description: `Synced ${syncedItems.length} events from Google Calendar`,
          items: syncedItems,
          syncSettings: {
            enabled: true,
            syncDirection: 'import',
            calendarId: 'primary',
            lastSyncTime: new Date(),
          },
          isActive: true,
        };

        await storageService.saveSchedule(userProfile.uid, newSchedule);
        
        Alert.alert(
          '🎉 Sync Complete!', 
          `Successfully imported ${syncedItems.length} events from Google Calendar.`,
          [{ text: 'Great!' }]
        );
        
        // Reload data
        const userSchedules = await storageService.getUserSchedules(userProfile.uid);
        setSchedules(userSchedules || []);
      }
    } catch (error) {
      console.error('Failed to sync from Google Calendar:', error);
      Alert.alert('Error', 'Failed to sync from Google Calendar. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const changeWeek = (direction: number) => {
    // Fade out
    Animated.timing(monthFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      const newWeekStart = new Date(weekStart);
      newWeekStart.setDate(weekStart.getDate() + (direction * 7));
      setWeekStart(newWeekStart);
      // Fade in
      Animated.timing(monthFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const getMonthYear = () => {
    return selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const getClassesForDate = (date: Date) => {
    const dayName = weekdayNames[date.getDay()];
    return classes.filter(c => c.day === dayName);
  };

  const hasClassesOnDate = (date: Date) => {
    return getClassesForDate(date).length > 0;
  };

  const selectedDayClasses = getClassesForDate(selectedDate);
  const selectedDayName = weekdayNames[selectedDate.getDay()];
  const weekDays = getWeekDays();

  // Per-Class Color Identity System - Reordered for better visual distinction
  const classColorPalette = [
    { tint: '#E6EEF9', accent: '#2B59D1', accentRgba: 'rgba(43, 89, 209, 0.12)' }, // Blue
    { tint: '#F4E9F8', accent: '#9A3CA5', accentRgba: 'rgba(154, 60, 165, 0.12)' }, // Purple
    { tint: '#F9E6E6', accent: '#C33A3A', accentRgba: 'rgba(195, 58, 58, 0.12)' }, // Red
    { tint: '#FCEFE5', accent: '#CD6A28', accentRgba: 'rgba(205, 106, 40, 0.12)' }, // Orange
    { tint: '#FCE7F0', accent: '#D93A73', accentRgba: 'rgba(217, 58, 115, 0.12)' }, // Pink
    { tint: '#E4F2F2', accent: '#167A7A', accentRgba: 'rgba(22, 122, 122, 0.12)' }, // Teal
    { tint: '#E6F4EA', accent: '#2C6E42', accentRgba: 'rgba(44, 110, 66, 0.12)' }, // Mint Green
    { tint: '#ECE9FA', accent: '#5A3EC8', accentRgba: 'rgba(90, 62, 200, 0.12)' }, // Indigo
    { tint: '#FFF6D7', accent: '#D4A11F', accentRgba: 'rgba(212, 161, 31, 0.12)' }, // Yellow
    { tint: '#E7F2ED', accent: '#1F5D43', accentRgba: 'rgba(31, 93, 67, 0.12)' }, // Emerald
  ];

  // Generate a stable color index based on class ID/title
  const getClassColorIndex = (classItem: ScheduleItem): number => {
    // Use class ID if available, otherwise use title
    const identifier = (classItem.id || classItem.title || '').toString();
    // Improved hash function for better distribution
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash | 0; // Convert to 32-bit integer
    }
    // Return positive index with better distribution
    return Math.abs(hash) % classColorPalette.length;
  };

  const getClassColorIdentity = (classItem: ScheduleItem) => {
    const index = getClassColorIndex(classItem);
    return classColorPalette[index];
  };

  const ClassCard = ({ classItem, index }: { classItem: ScheduleItem; index: number }) => {
    const colorIdentity = getClassColorIdentity(classItem);
    
    return (
      <TouchableOpacity
        style={[styles.classCard, isDark && styles.classCardDark]}
        onPress={() => handleClassClick(classItem)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${classItem.title} class at ${classItem.time}`}
      >
        <View style={[styles.classIcon, { backgroundColor: colorIdentity.tint }]}>
          <Ionicons name="school" size={20} color={colorIdentity.accent} />
        </View>
        <View style={styles.classInfo}>
          <View style={styles.classHeader}>
            <Text style={[styles.className, isDark && styles.classNameDark]} numberOfLines={1}>
              {classItem.title}
            </Text>
            <View style={[
              styles.classBadge,
              {
                backgroundColor: colorIdentity.tint,
                borderColor: colorIdentity.accentRgba,
              }
            ]}>
              <Text style={[styles.classBadgeText, { color: colorIdentity.accent }]}>
                CLASS
              </Text>
            </View>
          </View>
          <Text style={[styles.classTime, isDark && styles.classTimeDark]}>{classItem.time}</Text>
          {classItem.location && (
            <View style={styles.classDetailRow}>
              <Ionicons name="location-outline" size={14} color={isDark ? '#A8A8A8' : '#8A8A8A'} />
              <Text style={[styles.classDetailText, isDark && styles.classDetailTextDark]}>
                {classItem.location}
              </Text>
            </View>
          )}
          {classItem.instructor && (
            <View style={styles.classDetailRow}>
              <Ionicons name="person-outline" size={14} color={isDark ? '#A8A8A8' : '#8A8A8A'} />
              <Text style={[styles.classDetailText, isDark && styles.classDetailTextDark]}>
                {classItem.instructor}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleViewModeChange = (index: number) => {
    const newMode = index === 0 ? 'list' : 'calendar';
    if (newMode === viewMode) return;

    // Animate view mode transition
    Animated.timing(viewModeAnim, {
      toValue: newMode === 'calendar' ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setViewMode(newMode);
  };

  // Edit menu handlers
  const showEditMenuHandler = () => {
    setShowEditMenu(true);
    Animated.spring(editMenuAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const hideEditMenu = () => {
    Animated.timing(editMenuAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowEditMenu(false);
    });
  };

  const handleCreateSchedule = () => {
    hideEditMenu();
    showPopoverMenu();
  };

  const handleEditSchedule = async () => {
    hideEditMenu();
    const userId = userProfile?.uid || user?.uid;
    if (!userId) return;

    const activeSchedule = schedules.find(s => s.isActive) || schedules[0];
    if (!activeSchedule) {
      Alert.alert('No Schedule', 'No schedule found to edit. Please create a schedule first.');
      return;
    }

    try {
      router.push({
        pathname: '/schedule-review',
        params: {
          scheduleId: activeSchedule.id,
          userId: userId,
        },
      });
    } catch (error) {
      console.error('Failed to navigate to schedule review:', error);
      Alert.alert('Error', 'Failed to open schedule editor.');
    }
  };

  const handleDeleteSchedule = async () => {
    hideEditMenu();
    const userId = userProfile?.uid || user?.uid;
    if (!userId) return;

    const activeSchedule = schedules.find(s => s.isActive) || schedules[0];
    if (!activeSchedule) {
      Alert.alert('No Schedule', 'No schedule found to delete.');
      return;
    }

    Alert.alert(
      'Delete Schedule',
      `Are you sure you want to delete "${activeSchedule.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageService.deleteSchedule(activeSchedule.id, userId);
              // Reload schedules
              const updatedSchedules = await storageService.getUserSchedules(userId);
              setSchedules(updatedSchedules || []);
              // Reload classes
              const response = await getLectures({ userId });
              const scheduleItems: ScheduleItem[] = response.lectures.map(lecture => 
                lectureToScheduleItem(lecture)
              );
              setClasses(scheduleItems);
              Alert.alert('Success', 'Schedule deleted successfully.');
            } catch (error) {
              console.error('Failed to delete schedule:', error);
              Alert.alert('Error', 'Failed to delete schedule. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, isDark && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>Classes</Text>
          <TouchableOpacity
            onPress={showEditMenu ? hideEditMenu : showEditMenuHandler}
            style={styles.editButton}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="create-outline" 
              size={24} 
              color={isDark ? '#FFFFFF' : '#000000'} 
            />
          </TouchableOpacity>
        </View>

        {/* Edit Menu Modal */}
        {showEditMenu && (
          <View style={styles.editMenuOverlay} onTouchEnd={hideEditMenu}>
            <Animated.View
              style={[
                styles.editMenuContainer,
                {
                  opacity: editMenuAnimation,
                  transform: [
                    {
                      scale: editMenuAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                    {
                      translateY: editMenuAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.editMenu, isDark && styles.editMenuDark]}>
                <TouchableOpacity
                  style={[styles.editMenuItem, isDark && styles.editMenuItemDark]}
                  onPress={handleCreateSchedule}
                >
                  <Ionicons name="add-circle-outline" size={22} color={isDark ? '#FFFFFF' : '#000000'} />
                  <Text style={[styles.editMenuItemText, isDark && styles.editMenuItemTextDark]}>
                    Create New Schedule
                  </Text>
                </TouchableOpacity>

                {schedules.length > 0 && (
                  <>
                    <View style={[styles.editMenuSeparator, isDark && styles.editMenuSeparatorDark]} />
                    <TouchableOpacity
                      style={[styles.editMenuItem, isDark && styles.editMenuItemDark]}
                      onPress={handleEditSchedule}
                    >
                      <Ionicons name="pencil-outline" size={22} color={isDark ? '#FFFFFF' : '#000000'} />
                      <Text style={[styles.editMenuItemText, isDark && styles.editMenuItemTextDark]}>
                        Edit Current Schedule
                      </Text>
                    </TouchableOpacity>

                    <View style={[styles.editMenuSeparator, isDark && styles.editMenuSeparatorDark]} />
                    <TouchableOpacity
                      style={[styles.editMenuItem, styles.editMenuItemDanger, isDark && styles.editMenuItemDark]}
                      onPress={handleDeleteSchedule}
                    >
                      <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                      <Text style={[styles.editMenuItemText, styles.editMenuItemTextDanger]}>
                        Delete Schedule
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </Animated.View>
          </View>
        )}

        {/* Segmented Control */}
        {!isLoading && (classes.length > 0 || schedules.length > 0) && (
          <View style={[styles.segmentedControlContainer, isDark && styles.segmentedControlContainerDark]}>
            <SegmentedControl
              options={['List', 'Calendar']}
              selectedIndex={viewMode === 'list' ? 0 : 1}
              onSelect={handleViewModeChange}
            />
          </View>
        )}

        {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading classes...</Text>
        </View>
      ) : classes.length === 0 && schedules.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyState}>
            <View style={styles.iconContainer}>
              <Ionicons name="book-outline" size={48} color="#4a4a4a" />
            </View>
            <Text style={styles.emptyTitle}>No classes enrolled yet</Text>
            <Text style={styles.emptySubtitle}>Add a schedule to see your enrolled classes here.</Text>
            
            {/* Add Schedule Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={showPopover ? hidePopoverMenu : showPopoverMenu}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addButtonText}>Add Schedule</Text>
              </TouchableOpacity>

              {/* Floating Popover Menu */}
              {showPopover && (
                <Animated.View 
                  style={[
                    styles.popoverContainer,
                    {
                      opacity: popoverAnimation,
                      transform: [
                        {
                          scale: popoverAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                        {
                          translateY: popoverAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.popover}>
                    <TouchableOpacity 
                      style={styles.popoverItem}
                      onPress={handleChooseFromGallery}
                    >
                      <Ionicons name="images" size={20} color="#2d5a27" />
                      <Text style={styles.popoverItemText}>Choose from Gallery</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.popoverSeparator} />
                    
                    <TouchableOpacity 
                      style={styles.popoverItem}
                      onPress={handleGoogleCalendarImport}
                    >
                      <View style={styles.googleIconContainer}>
                        <Ionicons name="calendar" size={12} color="#ffffff" />
                      </View>
                      <Text style={styles.popoverItemText}>Sync from Google Calendar</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
            </View>
          </View>
        </View>
      ) : (
        <>
          {viewMode === 'list' ? (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Calendar Week View */}
              <View style={[styles.calendarContainer, isDark && styles.calendarContainerDark]}>
                {/* Month/Year with Navigation */}
                <View style={styles.monthHeader}>
                  <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.navButton}>
                    <Ionicons name="chevron-back" size={18} color={isDark ? '#A8A8A8' : '#000'} />
                  </TouchableOpacity>
                  <Animated.View style={{ opacity: monthFadeAnim }}>
                    <Text style={[styles.monthTitle, isDark && styles.monthTitleDark]}>{getMonthYear()}</Text>
                  </Animated.View>
                  <TouchableOpacity onPress={() => changeWeek(1)} style={styles.navButton}>
                    <Ionicons name="chevron-forward" size={18} color={isDark ? '#A8A8A8' : '#000'} />
                  </TouchableOpacity>
                </View>

                {/* Week Days */}
                <View style={styles.weekRow}>
                  {weekDays.map((date, index) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const hasClasses = hasClassesOnDate(date);
                    return (
                      <TouchableOpacity
                        key={`week-${index}`}
                        style={styles.dayContainer}
                        onPress={() => {
                          if (!isSelected) {
                            setSelectedDate(date);
                          }
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`${weekdayShort[date.getDay()]} ${date.getDate()}`}
                      >
                        <Text style={[styles.dayLabel, isDark && styles.dayLabelDark]}>
                          {weekdayShort[date.getDay()]}
                        </Text>
                        <View style={[
                          styles.dayCircle,
                          isSelected && styles.dayCircleSelected,
                          isSelected && isDark && styles.dayCircleSelectedDark,
                        ]}>
                          <Text style={[
                            styles.dayNumber,
                            isSelected && styles.dayNumberSelected,
                            isSelected && isDark && styles.dayNumberSelectedDark,
                            isDark && !isSelected && styles.dayNumberDark,
                          ]}>
                            {date.getDate()}
                          </Text>
                        </View>
                        {hasClasses && (
                          <View style={styles.dotsContainer}>
                            {getClassesForDate(date).slice(0, 3).map((classItem, i) => {
                              const colorIdentity = getClassColorIdentity(classItem);
                              const dotColor = isDark ? `${colorIdentity.accent}CC` : colorIdentity.accent;
                              return (
                                <View
                                  key={classItem.id}
                                  style={[
                                    styles.dot,
                                    { backgroundColor: dotColor },
                                    i > 0 && styles.dotSpacing,
                                  ]}
                                />
                              );
                            })}
                            {getClassesForDate(date).length > 3 && (
                              <Text style={[styles.overflowIndicator, isDark && styles.overflowIndicatorDark]}>
                                ...
                              </Text>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Selected Date Classes */}
              {selectedDayClasses.length > 0 ? (
                <View style={styles.classesSection}>
                  <View style={styles.dateHeaderContainer}>
                    <Text style={[styles.dateHeader, isDark && styles.dateHeaderDark]}>
                      {selectedDayName}, {selectedDate.toLocaleDateString('default', { month: 'long', day: 'numeric' })}
                    </Text>
                    <View style={[styles.dateUnderline, isDark && styles.dateUnderlineDark]} />
                  </View>
                  <View style={styles.classList}>
                    {selectedDayClasses.map((classItem, index) => (
                      <ClassCard key={classItem.id} classItem={classItem} index={index} />
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyDateContainer}>
                  <Ionicons name="calendar-outline" size={48} color={isDark ? '#4A4A4A' : '#ccc'} />
                  <Text style={[styles.emptyDateText, isDark && styles.emptyDateTextDark]}>
                    No classes on this day
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <ScrollView 
              style={styles.calendarModeContainer}
              contentContainerStyle={styles.calendarScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <MonthCalendarView
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                classes={classes}
                getClassColorIdentity={getClassColorIdentity}
              />
              <InlineClassPreview
                selectedDate={selectedDate}
                classes={classes}
                onClassPress={handleClassClick}
                getClassColorIdentity={getClassColorIdentity}
              />
            </ScrollView>
          )}

          {/* AI Assistant FAB */}
          <AIAssistantFAB 
            scheduleData={{}} 
            userId={userProfile?.uid || user?.uid || 'guest'}
          />
        </>
      )}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#0C0C0C',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  headerDark: {
    backgroundColor: '#0C0C0C',
    borderBottomColor: '#1E1E1E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.5,
    flex: 1,
  },
  headerTitleDark: {
    color: '#ECEDEE',
  },
  editButton: {
    padding: 8,
    marginLeft: 12,
  },
  editMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
  editMenuContainer: {
    position: 'absolute',
    top: 100,
    right: 20,
    zIndex: 1001,
  },
  editMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  editMenuDark: {
    backgroundColor: '#1E1E1E',
  },
  editMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  editMenuItemDark: {
    backgroundColor: 'transparent',
  },
  editMenuItemDanger: {
    // Keep danger styling separate
  },
  editMenuItemText: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
    fontWeight: '500',
  },
  editMenuItemTextDark: {
    color: '#ECEDEE',
  },
  editMenuItemTextDanger: {
    color: '#FF3B30',
  },
  editMenuSeparator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  editMenuSeparatorDark: {
    backgroundColor: '#2E2E2E',
  },
  segmentedControlContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  segmentedControlContainerDark: {
    backgroundColor: '#0C0C0C',
    borderBottomColor: '#1E1E1E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
  },
  content: {
    flex: 1,
  },
  calendarContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  calendarContainerDark: {
    backgroundColor: '#0C0C0C',
  },
  calendarModeContainer: {
    flex: 1,
  },
  calendarScrollContent: {
    paddingBottom: 100,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    padding: 6,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000',
    letterSpacing: -0.3,
  },
  monthTitleDark: {
    color: '#ECEDEE',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
    marginBottom: 8,
  },
  dayLabelDark: {
    color: '#A8A8A8',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayCircleSelected: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1.5,
    borderColor: '#2C6E42',
    shadowColor: '#2C6E42',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  dayCircleSelectedDark: {
    backgroundColor: 'rgba(31, 93, 67, 0.2)',
    borderColor: '#6EF2B6',
    shadowColor: '#6EF2B6',
    shadowOpacity: 0.3,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  dayNumberDark: {
    color: '#ECEDEE',
  },
  dayNumberSelected: {
    color: '#1F5D43',
    fontWeight: '600',
  },
  dayNumberSelectedDark: {
    color: '#6EF2B6',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotSpacing: {
    marginLeft: 0,
  },
  overflowIndicator: {
    fontSize: 10,
    color: '#9A9A9A',
    marginLeft: 2,
  },
  overflowIndicatorDark: {
    color: '#A8A8A8',
  },
  classesSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
  },
  dateHeaderContainer: {
    marginBottom: 16,
    paddingVertical: 12,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  dateHeaderDark: {
    color: '#ECEDEE',
  },
  dateUnderline: {
    width: 36,
    height: 2,
    backgroundColor: '#2C6E42',
    borderRadius: 1,
  },
  dateUnderlineDark: {
    backgroundColor: '#6EF2B6',
  },
  classList: {
    gap: 16,
  },
  classCard: {
    flexDirection: 'row',
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  classCardDark: {
    backgroundColor: '#161616',
    shadowOpacity: 0.2,
  },
  classIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  classInfo: {
    flex: 1,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  className: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111111',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
  },
  classNameDark: {
    color: '#ECEDEE',
  },
  classBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  classTime: {
    fontSize: 14,
    color: '#5F5F5F',
    marginBottom: 4,
    fontWeight: '400',
  },
  classTimeDark: {
    color: '#A8A8A8',
  },
  classDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  classDetailText: {
    fontSize: 13,
    color: '#8A8A8A',
    marginLeft: 4,
    fontWeight: '400',
  },
  classDetailTextDark: {
    color: '#A8A8A8',
  },
  emptyDateContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyDateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  emptyDateTextDark: {
    color: '#A8A8A8',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6b8e4e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyState: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#426b1f',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  popoverContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    width: '100%',
  },
  popover: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  popoverItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    letterSpacing: -0.2,
  },
  popoverSeparator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 20,
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#4285f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Removed fab style as it's now handled by AIAssistantFAB component
});

export default ClassesPage;
