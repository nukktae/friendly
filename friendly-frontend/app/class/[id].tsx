import ClassDetailScreen from '@/src/screens/classes/ClassDetailScreen';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function Page() {
  const params = useLocalSearchParams();
  
  const {
    id,
    title,
    time,
    type,
    location,
    instructor,
    color
  } = params;

  return (
    <ClassDetailScreen
      id={id as string}
      title={title as string}
      time={time as string}
      type={type as string}
      location={location as string | undefined}
      instructor={instructor as string | undefined}
      color={color as string | undefined}
    />
  );
}
