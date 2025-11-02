import { ScheduleItem } from '@/src/services/schedule/scheduleAIService';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface DragDropCalendarProps {
  scheduleItems: ScheduleItem[];
  onItemMove: (itemId: string, newTime: string, newDay: string) => void;
  onItemPress: (item: ScheduleItem) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

interface DraggedItem {
  item: ScheduleItem;
  pan: Animated.ValueXY;
  scale: Animated.Value;
}

const DragDropCalendar: React.FC<DragDropCalendarProps> = ({
  scheduleItems,
  onItemMove,
  onItemPress,
  selectedDate,
  onDateChange,
}) => {
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ day: string; time: string } | null>(null);

  // Generate time slots (7 AM to 10 PM, 30-minute intervals)
  const timeSlots = [];
  for (let hour = 7; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  // Days of the week
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Get items for a specific day and time slot
  const getItemsForSlot = (day: string, timeSlot: string) => {
    return scheduleItems.filter(item => {
      if (item.day !== day) return false;
      
      const itemStartTime = item.startTime || item.time.split(' - ')[0];
      const slotTime = timeSlot;
      
      // Simple time matching - in real app, would parse times properly
      return itemStartTime === slotTime;
    });
  };

  const startDrag = (item: ScheduleItem) => {
    const pan = new Animated.ValueXY();
    const scale = new Animated.Value(1);

    setDraggedItem({
      item,
      pan,
      scale,
    });

    // Animate scale up
    Animated.spring(scale, {
      toValue: 1.1,
      useNativeDriver: true,
    }).start();
  };

  const onDragMove = (event: any) => {
    if (!draggedItem) return;

    const { translationX, translationY } = event.nativeEvent;
    draggedItem.pan.setValue({ x: translationX, y: translationY });

    // Calculate which slot we're hovering over
    const slotWidth = 80; // Approximate slot width
    const slotHeight = 40; // Approximate slot height
    
    const dayIndex = Math.floor(translationX / slotWidth);
    const timeIndex = Math.floor(translationY / slotHeight);

    if (dayIndex >= 0 && dayIndex < days.length && timeIndex >= 0 && timeIndex < timeSlots.length) {
      setDragOverSlot({
        day: days[dayIndex],
        time: timeSlots[timeIndex],
      });
    } else {
      setDragOverSlot(null);
    }
  };

  const endDrag = () => {
    if (!draggedItem) return;

    // Animate back to original position
    Animated.parallel([
      Animated.spring(draggedItem.pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
      }),
      Animated.spring(draggedItem.scale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDraggedItem(null);
      setDragOverSlot(null);
    });
  };

  const dropItem = () => {
    if (!draggedItem || !dragOverSlot) {
      endDrag();
      return;
    }

    // Confirm the move
    Alert.alert(
      'Move Schedule Item',
      `Move "${draggedItem.item.title}" to ${dragOverSlot.day} at ${dragOverSlot.time}?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: endDrag },
        {
          text: 'Move',
          onPress: () => {
            onItemMove(draggedItem.item.id, dragOverSlot.time, dragOverSlot.day);
            endDrag();
          },
        },
      ]
    );
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getItemStyle = (item: ScheduleItem) => {
    const colors = {
      class: '#3b82f6',
      assignment: '#f59e0b',
      exam: '#ef4444',
      meeting: '#10b981',
      other: '#6b7280',
    };

    return {
      backgroundColor: colors[item.type] || colors.other,
    };
  };

  return (
    <View style={styles.container}>
      {/* Calendar Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Schedule</Text>
        <View style={styles.dateControls}>
          <TouchableOpacity 
            onPress={() => onDateChange(new Date(selectedDate.getTime() - 7 * 24 * 60 * 60 * 1000))}
            style={styles.dateButton}
          >
            <Ionicons name="chevron-back" size={20} color="#000" />
          </TouchableOpacity>
          
          <Text style={styles.dateText}>
            {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
          
          <TouchableOpacity 
            onPress={() => onDateChange(new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000))}
            style={styles.dateButton}
          >
            <Ionicons name="chevron-forward" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendar Grid */}
      <ScrollView style={styles.calendarContainer} showsVerticalScrollIndicator={false}>
        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          <View style={styles.timeColumn} />
          {days.map((day) => (
            <View key={day} style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>{day.slice(0, 3)}</Text>
            </View>
          ))}
        </View>

        {/* Time Slots */}
        {timeSlots.map((timeSlot) => (
          <View key={timeSlot} style={styles.timeRow}>
            {/* Time Label */}
            <View style={styles.timeLabel}>
              <Text style={styles.timeText}>{formatTime(timeSlot)}</Text>
            </View>

            {/* Day Columns */}
            {days.map((day) => {
              const items = getItemsForSlot(day, timeSlot);
              const isDragOver = dragOverSlot?.day === day && dragOverSlot?.time === timeSlot;

              return (
                <View 
                  key={`${day}-${timeSlot}`} 
                  style={[
                    styles.dayColumn,
                    isDragOver && styles.dragOverSlot
                  ]}
                >
                  {items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.scheduleItem, getItemStyle(item)]}
                      onPress={() => onItemPress(item)}
                      onLongPress={() => startDrag(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {item.location && (
                        <Text style={styles.itemLocation} numberOfLines={1}>
                          {item.location}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Drag Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Long press and drag items to move them to different time slots
        </Text>
      </View>

      {/* Dragged Item Overlay */}
      {draggedItem && (
        <Animated.View
          style={[
            styles.draggedItem,
            {
              transform: [
                { translateX: draggedItem.pan.x },
                { translateY: draggedItem.pan.y },
                { scale: draggedItem.scale },
              ],
            },
          ]}
        >
          <View style={[styles.scheduleItem, getItemStyle(draggedItem.item)]}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {draggedItem.item.title}
            </Text>
            {draggedItem.item.location && (
              <Text style={styles.itemLocation} numberOfLines={1}>
                {draggedItem.item.location}
              </Text>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  dateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dateButton: {
    padding: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  calendarContainer: {
    flex: 1,
  },
  dayHeaders: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timeColumn: {
    width: 80,
    paddingVertical: 12,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  timeRow: {
    flexDirection: 'row',
    minHeight: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeLabel: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dayColumn: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
    padding: 2,
    minHeight: 40,
    justifyContent: 'center',
  },
  dragOverSlot: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0ea5e9',
    borderWidth: 2,
  },
  scheduleItem: {
    borderRadius: 6,
    padding: 8,
    marginVertical: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  itemLocation: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  instructions: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  instructionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  draggedItem: {
    position: 'absolute',
    zIndex: 1000,
    opacity: 0.8,
  },
});

export default DragDropCalendar;
