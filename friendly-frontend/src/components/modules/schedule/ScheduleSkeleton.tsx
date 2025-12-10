import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface ScheduleSkeletonProps {
  type: 'calendar' | 'list';
  itemCount?: number;
}

const ScheduleSkeleton: React.FC<ScheduleSkeletonProps> = ({ 
  type, 
  itemCount = 3 
}) => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
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

  if (type === 'calendar') {
    return (
      <View style={styles.container}>
        {/* Calendar Header */}
        <View style={styles.calendarHeader}>
          <SkeletonBox width={120} height={20} />
          <SkeletonBox width={80} height={20} />
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {/* Day headers */}
          <View style={styles.dayHeaders}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((_, index) => (
              <SkeletonBox key={index} width={40} height={16} style={styles.dayHeader} />
            ))}
          </View>

          {/* Time slots */}
          {Array.from({ length: 12 }).map((_, timeIndex) => (
            <View key={timeIndex} style={styles.timeSlot}>
              <SkeletonBox width={30} height={12} style={styles.timeLabel} />
              <View style={styles.dayColumns}>
                {Array.from({ length: 5 }).map((_, dayIndex) => (
                  <View key={dayIndex} style={styles.dayColumn}>
                    {Math.random() > 0.7 && (
                      <SkeletonBox 
                        width="100%" 
                        height={Math.random() * 20 + 20} 
                        style={styles.eventBox} 
                      />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* List Header */}
      <View style={styles.listHeader}>
        <SkeletonBox width={100} height={20} />
        <SkeletonBox width={60} height={16} />
      </View>

      {/* List Items */}
      {Array.from({ length: itemCount }).map((_, index) => (
        <View key={index} style={styles.listItem}>
          <View style={styles.listItemHeader}>
            <SkeletonBox width={80} height={16} />
            <SkeletonBox width={60} height={14} />
          </View>
          
          <View style={styles.listItemContent}>
            <SkeletonBox width="100%" height={18} style={styles.titleBox} />
            <SkeletonBox width={120} height={14} style={styles.timeBox} />
            <SkeletonBox width={100} height={14} style={styles.locationBox} />
          </View>

          <View style={styles.listItemActions}>
            <SkeletonBox width={60} height={12} />
            <SkeletonBox width={40} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  skeletonBox: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  
  // Calendar styles
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  calendarGrid: {
    flex: 1,
  },
  dayHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  dayHeader: {
    marginHorizontal: 4,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    height: 40,
  },
  timeLabel: {
    marginRight: 12,
  },
  dayColumns: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    flex: 1,
    marginHorizontal: 2,
    minHeight: 40,
    justifyContent: 'center',
  },
  eventBox: {
    borderRadius: 6,
    marginVertical: 1,
  },

  // List styles
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  listItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listItemContent: {
    marginBottom: 12,
  },
  titleBox: {
    marginBottom: 8,
  },
  timeBox: {
    marginBottom: 6,
  },
  locationBox: {
    marginBottom: 6,
  },
  listItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default ScheduleSkeleton;
