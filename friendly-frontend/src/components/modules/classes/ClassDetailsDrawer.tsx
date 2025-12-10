import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { ScheduleItem } from '@/src/services/schedule/scheduleAIService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ClassDetailsDrawerProps {
  selectedDate: Date;
  classes: ScheduleItem[];
  onClassPress: (classItem: ScheduleItem) => void;
  getClassColorIdentity: (classItem: ScheduleItem) => { tint: string; accent: string; accentRgba: string };
}

const ClassDetailsDrawer: React.FC<ClassDetailsDrawerProps> = ({
  selectedDate,
  classes,
  onClassPress,
  getClassColorIdentity,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bottomSheetRef = useRef<BottomSheet>(null);
  const peekHeight = SCREEN_HEIGHT * 0.25; // 25% peek
  const fullHeight = SCREEN_HEIGHT * 0.7; // 70% full expand

  const snapPoints = useMemo(() => [peekHeight, fullHeight], []);

  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const selectedDayName = weekdayNames[selectedDate.getDay()];
  const selectedDayClasses = classes.filter(
    (c) => c.day === selectedDayName
  );

  // Open drawer when classes are available
  React.useEffect(() => {
    if (selectedDayClasses.length > 0) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [selectedDate, selectedDayClasses.length]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.3}
      />
    ),
    []
  );

  const ClassCard = ({ classItem }: { classItem: ScheduleItem }) => {
    const colorIdentity = getClassColorIdentity(classItem);

    return (
      <TouchableOpacity
        style={[styles.classCard, isDark && styles.classCardDark]}
        onPress={() => onClassPress(classItem)}
        activeOpacity={0.7}
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
    );
  };

  if (selectedDayClasses.length === 0) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      backgroundStyle={[styles.bottomSheetBackground, isDark && styles.bottomSheetBackgroundDark]}
      handleIndicatorStyle={[styles.handleIndicator, isDark && styles.handleIndicatorDark]}
      animateOnMount={true}
    >
      <View style={styles.drawerContent}>
        {/* Header */}
        <View style={styles.drawerHeader}>
          <Text style={[styles.drawerHeaderText, isDark && styles.drawerHeaderTextDark]}>
            {selectedDayName}, {selectedDate.toLocaleDateString('default', { month: 'long', day: 'numeric' })}
          </Text>
          <View style={[styles.drawerHeaderUnderline, isDark && styles.drawerHeaderUnderlineDark]} />
        </View>

        {/* Class Cards */}
        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedDayClasses.map((classItem) => (
            <ClassCard key={classItem.id} classItem={classItem} />
          ))}
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 8,
  },
  bottomSheetBackgroundDark: {
    backgroundColor: '#161616',
  },
  handleIndicator: {
    backgroundColor: '#C8C8C8',
    width: 40,
    height: 4,
  },
  handleIndicatorDark: {
    backgroundColor: '#4A4A4A',
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  drawerHeader: {
    paddingTop: 8,
    paddingBottom: 16,
    marginBottom: 8,
  },
  drawerHeaderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  drawerHeaderTextDark: {
    color: '#ECEDEE',
  },
  drawerHeaderUnderline: {
    width: 36,
    height: 2,
    backgroundColor: '#2C6E42',
    borderRadius: 1,
  },
  drawerHeaderUnderlineDark: {
    backgroundColor: '#6EF2B6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
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
});

export default ClassDetailsDrawer;

