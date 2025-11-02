import ClassDetailScreen from '@/src/screens/classes/ClassDetailScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function ClassDetailRoute() {
  const router = useRouter();
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

  const handleBack = () => {
    router.back();
  };

  const handleRecordPress = () => {
    router.push('/record');
  };

  return (
    <View style={{ flex: 1 }}>
      <ClassDetailScreen
        id={id as string}
        title={title as string}
        time={time as string}
        type={type as string}
        location={location as string | undefined}
        instructor={instructor as string | undefined}
        color={color as string | undefined}
        onBack={handleBack}
        onRecordPress={handleRecordPress}
      />
    </View>
  );
}
