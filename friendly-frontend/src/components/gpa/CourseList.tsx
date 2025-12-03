import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Course, GRADE_POINTS } from '@/src/types/gpa.types';
import { formatSemester, compareSemesters } from '@/src/utils/semesterUtils';

interface CourseListProps {
  courses: Course[];
  selectedSemester?: string; // Optional: filter by semester
  onUpdateCourse: (courseId: string, updates: { credits?: number; grade?: string }) => void;
  onDeleteCourse: (courseId: string) => void;
}

export const CourseList: React.FC<CourseListProps> = ({
  courses,
  selectedSemester,
  onUpdateCourse,
  onDeleteCourse,
}) => {
  const [editingCredits, setEditingCredits] = useState<Record<string, string>>({});
  const [showGradeDropdown, setShowGradeDropdown] = useState<string | null>(null);

  if (courses.length === 0) {
    return null;
  }

  // Get full semester string for a course
  const getCourseSemester = (course: Course): string | null => {
    // If semester is already in "2023 Spring" format, use it
    if (course.semester && /^\d{4}\s+(Fall|Spring)$/i.test(course.semester)) {
      return course.semester;
    }
    // If we have separate semester and year, format it
    if (course.semester && course.year) {
      const semesterNum = course.semester.toLowerCase() === 'fall' ? 1 : 2;
      return formatSemester(course.year, semesterNum);
    }
    // If only semester is provided, return as is
    if (course.semester) {
      return course.semester;
    }
    return null;
  };

  const formatTime = (course: Course) => {
    return getCourseSemester(course);
  };

  // Group courses by semester, optionally filter by selectedSemester
  const groupedCourses = useMemo(() => {
    // Filter courses by selected semester if provided
    const filteredCourses = selectedSemester
      ? courses.filter(course => {
          const courseSemester = getCourseSemester(course);
          return courseSemester === selectedSemester;
        })
      : courses;
    
    const groups: Record<string, Course[]> = {};
    
    filteredCourses.forEach(course => {
      const semester = getCourseSemester(course) || 'Other';
      if (!groups[semester]) {
        groups[semester] = [];
      }
      groups[semester].push(course);
    });

    // Sort semesters (newest first)
    const sortedSemesters = Object.keys(groups).sort(compareSemesters);
    
    return sortedSemesters.map(semester => ({
      semester,
      courses: groups[semester],
    }));
  }, [courses, selectedSemester]);

  const handleCreditsChange = (courseId: string, value: string) => {
    setEditingCredits({ ...editingCredits, [courseId]: value });
  };

  const handleCreditsBlur = (courseId: string, currentCredits: number) => {
    console.log('[CourseList] handleCreditsBlur called:', { courseId, currentCredits, editingValue: editingCredits[courseId] });
    const newValue = editingCredits[courseId];
    if (newValue !== undefined) {
      const credits = parseFloat(newValue);
      console.log('[CourseList] Parsed credits:', credits, 'isNaN:', isNaN(credits), 'credits > 0:', credits > 0, 'credits !== currentCredits:', credits !== currentCredits);
      if (!isNaN(credits) && credits > 0 && credits !== currentCredits) {
        console.log('[CourseList] Calling onUpdateCourse with credits:', credits);
        onUpdateCourse(courseId, { credits });
      } else {
        console.log('[CourseList] Not updating - validation failed or no change');
      }
      const newEditingCredits = { ...editingCredits };
      delete newEditingCredits[courseId];
      setEditingCredits(newEditingCredits);
    } else {
      console.log('[CourseList] No new value in editingCredits');
    }
  };

  const handleGradeSelect = (courseId: string, grade: string) => {
    onUpdateCourse(courseId, { grade });
    setShowGradeDropdown(null);
  };

  const gradeOptions = GRADE_POINTS.map(gp => gp.grade);

  return (
    <View style={styles.container}>
      {groupedCourses.map((group) => (
        <View key={group.semester} style={styles.semesterGroup}>
          {/* Only show semester header if not filtering by a specific semester */}
          {!selectedSemester && (
            <Text style={styles.semesterHeader}>{group.semester}</Text>
          )}
          {group.courses.map((course) => {
            const timeText = formatTime(course);
            const creditsValue = editingCredits[course.id] !== undefined 
              ? editingCredits[course.id] 
              : course.credits.toString();
            
            return (
              <View key={course.id} style={styles.courseCard}>
                <View style={styles.courseContent}>
                  <View style={styles.courseHeader}>
                    <View style={styles.courseHeaderLeft}>
                      <Text style={styles.courseName} numberOfLines={1}>
                        {course.name}
                      </Text>
                      {timeText && (
                        <Text style={styles.courseTime}>{timeText}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => onDeleteCourse(course.id)}
                      style={styles.deleteButton}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="trash-outline" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.courseFields}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Credits</Text>
                      <TextInput
                        style={styles.fieldInputText}
                        value={creditsValue}
                        onChangeText={(value) => handleCreditsChange(course.id, value)}
                        onBlur={() => handleCreditsBlur(course.id, course.credits)}
                        keyboardType="numeric"
                        selectTextOnFocus
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Grade</Text>
                      <TouchableOpacity
                        style={styles.fieldInput}
                        onPress={() => setShowGradeDropdown(course.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.fieldValue}>{course.grade}</Text>
                        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}

      {/* Grade Dropdown Modal */}
      {showGradeDropdown && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowGradeDropdown(null)}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowGradeDropdown(null)}
          >
            <View style={styles.dropdownContainer}>
              <ScrollView
                style={styles.dropdownScroll}
                showsVerticalScrollIndicator={false}
              >
                {gradeOptions.map((grade) => (
                  <TouchableOpacity
                    key={grade}
                    style={styles.dropdownItem}
                    onPress={() => handleGradeSelect(showGradeDropdown, grade)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownItemText}>{grade}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    gap: 24,
  },
  semesterGroup: {
    gap: 16,
  },
  semesterHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  courseContent: {
    flex: 1,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  courseHeaderLeft: {
    flex: 1,
    marginRight: 16,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  courseTime: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B6B6B',
    letterSpacing: -0.2,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
  },
  courseFields: {
    flexDirection: 'row',
    gap: 16,
  },
  fieldGroup: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#8A8A8A',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  fieldInput: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldInputText: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 40,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.2,
    width: '100%',
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.2,
    flex: 1,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '70%',
    maxWidth: 200,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  dropdownScroll: {
    maxHeight: 400,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#111827',
    letterSpacing: -0.2,
  },
});

