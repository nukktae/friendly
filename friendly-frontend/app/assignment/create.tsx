import CreateAssignmentScreen from '@/src/screens/assignments/CreateAssignmentScreen';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function CreateAssignmentRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 
    classId?: string;
    title?: string;
    time?: string;
    type?: string;
    location?: string;
    color?: string;
  }>();

  const handleBack = () => {
    // Try to go back first, if that fails use explicit navigation
    try {
      if (params.classId) {
        // Navigate back to the class detail screen with all necessary params
        router.push({
          pathname: '/class/[id]',
          params: { 
            id: params.classId,
            // Preserve other params if they exist
            ...(params.title && { title: params.title }),
            ...(params.time && { time: params.time }),
            ...(params.type && { type: params.type }),
            ...(params.location && { location: params.location }),
            ...(params.color && { color: params.color }),
          },
        });
      } else {
        // Navigate to classes list if no classId
        router.push('/(tabs)/explore');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to tabs if navigation fails
      router.push('/(tabs)/explore');
    }
  };

  return (
    <CreateAssignmentScreen
      classId={params.classId}
      onBack={handleBack}
      onSuccess={() => {
        // Refresh assignments list if needed
      }}
    />
  );
}

