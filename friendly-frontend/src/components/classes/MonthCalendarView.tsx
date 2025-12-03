import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { ScheduleItem } from '@/src/services/schedule/scheduleAIService';

interface MonthCalendarViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  classes: ScheduleItem[];
  getClassColorIdentity: (classItem: ScheduleItem) => { tint: string; accent: string; accentRgba: string };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = (SCREEN_WIDTH - 48) / 7; // 24px padding on each side

const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({
  selectedDate,
  onDateSelect,
  classes,
  getClassColorIdentity,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const [monthFadeAnim] = useState(new Animated.Value(1));
  const [monthSlideAnim] = useState(new Animated.Value(0));
  const [selectedDayScale] = useState(new Animated.Value(1));

  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayShort = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Update current month when selectedDate changes
  useEffect(() => {
    const newMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    if (newMonth.getTime() !== currentMonth.getTime()) {
      setCurrentMonth(newMonth);
    }
  }, [selectedDate]);

  const getMonthStart = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    // Fill remaining cells to make 6 rows (42 cells total)
    while (days.length < 42) {
      days.push(null);
    }

    return days;
  };

  const isSameDay = (date1: Date | null, date2: Date | null): boolean => {
    if (!date1 || !date2) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return isSameDay(date, today);
  };

  const isSameMonth = (date: Date | null, month: Date): boolean => {
    if (!date) return false;
    return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
  };

  const getClassesForDate = (date: Date | null): ScheduleItem[] => {
    if (!date) return [];
    const dayName = weekdayNames[date.getDay()];
    return classes.filter(c => c.day === dayName);
  };

  const changeMonth = (direction: number) => {
    // Animate out
    Animated.parallel([
      Animated.timing(monthFadeAnim, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(monthSlideAnim, {
        toValue: direction * 10,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Update month
      const newMonth = new Date(currentMonth);
      newMonth.setMonth(currentMonth.getMonth() + direction);
      setCurrentMonth(newMonth);

      // Animate in
      monthSlideAnim.setValue(-direction * 10);
      Animated.parallel([
        Animated.timing(monthFadeAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(monthSlideAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleDateSelect = (date: Date) => {
    if (isSameDay(date, selectedDate)) return;

    // Animate selection
    Animated.sequence([
      Animated.spring(selectedDayScale, {
        toValue: 0.92,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }),
      Animated.spring(selectedDayScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }),
    ]).start();

    onDateSelect(date);
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  const renderClassDots = (date: Date | null) => {
    if (!date) return null;
    const dayClasses = getClassesForDate(date);
    if (dayClasses.length === 0) return null;

    const visibleClasses = dayClasses.slice(0, 3);
    const hasMore = dayClasses.length > 3;

    return (
      <View style={styles.dotsContainer}>
        {visibleClasses.map((classItem, index) => {
          const colorIdentity = getClassColorIdentity(classItem);
          const dotColor = isDark ? `${colorIdentity.accent}CC` : colorIdentity.accent; // Add opacity for dark mode
          return (
            <View
              key={classItem.id}
              style={[
                styles.dot,
                { backgroundColor: dotColor },
                index > 0 && styles.dotSpacing,
              ]}
            />
          );
        })}
        {hasMore && (
          <Text style={[styles.overflowIndicator, isDark && styles.overflowIndicatorDark]}>
            ...
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Month Header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={() => changeMonth(-1)}
          style={styles.navButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={18} color={isDark ? '#A8A8A8' : '#111111'} style={{ opacity: 0.7 }} />
        </TouchableOpacity>
        <Animated.View
          style={[
            styles.monthTitleContainer,
            {
              opacity: monthFadeAnim,
              transform: [{ translateX: monthSlideAnim }],
            },
          ]}
        >
          <Text style={[styles.monthTitle, isDark && styles.monthTitleDark]}>
            {monthYear}
          </Text>
        </Animated.View>
        <TouchableOpacity
          onPress={() => changeMonth(1)}
          style={styles.navButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#A8A8A8' : '#111111'} style={{ opacity: 0.7 }} />
        </TouchableOpacity>
      </View>

      {/* Optional Divider */}
      <View style={[styles.divider, isDark && styles.dividerDark]} />

      {/* Weekday Row */}
      <View style={styles.weekdayRow}>
        {weekdayShort.map((day) => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, isDark && styles.weekdayTextDark]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Month Grid */}
      <View style={styles.grid}>
        {days.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);
          const inMonth = isSameMonth(date, currentMonth);
          const dayClasses = getClassesForDate(date);

          return (
            <TouchableOpacity
              key={`day-${index}`}
              style={[
                styles.dayCell,
                { width: CELL_SIZE, height: CELL_SIZE },
                isSelected && styles.dayCellSelected,
                isSelected && isDark && styles.dayCellSelectedDark,
                isTodayDate && !isSelected && styles.dayCellToday,
                isTodayDate && !isSelected && isDark && styles.dayCellTodayDark,
              ]}
              onPress={() => date && handleDateSelect(date)}
              activeOpacity={0.7}
              disabled={!date}
              accessibilityRole="button"
              accessibilityLabel={
                date
                  ? `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}, ${dayClasses.length} classes`
                  : 'Empty day'
              }
              accessibilityState={{ selected: isSelected }}
            >
              {date && (
                <>
                  <Text
                    style={[
                      styles.dayNumber,
                      !inMonth && styles.dayNumberOutOfMonth,
                      !inMonth && isDark && styles.dayNumberOutOfMonthDark,
                      isSelected && styles.dayNumberSelected,
                      isSelected && isDark && styles.dayNumberSelectedDark,
                      isTodayDate && !isSelected && styles.dayNumberToday,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  {renderClassDots(date)}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 8,
  },
  containerDark: {
    backgroundColor: '#0C0C0C',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
  },
  navButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
    padding: 4,
  },
  monthTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#111111',
    letterSpacing: -0.3,
  },
  monthTitleDark: {
    color: '#ECEDEE',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#F2F2F2',
    opacity: 0.5,
    marginHorizontal: 24,
    marginBottom: 12,
  },
  dividerDark: {
    backgroundColor: '#1E1E1E',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9A9A9A',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  weekdayTextDark: {
    color: '#A8A8A8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    height: 44,
  },
  dayCellSelected: {
    backgroundColor: '#E6F4EA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2C6E42',
    shadowColor: '#2C6E42',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  dayCellSelectedDark: {
    backgroundColor: 'rgba(31, 93, 67, 0.2)',
    borderColor: '#6EF2B6',
    borderWidth: 1.5,
    shadowColor: '#6EF2B6',
    shadowOpacity: 0.3,
  },
  dayCellToday: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2C6E42',
    shadowColor: '#2C6E42',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  dayCellTodayDark: {
    backgroundColor: '#111111',
    borderColor: '#6EF2B6',
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '400',
    color: '#111111',
  },
  dayNumberSelected: {
    color: '#1F5D43',
    fontWeight: '500',
  },
  dayNumberSelectedDark: {
    color: '#6EF2B6',
  },
  dayNumberToday: {
    fontWeight: '500',
  },
  dayNumberOutOfMonth: {
    color: '#C8C8C8',
  },
  dayNumberOutOfMonthDark: {
    color: '#4A4A4A',
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
});

export default MonthCalendarView;

