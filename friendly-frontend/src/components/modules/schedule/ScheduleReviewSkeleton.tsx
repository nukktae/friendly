import React, { useEffect, useRef } from 'react';
import { Animated, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

export function ScheduleReviewSkeleton() {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  }, [fadeAnim]);

  const SkeletonBox = ({ width, height, style }: { width: number | string; height: number; style?: any }) => (
    <Animated.View
      style={[
        styles.skeletonBox,
        {
          width,
          height,
          opacity: fadeAnim,
        },
        style,
      ]}
    />
  );

  // Generate time slots (7 AM to 10 PM)
  const timeSlots: string[] = [];
  for (let hour = 7; hour <= 22; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 22) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SkeletonBox width={24} height={24} style={styles.backButton} />
        <SkeletonBox width={100} height={20} />
        <View style={styles.placeholder} />
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarWrapper}>
        {/* Time column */}
        <View style={styles.timeColumn}>
          <View style={styles.timeHeader} />
          <ScrollView 
            style={styles.timeScroll}
            showsVerticalScrollIndicator={false}
          >
            {timeSlots.map((time, index) => (
              <View key={index} style={styles.timeSlot}>
                {index % 2 === 0 && (
                  <SkeletonBox width={50} height={12} />
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Days section */}
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          <View style={styles.calendarContainer}>
            {/* Day headers */}
            <View style={styles.dayHeaders}>
              {days.map((day, idx) => (
                <View key={day} style={styles.dayHeader}>
                  <SkeletonBox width={12} height={12} style={styles.dayAbbrev} />
                  <SkeletonBox width={20} height={20} style={styles.dayNumber} />
                </View>
              ))}
            </View>

            {/* Day columns with skeleton events */}
            <ScrollView 
              style={styles.daysScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.dayColumns}>
                {days.map((day, dayIndex) => (
                  <View key={day} style={styles.dayColumn}>
                    {/* Time slot cells */}
                    {timeSlots.map((timeSlot, index) => (
                      <View key={`${day}-${timeSlot}`} style={styles.timeSlotCell} />
                    ))}
                    {/* Skeleton event blocks - fixed positions for consistency */}
                    {dayIndex % 2 === 0 && (
                      <SkeletonBox 
                        width="90%" 
                        height={80}
                        style={[
                          styles.eventBlock,
                          {
                            top: 120,
                          }
                        ]} 
                      />
                    )}
                    {dayIndex % 3 === 0 && (
                      <SkeletonBox 
                        width="90%" 
                        height={100}
                        style={[
                          styles.eventBlock,
                          {
                            top: 320,
                          }
                        ]} 
                      />
                    )}
                    {dayIndex === 0 && (
                      <SkeletonBox 
                        width="90%" 
                        height={70}
                        style={[
                          styles.eventBlock,
                          {
                            top: 500,
                          }
                        ]} 
                      />
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <SkeletonBox width="100%" height={48} style={styles.saveButton} />
      </View>
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
    borderRadius: 4,
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
  },
  dayAbbrev: {
    marginBottom: 4,
    borderRadius: 2,
  },
  dayNumber: {
    borderRadius: 4,
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
  },
  eventBlock: {
    position: 'absolute',
    left: 4,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  saveButton: {
    borderRadius: 12,
  },
  skeletonBox: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
});

