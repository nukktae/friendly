import ExamDetailScreen from '@/src/screens/exams/ExamDetailScreen';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function Page() {
  const params = useLocalSearchParams();
  const { id, classId } = params;

  return (
    <ExamDetailScreen
      id={id as string}
      classId={classId as string}
    />
  );
}

