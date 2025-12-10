import AssignmentDetailScreen from '@/src/screens/assignments/AssignmentDetailScreen';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function Page() {
  const params = useLocalSearchParams();
  const { id, classId } = params;

  return (
    <AssignmentDetailScreen
      id={id as string}
      classId={classId as string}
    />
  );
}
