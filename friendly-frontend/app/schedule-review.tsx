import { useApp } from '@/src/context/AppContext';
import ScheduleReviewScreen from '@/src/screens/schedule/ScheduleReviewScreen';
import { ScheduleItem } from '@/src/services/schedule/scheduleAIService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

export default function ScheduleReviewRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userProfile, user } = useApp();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const hasParsedRef = useRef(false);
  const hasNavigatedBackRef = useRef(false);

  useEffect(() => {
    if (hasParsedRef.current) return;

    const itemsParam = params.items;
    const itemsString = Array.isArray(itemsParam) ? itemsParam[0] : itemsParam;
    const scheduleIdParam = params.scheduleId;
    const scheduleIdString = Array.isArray(scheduleIdParam) ? scheduleIdParam[0] : scheduleIdParam;
    
    if (itemsString && typeof itemsString === 'string') {
      try {
        const items: ScheduleItem[] = JSON.parse(itemsString);
        // Filter out "Room TBD" locations
        const filteredItems = items.map(item => ({
          ...item,
          location: item.location && item.location.toLowerCase().includes('room tbd') 
            ? undefined 
            : item.location
        }));
        setScheduleItems(filteredItems);
        
        // Set scheduleId if provided
        if (scheduleIdString && typeof scheduleIdString === 'string') {
          setScheduleId(scheduleIdString);
        }
        
        hasParsedRef.current = true;
      } catch (error) {
        console.error('Failed to parse schedule items:', error);
        if (!hasNavigatedBackRef.current) {
          hasNavigatedBackRef.current = true;
          router.back();
        }
      }
    } else if (!hasNavigatedBackRef.current) {
      hasNavigatedBackRef.current = true;
      router.back();
    }
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleSaveSuccess = () => {
    router.replace('/(tabs)');
  };

  // Use user.uid as fallback; allow guest saves when not signed in
  const userId = userProfile?.uid || user?.uid || 'guest';

  if (scheduleItems.length === 0) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScheduleReviewScreen
        initialItems={scheduleItems}
        scheduleId={scheduleId}
        userId={userId}
        userProfile={userProfile}
        onBack={handleBack}
        onSaveSuccess={handleSaveSuccess}
      />
    </View>
  );
}
