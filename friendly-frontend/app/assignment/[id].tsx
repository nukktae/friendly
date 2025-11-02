import AssignmentDetailScreen from '@/src/screens/assignments/AssignmentDetailScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function AssignmentDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const {
    id,
    title,
    date,
    time,
    type,
    location,
    color
  } = params;

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <AssignmentDetailScreen
        id={id as string}
        title={title as string}
        date={date as string}
        time={time as string}
        type={type as string}
        location={location as string | undefined}
        color={color as string | undefined}
        onBack={handleBack}
      />
    </View>
  );
}
