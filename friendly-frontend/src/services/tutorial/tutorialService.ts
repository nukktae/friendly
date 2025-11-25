import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // ID of the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right';
  showSkip?: boolean;
}

const TUTORIAL_STORAGE_KEY = '@tutorial_completed';

export interface TutorialConfig {
  id: string;
  name: string;
  steps: TutorialStep[];
  autoStart?: boolean;
}

// Helper to check if AsyncStorage is available (window exists for web)
const isAsyncStorageAvailable = (): boolean => {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined';
  }
  return true; // Native platforms always have AsyncStorage
};

class TutorialService {
  private static instance: TutorialService;
  private completedTutorials: Set<string> = new Set();
  private isLoading: boolean = false;

  private constructor() {
    // Only load if AsyncStorage is available
    if (isAsyncStorageAvailable()) {
      this.loadCompletedTutorials();
    }
  }

  static getInstance(): TutorialService {
    if (!TutorialService.instance) {
      TutorialService.instance = new TutorialService();
    }
    return TutorialService.instance;
  }

  private async loadCompletedTutorials(): Promise<void> {
    // Double-check availability before accessing AsyncStorage
    if (!isAsyncStorageAvailable()) {
      return;
    }

    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    try {
      const stored = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (stored) {
        const completed = JSON.parse(stored);
        this.completedTutorials = new Set(completed);
      }
    } catch (error) {
      // Silently fail if AsyncStorage is not available (e.g., during SSR)
      if (error instanceof Error && error.message.includes('window is not defined')) {
        console.warn('AsyncStorage not available (SSR), skipping tutorial load');
      } else {
        console.error('Failed to load completed tutorials:', error);
      }
    } finally {
      this.isLoading = false;
    }
  }

  async markTutorialCompleted(tutorialId: string): Promise<void> {
    if (!isAsyncStorageAvailable()) {
      return;
    }

    try {
      this.completedTutorials.add(tutorialId);
      await AsyncStorage.setItem(
        TUTORIAL_STORAGE_KEY,
        JSON.stringify(Array.from(this.completedTutorials))
      );
    } catch (error) {
      console.error('Failed to mark tutorial as completed:', error);
    }
  }

  isTutorialCompleted(tutorialId: string): boolean {
    return this.completedTutorials.has(tutorialId);
  }

  async resetTutorial(tutorialId: string): Promise<void> {
    if (!isAsyncStorageAvailable()) {
      return;
    }

    try {
      this.completedTutorials.delete(tutorialId);
      await AsyncStorage.setItem(
        TUTORIAL_STORAGE_KEY,
        JSON.stringify(Array.from(this.completedTutorials))
      );
    } catch (error) {
      console.error('Failed to reset tutorial:', error);
    }
  }

  async resetAllTutorials(): Promise<void> {
    if (!isAsyncStorageAvailable()) {
      return;
    }

    try {
      this.completedTutorials.clear();
      await AsyncStorage.removeItem(TUTORIAL_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset all tutorials:', error);
    }
  }

  // Predefined tutorial configurations
  getDashboardTutorial(): TutorialConfig {
    return {
      id: 'dashboard_tutorial',
      name: 'Dashboard Overview',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Your Dashboard!',
          description: 'This is your main hub where you can access all features. Let\'s take a quick tour.',
          showSkip: true,
        },
        {
          id: 'gpa_tab',
          title: 'GPA Calculator',
          description: 'Track your academic progress, calculate your GPA, and see how many credits you need to graduate.',
          targetElement: 'gpa_tab',
          position: 'bottom',
        },
        {
          id: 'community_tab',
          title: 'Community Hub',
          description: 'Connect with other students, share notes, and join study groups in the community section.',
          targetElement: 'community_tab',
          position: 'bottom',
        },
        {
          id: 'profile_tab',
          title: 'Your Profile',
          description: 'Access your profile settings, view your enrolled classes, and manage your account.',
          targetElement: 'profile_tab',
          position: 'bottom',
        },
        {
          id: 'add_course',
          title: 'Add Courses',
          description: 'Use the + button to add courses and track your GPA. Enter your grades and credits to see your progress.',
          targetElement: 'add_button',
          position: 'top',
        },
        {
          id: 'complete',
          title: 'You\'re All Set!',
          description: 'You now know the basics. Start exploring and make the most of your academic journey!',
          showSkip: false,
        },
      ],
      autoStart: true,
    };
  }

  getScheduleTutorial(): TutorialConfig {
    return {
      id: 'schedule_tutorial',
      name: 'Schedule Management',
      steps: [
        {
          id: 'schedule_overview',
          title: 'Your Schedule',
          description: 'Here you can view all your classes and schedules in both calendar and list views.',
          showSkip: true,
        },
        {
          id: 'add_schedule',
          title: 'Add New Schedule',
          description: 'Tap the + button to add a new schedule. You can take a photo of your schedule or import from Google Calendar.',
          targetElement: 'add_schedule_button',
          position: 'top',
        },
        {
          id: 'view_toggle',
          title: 'Switch Views',
          description: 'Toggle between calendar view and list view to see your schedule in different formats.',
          targetElement: 'view_toggle',
          position: 'top',
        },
        {
          id: 'edit_schedule',
          title: 'Edit Schedule',
          description: 'Tap on any schedule item to edit, move, or delete it. You can also use voice commands for quick edits.',
          targetElement: 'schedule_item',
          position: 'bottom',
        },
      ],
      autoStart: false,
    };
  }

  getCommunityTutorial(): TutorialConfig {
    return {
      id: 'community_tutorial',
      name: 'Community Features',
      steps: [
        {
          id: 'community_overview',
          title: 'Community Hub',
          description: 'Connect with fellow students, share resources, and collaborate on projects.',
          showSkip: true,
        },
        {
          id: 'create_post',
          title: 'Create Posts',
          description: 'Share notes, ask questions, or start discussions with the community.',
          targetElement: 'create_post_button',
          position: 'top',
        },
        {
          id: 'filter_posts',
          title: 'Filter Content',
          description: 'Use the filter buttons to find specific types of content like notes, questions, or announcements.',
          targetElement: 'filter_buttons',
          position: 'top',
        },
        {
          id: 'interact',
          title: 'Engage',
          description: 'Like, comment, and share posts to build connections with your peers.',
          targetElement: 'post_interactions',
          position: 'bottom',
        },
      ],
      autoStart: false,
    };
  }
}

// Lazy initialization - only create instance when actually needed
// This prevents the constructor from running during module load/SSR
let tutorialServiceInstance: TutorialService | null = null;

const getInstance = (): TutorialService => {
  if (!tutorialServiceInstance) {
    tutorialServiceInstance = TutorialService.getInstance();
  }
  return tutorialServiceInstance;
};

export default {
  getInstance,
  // Expose methods directly for convenience
  markTutorialCompleted: (tutorialId: string) => {
    return getInstance().markTutorialCompleted(tutorialId);
  },
  isTutorialCompleted: (tutorialId: string) => {
    return getInstance().isTutorialCompleted(tutorialId);
  },
  resetTutorial: (tutorialId: string) => {
    return getInstance().resetTutorial(tutorialId);
  },
  resetAllTutorials: () => {
    return getInstance().resetAllTutorials();
  },
  getDashboardTutorial: () => {
    return getInstance().getDashboardTutorial();
  },
  getScheduleTutorial: () => {
    return getInstance().getScheduleTutorial();
  },
  getCommunityTutorial: () => {
    return getInstance().getCommunityTutorial();
  },
};

