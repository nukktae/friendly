import { useApp } from '@/src/context/AppContext';
import ScheduleReviewScreen from '@/src/screens/schedule/ScheduleReviewScreen';
import { ScheduleItem } from '@/src/services/schedule/scheduleAIService';
import scheduleAIService from '@/src/services/schedule/scheduleAIService';
import { ScheduleReviewSkeleton } from '@/src/components/schedule/ScheduleReviewSkeleton';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

export default function ScheduleReviewRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userProfile, user } = useApp();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasParsedRef = useRef(false);
  const hasNavigatedBackRef = useRef(false);
  const hasAnalyzedRef = useRef(false);

  useEffect(() => {
    // Check if we need to analyze an image
    const isLoadingParam = params.isLoading;
    const isLoadingString = Array.isArray(isLoadingParam) ? isLoadingParam[0] : isLoadingParam;
    const imageUriParam = params.imageUri;
    const imageUri = Array.isArray(imageUriParam) ? imageUriParam[0] : imageUriParam;
    const userIdParam = params.userId;
    const userIdString = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;

    if (isLoadingString === 'true' && imageUri && userIdString && !hasAnalyzedRef.current) {
      hasAnalyzedRef.current = true;
      setIsLoading(true);
      
      // Start analysis
      scheduleAIService.analyzeScheduleImage(imageUri, userIdString)
        .then((result) => {
          // Filter out "Room TBD" locations
          const filteredItems = result.items.map(item => ({
            ...item,
            location: item.location && item.location.toLowerCase().includes('room tbd') 
              ? undefined 
              : item.location
          }));
          setScheduleItems(filteredItems);
          setScheduleId(result.scheduleId);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Failed to analyze image:', error);
          setIsLoading(false);
          Alert.alert('Error', 'Failed to analyze your schedule image. Please try again.', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        });
      return;
    }

    // Handle existing items (from direct navigation with results)
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
    } else if (!hasNavigatedBackRef.current && !isLoadingString) {
      hasNavigatedBackRef.current = true;
      router.back();
    }
  }, [params]);

  const handleBack = () => {
    router.back();
  };

  const handleSaveSuccess = (result?: {
    success: boolean;
    scheduleId: string;
    userId: string;
    lecturesCreated: Array<{
      lectureId: string;
      title: string;
      day: string;
      place: string | null;
      time: string;
    }>;
    count: number;
    message: string;
  }) => {
    // Navigate to the first created class if available
    if (result && result.lecturesCreated && result.lecturesCreated.length > 0) {
      const firstLecture = result.lecturesCreated[0];
      router.replace({
        pathname: '/class/[id]',
        params: {
          id: firstLecture.lectureId,
          title: firstLecture.title,
          time: firstLecture.time,
          type: 'class',
          location: firstLecture.place || '',
        },
      });
    } else {
      // Fallback to classes screen if no lectures were created
      router.replace('/(tabs)/explore');
    }
  };

  // Use user.uid as fallback; allow guest saves when not signed in
  const userId = userProfile?.uid || user?.uid || 'guest';

  // Show skeleton while loading
  if (isLoading || scheduleItems.length === 0) {
    return <ScheduleReviewSkeleton />;
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
