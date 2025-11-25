import AIAssistantFAB from '@/src/components/common/AIAssistantFAB';
import { useApp } from '@/src/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Import new components
import DragDropCalendar from '@/src/components/schedule/DragDropCalendar';
import ScheduleListView from '@/src/components/schedule/ScheduleListView';
import ScheduleSkeleton from '@/src/components/schedule/ScheduleSkeleton';
// Removed bottom-sheet upload modal to keep single flow via popover

// Import services
import googleCalendarService from '@/src/services/calendar/googleCalendarService';
import scheduleAIService, { ScheduleItem } from '@/src/services/schedule/scheduleAIService';
import scheduleStorageService, { UserSchedule } from '@/src/services/schedule/scheduleStorageService';

interface SchedulePageProps {}

const SchedulePage: React.FC<SchedulePageProps> = () => {
  const router = useRouter();
  const { userProfile, user } = useApp();
  
  // State management
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [userSchedules, setUserSchedules] = useState<UserSchedule[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  // Modal states (removed review modal - now using separate screen)
  
  // Popover states
  const [showPopover, setShowPopover] = useState(false);
  const [popoverAnimation] = useState(new Animated.Value(0));
  
  // Service instances
  const aiService = scheduleAIService;
  const storageService = scheduleStorageService;
  const calendarService = googleCalendarService;

  // Check if user has enrolled classes
  const hasEnrolledClasses = userProfile?.enrolledClasses && userProfile.enrolledClasses.length > 0;

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const initializeAndLoad = async () => {
      try {
        await initializeServices();
        await loadUserSchedules();
      } catch (error) {
        console.error('Initialization error:', error);
        // Even if initialization fails, stop loading
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    initializeAndLoad();
  }, [userProfile?.uid, isMounted]);

  const initializeServices = async () => {
    try {
      await calendarService.initialize();
    } catch (error) {
      console.error('Failed to initialize services:', error);
    }
  };

  const loadUserSchedules = async () => {
    const effectiveUserId = userProfile?.uid || user?.uid || 'guest';
    try {
      console.log('Starting to load schedules for user:', effectiveUserId);
      if (isMounted) {
        setIsLoading(true);
      }
      
      // Add a timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      
      const schedulesPromise = storageService.getUserSchedules(effectiveUserId);
      const schedules = await Promise.race([schedulesPromise, timeoutPromise]) as UserSchedule[];
      
      console.log('Loaded schedules:', schedules.length);
      if (isMounted) {
        setUserSchedules(schedules);
        
        // Flatten all schedule items from all schedules
        const allItems = schedules.flatMap((schedule: UserSchedule) => schedule.items);
        setScheduleItems(allItems);
        console.log('Set schedule items:', allItems.length);
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
      // In frontend-only mode, just fall back to empty state
      if (isMounted) {
        setUserSchedules([]);
        setScheduleItems([]);
      }
    } finally {
      console.log('Setting loading to false');
      if (isMounted) {
        setIsLoading(false);
      }
    }
  };

  const handleDateSelect = (date: Date | Date[] | { from: Date; to?: Date } | undefined) => {
    if (date instanceof Date) {
      setSelectedDate(date);
    }
  };

  const handleClassPress = (item: ScheduleItem) => {
    router.push({
      pathname: '/class/[id]',
      params: { 
        id: item.id,
        title: item.title,
        time: item.time,
        type: item.type,
        location: item.location || '',
        instructor: item.instructor || '',
      }
    });
  };

  const handleImageSelected = async (imageUri: string) => {
    try {
      setIsAnalyzing(true);
      setAnalysisProgress('Uploading image...');
      const userId = userProfile?.uid || user?.uid;
      if (!userId) {
        Alert.alert('Error', 'User ID not found. Please sign in again.');
        return;
      }
      
      // Update progress messages
      setTimeout(() => setAnalysisProgress('Analyzing schedule...'), 500);
      
      const result = await aiService.analyzeScheduleImage(imageUri, userId);
      
      setAnalysisProgress('Processing results...');
      
      // Navigate to schedule review screen with the analyzed items and scheduleId
      router.push({
        pathname: '/schedule-review',
        params: {
          items: JSON.stringify(result.items),
          scheduleId: result.scheduleId,
        },
      });
    } catch (error) {
      console.error('Failed to analyze image:', error);
      Alert.alert('Error', 'Failed to analyze your schedule image. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  const handleGoogleCalendarImport = async () => {
    console.log('Google Calendar import started');
    try {
      const isAuthenticated = await calendarService.isAuthenticated();
      console.log('Is authenticated:', isAuthenticated);
      
      if (!isAuthenticated) {
        console.log('Not authenticated, attempting sign in');
        const signedIn = await calendarService.signInWithFallback();
        console.log('Sign in result:', signedIn);
        if (!signedIn) {
          Alert.alert(
            'Google Calendar Setup Required', 
            'To sync with Google Calendar, you need to set up OAuth credentials. Please configure your Google Cloud project and OAuth client ID in the GoogleCalendarService.',
            [{ text: 'OK' }]
          );
          return;
        }
        // If sign-in was successful, the auth callback will handle the sync
        // So we can return here and let the callback do the work
        return;
      }

      // If already authenticated, proceed with sync
      setIsLoading(true);
      console.log('Already authenticated, syncing events from Google Calendar');
      
      // Import events from the next 30 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 30);
      
      // Sync directly from Google Calendar
      const syncedItems = await calendarService.syncFromGoogleCalendar(startDate, endDate);
      console.log('Synced items:', syncedItems.length);
      
      if (syncedItems.length === 0) {
        Alert.alert('No Events Found', 'No events found in your Google Calendar for the next 30 days.');
        return;
      }

      // Save synced items directly to user's schedule
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
        
        // Reload schedules to show the new synced data
        await loadUserSchedules();
        
        Alert.alert(
          '🎉 Sync Complete!', 
          `Successfully imported ${syncedItems.length} events from Google Calendar. Your schedule has been updated!`,
          [{ text: 'Great!', style: 'default' }]
        );
      } else {
        // User not authenticated - show demo mode message and display events temporarily
        Alert.alert(
          '🎉 Sync Complete!', 
          `Successfully imported ${syncedItems.length} events from your Google Calendar. Your schedule has been updated with your real calendar events!`,
          [{ text: 'Awesome!', style: 'default' }]
        );
        
        // For demo purposes, let's still show the events temporarily
        setScheduleItems(syncedItems);
        console.log('Demo: Set schedule items directly for unauthenticated user');
      }
      
      console.log('Google Calendar sync completed successfully');
    } catch (error) {
      console.error('Failed to sync from Google Calendar:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('permissions') || error.message.includes('PERMISSION_DENIED')) {
          Alert.alert(
            'Permission Error', 
            'Unable to access Google Calendar. Please check your permissions and try again.'
          );
        } else if (error.message.includes('network') || error.message.includes('NETWORK_ERROR')) {
          Alert.alert(
            'Network Error', 
            'Unable to connect to Google Calendar. Please check your internet connection and try again.'
          );
        } else if (error.message.includes('Not authenticated')) {
          Alert.alert(
            'Authentication Required', 
            'Please sign in to Google Calendar first. You may need to configure OAuth credentials.'
          );
        } else {
          Alert.alert('Error', 'Failed to sync from Google Calendar. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Failed to sync from Google Calendar. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };


  const handleItemMove = async (itemId: string, newTime: string, newDay: string) => {
    if (!userProfile?.uid) return;

    try {
      // Find the schedule containing this item
      const schedule = userSchedules.find(s => s.items.some(item => item.id === itemId));
      if (!schedule) return;

      // Update the item
      const updatedItems = schedule.items.map(item => 
        item.id === itemId 
          ? { ...item, time: newTime, day: newDay }
          : item
      );

      // Save the updated schedule
      await storageService.updateSchedule(schedule.id, userProfile.uid, { items: updatedItems });
      
      // Reload schedules
      await loadUserSchedules();
    } catch (error) {
      console.error('Failed to move item:', error);
      Alert.alert('Error', 'Failed to move schedule item. Please try again.');
    }
  };

  const handleItemEdit = (item: ScheduleItem) => {
    // Navigate to edit screen or show edit modal
    Alert.alert('Edit Item', `Edit "${item.title}"`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit', onPress: () => console.log('Edit item:', item) },
    ]);
  };

  const handleItemDelete = async (itemId: string) => {
    if (!userProfile?.uid) return;

    try {
      // Find and update the schedule containing this item
      const schedule = userSchedules.find(s => s.items.some(item => item.id === itemId));
      if (!schedule) return;

      const updatedItems = schedule.items.filter(item => item.id !== itemId);
      await storageService.updateSchedule(schedule.id, userProfile.uid, { items: updatedItems });
      
      // Reload schedules
      await loadUserSchedules();
    } catch (error) {
      console.error('Failed to delete item:', error);
      Alert.alert('Error', 'Failed to delete schedule item. Please try again.');
    }
  };

  const handleItemReorder = async (items: ScheduleItem[]) => {
    // Handle reordering logic
    console.log('Reorder items:', items);
  };

  // Popover handlers
  const showPopoverMenu = () => {
    setShowPopover(true);
    Animated.spring(popoverAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const hidePopoverMenu = () => {
    Animated.timing(popoverAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowPopover(false);
    });
  };

  const handleChooseFromGallery = async () => {
    hidePopoverMenu();
    try {
      // Request permission if needed
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

  const handleImportFromGoogle = () => {
    hidePopoverMenu();
    handleGoogleCalendarImport();
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      {/* Calendar Icon */}
      <View style={styles.calendarIconContainer}>
        <View style={styles.calendarIcon}>
          <View style={styles.calendarHeader} />
          <View style={styles.calendarGrid}>
            {Array.from({ length: 35 }, (_, i) => (
              <View key={i} style={styles.calendarDot} />
            ))}
          </View>
        </View>
      </View>

      {/* Headline */}
      <Text style={styles.emptyTitle}>No schedules yet.</Text>
    </View>
  );

  // Debug logging
  console.log('ScheduleScreen render:', { 
    isLoading, 
    scheduleItemsLength: scheduleItems.length, 
    userProfileUid: userProfile?.uid,
    userSchedulesLength: userSchedules.length 
  });

  // Show skeleton only if we're actively loading AND have a user profile
  if (isLoading && userProfile?.uid && scheduleItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Schedule</Text>
        </View>
        <ScheduleSkeleton type={viewMode} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        
        {scheduleItems.length > 0 && (
          <View style={styles.headerActions}>
            {/* View Toggle */}
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'calendar' && styles.toggleButtonActive]}
                onPress={() => setViewMode('calendar')}
              >
                <Ionicons 
                  name="calendar" 
                  size={16} 
                  color={viewMode === 'calendar' ? 'white' : '#000'} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
                onPress={() => setViewMode('list')}
              >
                <Ionicons 
                  name="list" 
                  size={16} 
                  color={viewMode === 'list' ? 'white' : '#000'} 
                />
              </TouchableOpacity>
            </View>
            
            {/* Add Button */}
            <TouchableOpacity 
              style={styles.headerAddButton}
              onPress={showPopover ? hidePopoverMenu : showPopoverMenu}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      {scheduleItems.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {viewMode === 'calendar' ? (
            <DragDropCalendar
              scheduleItems={scheduleItems}
              onItemMove={handleItemMove}
              onItemPress={handleClassPress}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          ) : (
            <ScheduleListView
              scheduleItems={scheduleItems}
              onItemPress={handleClassPress}
              onItemEdit={handleItemEdit}
              onItemDelete={handleItemDelete}
              onItemReorder={handleItemReorder}
            />
          )}
        </>
      )}

      {/* Analysis Loading Modal */}
      {isAnalyzing && (
        <Modal
          visible={isAnalyzing}
          transparent
          animationType="fade"
        >
          <View style={styles.analysisOverlay}>
            <View style={styles.analysisModal}>
              <ActivityIndicator size="large" color="#6B7C32" />
              <Text style={styles.analysisText}>
                {analysisProgress || 'Analyzing your schedule...'}
              </Text>
              <Text style={styles.analysisSubtext}>
                This may take a few seconds
              </Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Modals */}
      {/* AI Assistant FAB */}
      <AIAssistantFAB 
        scheduleData={{}} 
        userId={userProfile?.uid || user?.uid || 'guest'}
      />
    </View>
  );
};

export default SchedulePage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#000000',
  },
  headerAddButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  calendarIconContainer: {
    marginBottom: 40,
  },
  calendarIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarHeader: {
    width: 40,
    height: 8,
    backgroundColor: '#2d5a27',
    borderRadius: 4,
    marginBottom: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 40,
    height: 40,
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  calendarDot: {
    width: 4,
    height: 4,
    backgroundColor: '#2d5a27',
    borderRadius: 2,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 48,
    letterSpacing: -0.3,
  },
  buttonContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 200,
    shadowColor: '#2d5a27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  popoverContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  popover: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 280,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  popoverItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 16,
    letterSpacing: -0.2,
  },
  popoverSeparator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 20,
  },
  analysisOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  analysisText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    textAlign: 'center',
  },
  analysisSubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#4285f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
});