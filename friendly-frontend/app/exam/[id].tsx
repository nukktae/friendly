import ExamDetailScreen from '@/src/screens/exams/ExamDetailScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useApp } from '@/src/context/AppContext';
import { getExamById } from '@/src/services/classes/classResourcesService';
import { ClassExam } from '@/src/types';

export default function ExamDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useApp();
  const [exam, setExam] = useState<ClassExam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { id, classId } = params;

  useEffect(() => {
    const loadExam = async () => {
      if (!id || !classId || !user?.uid) {
        setError('Missing required parameters');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await getExamById(id as string, classId as string, user.uid);
        setExam(data);
      } catch (err: any) {
        console.error('Error loading exam:', err);
        setError(err.message || 'Failed to load exam');
      } finally {
        setIsLoading(false);
      }
    };

    loadExam();
  }, [id, classId, user?.uid]);

  const handleBack = () => {
    try {
      if (router.canGoBack && router.canGoBack()) {
        router.back();
      } else {
        router.push('/(tabs)/explore');
      }
    } catch (error) {
      router.push('/(tabs)/explore');
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#0F3F2E" />
      </View>
    );
  }

  if (error || !exam) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20 }}>
        <ExamDetailScreen
          id={id as string}
          title=""
          date=""
          description=""
          onBack={handleBack}
          error={error || 'Exam not found'}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ExamDetailScreen
        id={exam.id}
        title={exam.title}
        date={exam.date || ''}
        description={exam.description || ''}
        durationMinutes={exam.durationMinutes}
        location={exam.location}
        instructions={exam.instructions}
        status={exam.status}
        classId={exam.classId || (classId as string)}
        onBack={handleBack}
      />
    </View>
  );
}

