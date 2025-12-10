import { ScheduleItem } from '@/src/services/schedule/scheduleAIService';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ScheduleListViewProps {
  scheduleItems: ScheduleItem[];
  onItemPress: (item: ScheduleItem) => void;
  onItemEdit: (item: ScheduleItem) => void;
  onItemDelete: (itemId: string) => void;
  onItemReorder: (items: ScheduleItem[]) => void;
}

const ScheduleListView: React.FC<ScheduleListViewProps> = ({
  scheduleItems,
  onItemPress,
  onItemEdit,
  onItemDelete,
  onItemReorder,
}) => {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Group items by day
  const groupedItems = scheduleItems.reduce((acc, item) => {
    if (!acc[item.day]) {
      acc[item.day] = [];
    }
    acc[item.day].push(item);
    return acc;
  }, {} as Record<string, ScheduleItem[]>);

  // Sort days
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const sortedDays = dayOrder.filter(day => groupedItems[day]?.length > 0);

  // Sort items within each day by time
  Object.keys(groupedItems).forEach(day => {
    groupedItems[day].sort((a, b) => {
      const timeA = a.startTime || a.time.split(' - ')[0];
      const timeB = b.startTime || b.time.split(' - ')[0];
      return timeA.localeCompare(timeB);
    });
  });

  const toggleDayExpansion = (day: string) => {
    setExpandedDay(expandedDay === day ? null : day);
  };

  const handleItemDelete = (item: ScheduleItem) => {
    Alert.alert(
      'Delete Schedule Item',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onItemDelete(item.id),
        },
      ]
    );
  };

  const getItemTypeIcon = (type: ScheduleItem['type']) => {
    const icons = {
      class: 'school',
      assignment: 'document-text',
      exam: 'clipboard',
      meeting: 'people',
      other: 'calendar',
    };
    return icons[type] || 'calendar';
  };

  const getItemTypeColor = (type: ScheduleItem['type']) => {
    const colors = {
      class: '#3b82f6',
      assignment: '#f59e0b',
      exam: '#ef4444',
      meeting: '#10b981',
      other: '#6b7280',
    };
    return colors[type] || '#6b7280';
  };

  const formatTime = (time: string) => {
    // Simple time formatting - in real app would parse properly
    return time;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Schedule List</Text>
        <Text style={styles.subtitle}>
          {scheduleItems.length} item{scheduleItems.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Schedule Items */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {sortedDays.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No schedule items</Text>
            <Text style={styles.emptyText}>Add items to see them here</Text>
          </View>
        ) : (
          sortedDays.map((day) => {
            const dayItems = groupedItems[day];
            const isExpanded = expandedDay === day;

            return (
              <View key={day} style={styles.dayGroup}>
                {/* Day Header */}
                <TouchableOpacity
                  style={styles.dayHeader}
                  onPress={() => toggleDayExpansion(day)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dayHeaderLeft}>
                    <Text style={styles.dayTitle}>{day}</Text>
                    <Text style={styles.dayCount}>
                      {dayItems.length} item{dayItems.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>

                {/* Day Items */}
                {isExpanded && (
                  <View style={styles.dayItems}>
                    {dayItems.map((item, index) => (
                      <View key={item.id} style={styles.scheduleItem}>
                        {/* Item Content */}
                        <TouchableOpacity
                          style={styles.itemContent}
                          onPress={() => onItemPress(item)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.itemLeft}>
                            <View
                              style={[
                                styles.itemTypeIcon,
                                { backgroundColor: getItemTypeColor(item.type) },
                              ]}
                            >
                              <Ionicons
                                name={getItemTypeIcon(item.type) as any}
                                size={16}
                                color="white"
                              />
                            </View>
                            <View style={styles.itemDetails}>
                              <Text style={styles.itemTitle} numberOfLines={1}>
                                {item.title}
                              </Text>
                              <Text style={styles.itemTime}>
                                {formatTime(item.time)}
                              </Text>
                              {item.location && (
                                <Text style={styles.itemLocation} numberOfLines={1}>
                                  {item.location}
                                </Text>
                              )}
                            </View>
                          </View>

                          {/* Confidence Badge */}
                          <View style={styles.confidenceBadge}>
                            <View
                              style={[
                                styles.confidenceDot,
                                {
                                  backgroundColor:
                                    item.confidence >= 0.8
                                      ? '#22c55e'
                                      : item.confidence >= 0.6
                                      ? '#f59e0b'
                                      : '#ef4444',
                                },
                              ]}
                            />
                          </View>
                        </TouchableOpacity>

                        {/* Item Actions */}
                        <View style={styles.itemActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => onItemEdit(item)}
                          >
                            <Ionicons name="pencil" size={16} color="#666" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleItemDelete(item)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  dayGroup: {
    marginBottom: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  dayCount: {
    fontSize: 12,
    color: '#666',
  },
  dayItems: {
    backgroundColor: 'white',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  itemTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemLocation: {
    fontSize: 12,
    color: '#999',
  },
  confidenceBadge: {
    marginLeft: 12,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemActions: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
});

export default ScheduleListView;
