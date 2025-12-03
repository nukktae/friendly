import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { ScheduleItem } from '@/src/services/schedule/scheduleAIService';

interface InlineClassPreviewProps {
  selectedDate: Date;
  classes: ScheduleItem[];
  onClassPress: (classItem: ScheduleItem) => void;
  getClassColorIdentity: (classItem: ScheduleItem) => { tint: string; accent: string; accentRgba: string };
}

const InlineClassPreview: React.FC<InlineClassPreviewProps> = ({
  selectedDate,
  classes,
  onClassPress,
  getClassColorIdentity,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(6)).current;

  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayName = weekdayNames[selectedDate.getDay()];
  const selectedDayClasses = classes.filter((c) => c.day === selectedDayName);

  // Animate preview card when date changes
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedDate]);

  const ClassCard = ({ classItem }: { classItem: ScheduleItem }) => {
    const colorIdentity = getClassColorIdentity(classItem);
    const cardFadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(cardFadeAnim, {
        toValue: 1,
        duration: 100,
        delay: 50,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View style={{ opacity: cardFadeAnim }}>
        <TouchableOpacity
          style={[styles.classCard, isDark && styles.classCardDark]}
          onPress={() => onClassPress(classItem)}
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
              <View
                style={[
                  styles.classBadge,
                  {
                    backgroundColor: colorIdentity.tint,
                    borderColor: colorIdentity.accentRgba,
                  },
                ]}
              >
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
      </Animated.View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        isDark && styles.containerDark,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Separator */}
      <View style={[styles.separator, isDark && styles.separatorDark]} />

      {/* Day Header (Sticky) */}
      <View style={styles.dayHeader}>
        <Text style={[styles.dayHeaderText, isDark && styles.dayHeaderTextDark]}>
          {selectedDayName}, {selectedDate.toLocaleDateString('default', { month: 'long', day: 'numeric' })}
        </Text>
        <View style={[styles.dayHeaderUnderline, isDark && styles.dayHeaderUnderlineDark]} />
      </View>

      {/* Class Cards */}
      {selectedDayClasses.length > 0 ? (
        <View style={styles.classesContainer}>
          {selectedDayClasses.map((classItem) => (
            <ClassCard key={classItem.id} classItem={classItem} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, isDark && styles.emptyStateTextDark]}>
            No classes today 🌿
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginTop: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  containerDark: {
    backgroundColor: '#161616',
    shadowOpacity: 0.2,
  },
  separator: {
    height: 1,
    backgroundColor: '#F2F2F2',
    marginBottom: 16,
  },
  separatorDark: {
    backgroundColor: '#1E1E1E',
  },
  dayHeader: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  dayHeaderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  dayHeaderTextDark: {
    color: '#ECEDEE',
  },
  dayHeaderUnderline: {
    width: 36,
    height: 2,
    backgroundColor: '#2C6E42',
    borderRadius: 1,
  },
  dayHeaderUnderlineDark: {
    backgroundColor: '#6EF2B6',
  },
  classesContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  classCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  classCardDark: {
    backgroundColor: '#1E1E1E',
    shadowOpacity: 0.15,
  },
  classIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  classBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  classTime: {
    fontSize: 13,
    color: '#5F5F5F',
    marginBottom: 3,
    fontWeight: '400',
  },
  classTimeDark: {
    color: '#A8A8A8',
  },
  classDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  classDetailText: {
    fontSize: 12,
    color: '#8A8A8A',
    marginLeft: 4,
    fontWeight: '400',
  },
  classDetailTextDark: {
    color: '#A8A8A8',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#9A9A9A',
    fontWeight: '400',
  },
  emptyStateTextDark: {
    color: '#6A6A6A',
  },
});

export default InlineClassPreview;

