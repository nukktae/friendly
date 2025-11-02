import EmptyState from '@/src/components/common/EmptyState';
import { useApp } from '@/src/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import scheduleStorageService from '@/src/services/schedule/scheduleStorageService';
import { ScheduleItem } from '@/src/services/schedule/scheduleAIService';

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
  const [classes, setClasses] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(new Date()));

  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayShort = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  // Load classes from user schedules
  useEffect(() => {
    const loadClasses = async () => {
      const userId = userProfile?.uid || user?.uid || 'guest';

      try {
        setIsLoading(true);
        const schedules = await scheduleStorageService.getUserSchedules(userId);
        
        // Extract all classes from all schedules
        const allClasses: ScheduleItem[] = [];
        schedules.forEach(schedule => {
          const classItems = schedule.items.filter(item => item.type === 'class');
          allClasses.push(...classItems);
        });
        
        setClasses(allClasses);
      } catch (error) {
        console.error('Failed to load classes:', error);
        setClasses([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadClasses();
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
      },
    });
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
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(weekStart.getDate() + (direction * 7));
    setWeekStart(newWeekStart);
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

  const getClassColor = (index: number) => {
    const colors = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];
    return colors[index % colors.length];
  };

  const ClassCard = ({ classItem, index }: { classItem: ScheduleItem; index: number }) => {
    const color = getClassColor(index);
    return (
      <TouchableOpacity
        style={styles.classCard}
        onPress={() => handleClassClick(classItem)}
        activeOpacity={0.7}
      >
        <View style={[styles.classIcon, { backgroundColor: color }]}>
          <Ionicons name="school" size={20} color="white" />
        </View>
        <View style={styles.classInfo}>
          <View style={styles.classHeader}>
            <Text style={styles.className} numberOfLines={1}>
              {classItem.title}
            </Text>
            <View style={[styles.classBadge, { backgroundColor: color }]}>
              <Text style={styles.classBadgeText}>CLASS</Text>
            </View>
          </View>
          <Text style={styles.classTime}>{classItem.time}</Text>
          {classItem.location && (
            <View style={styles.classDetailRow}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.classDetailText}>{classItem.location}</Text>
            </View>
          )}
          {classItem.instructor && (
            <View style={styles.classDetailRow}>
              <Ionicons name="person-outline" size={14} color="#666" />
              <Text style={styles.classDetailText}>{classItem.instructor}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Classes</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading classes...</Text>
        </View>
      ) : classes.length === 0 ? (
        <EmptyState
          icon="book-outline"
          title="No classes enrolled yet"
          subtitle="Add a schedule to see your enrolled classes here."
          buttonText="Add Schedule"
          onButtonPress={() => {
            console.log('Navigate to schedule tab');
          }}
        />
      ) : (
        <>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Calendar Week View */}
            <View style={styles.calendarContainer}>
              {/* Month/Year with Navigation */}
              <View style={styles.monthHeader}>
                <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.navButton}>
                  <Ionicons name="chevron-back" size={20} color="#000" />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{getMonthYear()}</Text>
                <TouchableOpacity onPress={() => changeWeek(1)} style={styles.navButton}>
                  <Ionicons name="chevron-forward" size={20} color="#000" />
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
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text style={styles.dayLabel}>{weekdayShort[date.getDay()]}</Text>
                      <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                        <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                          {date.getDate()}
                        </Text>
                      </View>
                      {hasClasses && (
                        <View style={styles.dotsContainer}>
                          {getClassesForDate(date).slice(0, 3).map((_, i) => (
                            <View key={i} style={styles.dot} />
                          ))}
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
                  <Text style={styles.dateHeader}>
                    {selectedDayName}, {selectedDate.toLocaleDateString('default', { month: 'long', day: 'numeric' })}
                  </Text>
                  <View style={styles.dateUnderline} />
                </View>
                <View style={styles.classList}>
                  {selectedDayClasses.map((classItem, index) => (
                    <ClassCard key={classItem.id} classItem={classItem} index={index} />
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyDateContainer}>
                <Ionicons name="calendar-outline" size={48} color="#ccc" />
                <Text style={styles.emptyDateText}>No classes on this day</Text>
              </View>
            )}
          </ScrollView>

          {/* Floating Action Button */}
          <TouchableOpacity style={styles.fab}>
            <Ionicons name="chatbubble" size={24} color="white" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
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
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
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
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayCircleSelected: {
    backgroundColor: '#426b1f',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  dayNumberSelected: {
    color: '#fff',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#426b1f',
  },
  classesSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
  },
  dateHeaderContainer: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  dateUnderline: {
    width: 60,
    height: 3,
    backgroundColor: '#426b1f',
    borderRadius: 2,
  },
  classList: {
    gap: 16,
  },
  classCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
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
    marginBottom: 4,
  },
  className: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  classBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  classBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  classTime: {
    fontSize: 13,
    color: '#426b1f',
    marginBottom: 6,
  },
  classDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  classDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
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
});

export default ClassesPage;
