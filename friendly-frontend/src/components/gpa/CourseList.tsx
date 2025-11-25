import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Course } from '@/src/types/gpa.types';

interface CourseListProps {
  courses: Course[];
  onEditCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
}

export const CourseList: React.FC<CourseListProps> = ({
  courses,
  onEditCourse,
  onDeleteCourse,
}) => {
  if (courses.length === 0) {
    return null;
  }

  const getGradeColor = (grade: string) => {
    const upperGrade = grade.toUpperCase();
    if (upperGrade.startsWith('A')) return '#10b981';
    if (upperGrade.startsWith('B')) return '#3b82f6';
    if (upperGrade.startsWith('C')) return '#f59e0b';
    if (upperGrade.startsWith('D')) return '#f97316';
    return '#ef4444';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Your Courses</Text>
      {courses.map((course) => (
        <View key={course.id} style={styles.courseCard}>
          <View style={styles.courseContent}>
            <View style={styles.courseHeader}>
              <Text style={styles.courseName} numberOfLines={1}>
                {course.name}
              </Text>
              <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(course.grade) }]}>
                <Text style={styles.gradeText}>{course.grade}</Text>
              </View>
            </View>
            <View style={styles.courseDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="book-outline" size={14} color="#6B7280" />
                <Text style={styles.detailText}>{course.credits} credits</Text>
              </View>
              {course.semester && (
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                  <Text style={styles.detailText}>
                    {course.semester} {course.year || ''}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => onEditCourse(course)}
              style={styles.actionButton}
            >
              <Ionicons name="create-outline" size={18} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDeleteCourse(course.id)}
              style={styles.actionButton}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  courseContent: {
    flex: 1,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  courseDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    padding: 6,
  },
});

