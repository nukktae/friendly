import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getSemesterDisplayName } from '@/src/utils/semesterUtils';

interface EmptySemesterViewProps {
  semester: string;
  onAddManually: () => void;
  onUploadPhoto: () => void;
}

export const EmptySemesterView: React.FC<EmptySemesterViewProps> = ({
  semester,
  onAddManually,
  onUploadPhoto,
}) => {
  const displaySemester = getSemesterDisplayName(semester);
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="document-text-outline" size={32} color="#D1D5DB" />
        </View>
        <Text style={styles.title}>{displaySemester}</Text>
        <Text style={styles.subtitle}>Begin tracking your academic progress</Text>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onAddManually}
            activeOpacity={0.6}
          >
            <Text style={styles.actionText}>Add Course</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onUploadPhoto}
            activeOpacity={0.6}
          >
            <Text style={styles.actionText}>Import</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#18181B',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: '#71717A',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#E4E4E7',
    overflow: 'hidden',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 0.5,
    height: 24,
    backgroundColor: '#E4E4E7',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3F3F46',
    letterSpacing: -0.1,
  },
});

