import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform
} from 'react-native';
import scheduleAIService, { ScheduleItem } from '@/src/services/schedule/scheduleAIService';
import scheduleStorageService, { UserSchedule } from '@/src/services/schedule/scheduleStorageService';
import DateTimePicker from '@react-native-community/datetimepicker';

interface EditedScheduleItem extends ScheduleItem {
  startDate?: Date;
  endDate?: Date;
  recurrence?: string;
  reminder?: string;
}

interface ScheduleReviewScreenProps {
  initialItems: ScheduleItem[];
  scheduleId?: string | null;
  userId: string;
  userProfile?: any;
  onBack: () => void;
  onSaveSuccess: () => void;
}

export default function ScheduleReviewScreen({
  initialItems,
  scheduleId,
  userId,
  userProfile,
  onBack,
  onSaveSuccess,
}: ScheduleReviewScreenProps) {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EditedScheduleItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [timePickerField, setTimePickerField] = useState<'start' | 'end'>('start');
  const timeScrollRef = useRef<ScrollView>(null);
  const daysScrollRef = useRef<ScrollView>(null);

  // Week frame: start from Monday of the current week
  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay(); // 0 Sun - 6 Sat
    const diff = (day === 0 ? -6 : 1) - day; // move to Monday
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const [weekStartDate, setWeekStartDate] = useState<Date>(getStartOfWeek(new Date()));

  const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const weekdayShort = ['S','M','T','W','T','F','S'];
  const weekdaysMonToFri = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const getDateForDay = (day: string): Date => {
    const idx = weekdaysMonToFri.indexOf(day);
    const date = new Date(weekStartDate);
    date.setDate(weekStartDate.getDate() + (idx >= 0 ? idx : 0));
    return date;
  };

  // Parse time string to Date object pinned to current week (Mon-Fri)
  const parseTimeToDate = (timeStr: string, day: string, isStart: boolean = true): Date => {
    const date = getDateForDay(day);
    
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const period = timeMatch[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      date.setHours(hours, minutes, 0, 0);
    }
    return date;
  };

  // Format date to time string
  const formatDateToTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Format date to readable string
  const formatDateToString = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const handleItemPress = (item: ScheduleItem) => {
    const startTime = item.startTime || item.time.split(' - ')[0];
    const endTime = item.endTime || item.time.split(' - ')[1] || item.time.split(' - ')[0];
    
    const startDate = item.startTime 
      ? parseTimeToDate(startTime, item.day, true)
      : parseTimeToDate(item.time.split(' - ')[0], item.day, true);
    
    const endDate = item.endTime || item.time.includes(' - ')
      ? parseTimeToDate(endTime || item.time.split(' - ')[0], item.day, false)
      : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour

    setSelectedItem({
      ...item,
      startDate,
      endDate,
      recurrence: 'Never',
      reminder: '10 minutes before'
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!selectedItem) return;

    const updatedItems = scheduleItems.map(item => {
      if (item.id !== selectedItem.id) return item;
      const newDay = weekdaysMonToFri[(selectedItem.startDate!.getDay() + 6) % 7] || 'Monday';
      return {
        ...item,
        title: selectedItem.title,
        time: `${formatDateToTime(selectedItem.startDate!)} - ${formatDateToTime(selectedItem.endDate!)}`,
        startTime: `${selectedItem.startDate!.getHours().toString().padStart(2,'0')}:${selectedItem.startDate!.getMinutes().toString().padStart(2,'0')}`,
        endTime: `${selectedItem.endDate!.getHours().toString().padStart(2,'0')}:${selectedItem.endDate!.getMinutes().toString().padStart(2,'0')}`,
        location: selectedItem.location || item.location,
        day: newDay,
      };
    });

    setScheduleItems(updatedItems);
    setShowEditModal(false);
    setSelectedItem(null);
  };

  const handleSave = async () => {
    if (scheduleItems.length === 0) {
      Alert.alert('Error', 'No schedule items to save.');
      return;
    }

    if (!scheduleId) {
      Alert.alert('Error', 'Schedule ID is missing. Please try analyzing the image again.');
      return;
    }

    try {
      setIsSaving(true);
      
      // Call the confirm schedule API
      const result = await scheduleAIService.confirmSchedule(scheduleId, userId);
      
      Alert.alert(
        'Success', 
        `Schedule confirmed successfully! ${result.count} lecture(s) created.`, 
        [
          {
            text: 'OK',
            onPress: onSaveSuccess
          }
        ]
      );
    } catch (error) {
      console.error('Failed to confirm schedule:', error);
      
      // Check for network errors
      const isNetworkError = error instanceof TypeError && 
        (error.message.includes('Network request failed') || 
         error.message.includes('Failed to fetch') ||
         error.message.includes('fetch'));
      
      if (isNetworkError) {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the server. Please make sure:\n\n' +
          '1. The backend server is running\n' +
          '2. You have an active internet connection\n' +
          '3. The API URL is configured correctly',
          [{ text: 'OK' }]
        );
      } else if (error instanceof Error && error.message.includes('not found')) {
        Alert.alert(
          'Schedule Not Found', 
          'The schedule could not be found. Please try analyzing the image again.'
        );
      } else {
        Alert.alert(
          'Error', 
          error instanceof Error 
            ? `Failed to confirm schedule: ${error.message}` 
            : 'Failed to confirm schedule. Please try again.'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Generate time slots (7 AM to 10 PM)
  const timeSlots: string[] = [];
  for (let hour = 7; hour <= 22; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 22) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  // Days of the week (Mon–Fri)
  const days = weekdaysMonToFri;

  // Calculate position and height for event blocks
  const getEventPosition = (item: ScheduleItem): { top: number; height: number } => {
    const startTime = item.startTime || item.time.split(' - ')[0].trim();
    const endTime = item.endTime || item.time.split(' - ')[1]?.trim() || startTime;
    
    const timeMatch = startTime.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return { top: 0, height: 60 };
    
    let startHour = parseInt(timeMatch[1]);
    let startMin = parseInt(timeMatch[2]);
    const isStartPM = startTime.toUpperCase().includes('PM');
    if (isStartPM && startHour !== 12) startHour += 12;
    if (!isStartPM && startHour === 12) startHour = 0;
    
    const endTimeMatch = endTime.match(/(\d{1,2}):(\d{2})/);
    if (!endTimeMatch) return { top: (startHour - 7) * 60 + startMin, height: 60 };
    
    let endHour = parseInt(endTimeMatch[1]);
    let endMin = parseInt(endTimeMatch[2]);
    const isEndPM = endTime.toUpperCase().includes('PM');
    if (isEndPM && endHour !== 12) endHour += 12;
    if (!isEndPM && endHour === 12) endHour = 0;
    
    const top = (startHour - 7) * 60 + startMin;
    const height = (endHour - startHour) * 60 + (endMin - startMin);
    
    return { top, height: Math.max(height, 60) };
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarWrapper}>
        {/* Time column - fixed on left */}
        <View style={styles.timeColumn}>
          <View style={styles.timeHeader} />
          <ScrollView 
            ref={timeScrollRef}
            style={styles.timeScroll}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
            onScroll={(event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              if (daysScrollRef.current) {
                daysScrollRef.current.scrollTo({ y: offsetY, animated: false });
              }
            }}
          >
            {timeSlots.map((time, index) => (
              <View key={index} style={styles.timeSlot}>
                {index % 2 === 0 && (
                  <Text style={styles.timeLabel}>
                    {(() => {
                      const [hour, min] = time.split(':').map(Number);
                      const period = hour >= 12 ? 'PM' : 'AM';
                      const displayHour = hour % 12 || 12;
                      return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
                    })()}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Days section - scrolls horizontally and vertically */}
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          nestedScrollEnabled={true}
        >
          <View style={styles.calendarContainer}>
            {/* Day headers - fixed at top within horizontal scroll */}
            <View style={styles.dayHeaders}>
              {days.map((day, idx) => {
                const dayItems = scheduleItems.filter(item => item.day === day);
                const headerDate = new Date(weekStartDate);
                headerDate.setDate(weekStartDate.getDate() + idx);
                return (
                  <View key={day} style={styles.dayHeader}>
                    <Text style={styles.dayAbbrev}>{day.slice(0, 1)}</Text>
                    <Text style={styles.dayNumber}>
                      {headerDate.getDate()}
                    </Text>
                    {dayItems.length > 0 && (
                      <View style={styles.dayIndicator} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Day columns with events - scrolls vertically */}
            <ScrollView 
              ref={daysScrollRef}
              style={styles.daysScroll}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              nestedScrollEnabled={true}
              onScroll={(event) => {
                const offsetY = event.nativeEvent.contentOffset.y;
                if (timeScrollRef.current) {
                  timeScrollRef.current.scrollTo({ y: offsetY, animated: false });
                }
              }}
            >
              <View style={styles.dayColumns}>
                {days.map(day => {
                  const dayItems = scheduleItems.filter(item => item.day === day);
                  return (
                    <View key={day} style={styles.dayColumn}>
                      {/* Time slot cells for grid lines */}
                      {timeSlots.map((timeSlot, index) => (
                        <View key={`${day}-${timeSlot}`} style={styles.timeSlotCell} />
                      ))}
                      {/* Event blocks absolutely positioned */}
                      {dayItems.map(item => {
                        const position = getEventPosition(item);
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[
                              styles.eventBlock,
                              {
                                top: position.top,
                                height: position.height,
                                backgroundColor: item.type === 'class' ? '#f0f0f0' : '#e8f4f8'
                              }
                            ]}
                            onPress={() => handleItemPress(item)}
                          >
                            <Text style={styles.eventTitle} numberOfLines={2}>
                              {item.title}
                            </Text>
                            <Text style={styles.eventTime} numberOfLines={1}>
                              {item.time}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Schedule'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Title */}
              <TextInput
                style={styles.modalTitle}
                value={selectedItem?.title || ''}
                onChangeText={(text) => setSelectedItem({ ...selectedItem!, title: text })}
                placeholder="Event title"
                placeholderTextColor="#999"
              />

              {/* All-day toggle */}
              <View style={styles.modalRow}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.modalLabel}>All-day</Text>
                <View style={styles.placeholder} />
              </View>

              {/* Start date/time */}
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => {
                  setTimePickerField('start');
                  setDatePickerMode('date');
                  setShowDatePicker(true);
                }}
              >
                <View style={styles.placeholder} />
                <View style={styles.modalRowContent}>
                  <Text style={styles.modalValue}>
                    {selectedItem?.startDate ? formatDateToString(selectedItem.startDate) : 'Select date'}
                  </Text>
                  <Text style={styles.modalValue}>
                    {selectedItem?.startDate ? formatDateToTime(selectedItem.startDate) : 'Select time'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* End date/time */}
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => {
                  setTimePickerField('end');
                  setDatePickerMode('date');
                  setShowDatePicker(true);
                }}
              >
                <View style={styles.placeholder} />
                <View style={styles.modalRowContent}>
                  <Text style={styles.modalValue}>
                    {selectedItem?.endDate ? formatDateToString(selectedItem.endDate) : 'Select date'}
                  </Text>
                  <Text style={styles.modalValue}>
                    {selectedItem?.endDate ? formatDateToTime(selectedItem.endDate) : 'Select time'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Time zone */}
              <View style={styles.modalRow}>
                <Ionicons name="globe-outline" size={20} color="#666" />
                <Text style={styles.modalLabel}>Korean Standard Time</Text>
              </View>

              {/* Recurrence */}
              <TouchableOpacity style={styles.modalRow}>
                <Ionicons name="refresh-outline" size={20} color="#666" />
                <Text style={styles.modalLabel}>
                  {selectedItem?.recurrence || 'Repeats every week, until Monday, Dec 29'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              {/* Add guests */}
              <TouchableOpacity style={styles.modalRow}>
                <Ionicons name="people-outline" size={20} color="#666" />
                <Text style={styles.modalLabel}>Add guests</Text>
              </TouchableOpacity>

              {/* Add video conferencing */}
              <TouchableOpacity style={styles.modalRow}>
                <Ionicons name="videocam-outline" size={20} color="#666" />
                <Text style={styles.modalLabel}>Add video conferencing</Text>
              </TouchableOpacity>

              {/* Add location */}
              <View style={styles.modalRow}>
                <Ionicons name="location-outline" size={20} color="#666" />
                <TextInput
                  style={styles.modalInput}
                  value={selectedItem?.location || ''}
                  onChangeText={(text) => setSelectedItem({ ...selectedItem!, location: text })}
                  placeholder="Add location"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Notification */}
              <TouchableOpacity style={styles.modalRow}>
                <Ionicons name="notifications-outline" size={20} color="#666" />
                <Text style={styles.modalLabel}>
                  {selectedItem?.reminder || '10 minutes before'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              {/* Add another notification */}
              <TouchableOpacity style={styles.modalRow}>
                <View style={styles.placeholder} />
                <Text style={styles.modalLabel}>Add another notification</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              {/* Color */}
              <TouchableOpacity style={styles.modalRow}>
                <View style={[styles.colorIndicator, { backgroundColor: '#666' }]} />
                <Text style={styles.modalLabel}>Graphite</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date/Time Pickers */}
      {(showDatePicker || showTimePicker) && Platform.OS !== 'web' && (
        <DateTimePicker
          value={selectedItem?.[timePickerField === 'start' ? 'startDate' : 'endDate'] || new Date()}
          mode={datePickerMode}
          is24Hour={false}
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') {
              setShowDatePicker(false);
              setShowTimePicker(false);
            }
            if (selectedDate && selectedItem) {
              if (datePickerMode === 'date') {
                const currentTime = selectedItem[timePickerField === 'start' ? 'startDate' : 'endDate'] || new Date();
                selectedDate.setHours(currentTime.getHours(), currentTime.getMinutes());
                setSelectedItem({
                  ...selectedItem,
                  [timePickerField === 'start' ? 'startDate' : 'endDate']: selectedDate
                });
                setDatePickerMode('time');
                setShowTimePicker(true);
              } else {
                setSelectedItem({
                  ...selectedItem,
                  [timePickerField === 'start' ? 'startDate' : 'endDate']: selectedDate
                });
                setShowTimePicker(false);
              }
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  placeholder: {
    width: 40,
  },
  calendarWrapper: {
    flexDirection: 'row',
    flex: 1,
  },
  horizontalScroll: {
    flex: 1,
  },
  calendarContainer: {
    minWidth: 800,
  },
  timeColumn: {
    width: 80,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  timeHeader: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeScroll: {
    flex: 1,
  },
  timeSlot: {
    height: 30,
    paddingRight: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#fafafa',
  },
  timeLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  daysScroll: {
    flex: 1,
  },
  dayHeaders: {
    flexDirection: 'row',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
    position: 'relative',
  },
  dayAbbrev: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
  dayNumber: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
    marginTop: 4,
  },
  dayIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#007AFF',
  },
  dayColumns: {
    flexDirection: 'row',
  },
  dayColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
    position: 'relative',
    minHeight: 480,
  },
  timeSlotCell: {
    height: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#fafafa',
    position: 'relative',
  },
  eventBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 10,
    color: '#666',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalCancel: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 24,
    paddingVertical: 8,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  modalRowContent: {
    flex: 1,
    gap: 4,
  },
  modalLabel: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
    flex: 1,
  },
  modalValue: {
    fontSize: 16,
    color: '#000',
  },
  modalInput: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
    flex: 1,
    paddingVertical: 4,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: 4,
  },
});

