import CreateAssignmentScreen from '@/src/screens/assignments/CreateAssignmentScreen';
import { useLocalSearchParams } from 'expo-router';

export default function Page() {
  const params = useLocalSearchParams<{ 
    classId?: string;
  }>();

  return (
    <CreateAssignmentScreen
      classId={params.classId}
    />
  );
}

