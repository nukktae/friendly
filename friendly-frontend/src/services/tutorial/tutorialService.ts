import { getStorageAdapter } from '@/src/lib/storage';
import { isWeb } from '@/src/lib/platform';

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

// Helper to check if storage is available
const isStorageAvailable = (): boolean => {
  if (isWeb()) {
    return typeof window !== 'undefined';
  }
  return true; // Native platforms should have storage adapter set
};

class TutorialService {
  private static instance: TutorialService;
  private completedTutorials: Set<string> = new Set();
  private isLoading: boolean = false;

  private constructor() {
    console.log('[TutorialService] Constructor called, initializing...');
    // Only load if storage is available
    if (isStorageAvailable()) {
      console.log('[TutorialService] Storage available, loading completed tutorials');
      this.loadCompletedTutorials();
    } else {
      console.log('[TutorialService] Storage not available in constructor');
    }
  }

  static getInstance(): TutorialService {
    if (!TutorialService.instance) {
      TutorialService.instance = new TutorialService();
    }
    return TutorialService.instance;
  }

  private async loadCompletedTutorials(): Promise<void> {
    console.log('[TutorialService] 📥 loadCompletedTutorials called');
    // Double-check availability before accessing storage
    if (!isStorageAvailable()) {
      console.log('[TutorialService] ❌ Storage not available, skipping load');
      return;
    }

    if (this.isLoading) {
      console.log('[TutorialService] ⏳ Already loading, skipping duplicate call');
      return;
    }

    this.isLoading = true;
    console.log('[TutorialService] 🔍 Starting to load completed tutorials from storage');
    try {
      const storage = getStorageAdapter();
      console.log('[TutorialService] 📦 Storage adapter obtained:', typeof storage);
      console.log('[TutorialService] 🔑 Looking for key:', TUTORIAL_STORAGE_KEY);
      const stored = await storage.getItem(TUTORIAL_STORAGE_KEY);
      console.log('[TutorialService] 📄 Raw storage value:', stored);
      console.log('[TutorialService] 📄 Storage value type:', typeof stored);
      console.log('[TutorialService] 📄 Storage value length:', stored?.length);
      
      if (stored) {
        try {
          const completed = JSON.parse(stored);
          console.log('[TutorialService] ✅ Parsed completed tutorials:', completed);
          this.completedTutorials = new Set(completed);
          console.log('[TutorialService] ✅ Loaded completed tutorials into Set:', Array.from(this.completedTutorials));
        } catch (parseError) {
          console.error('[TutorialService] ❌ Failed to parse stored value:', parseError);
          console.error('[TutorialService] Raw value that failed:', stored);
        }
      } else {
        console.log('[TutorialService] ℹ️ No stored tutorials found, starting with empty set');
      }
    } catch (error) {
      // Silently fail if storage is not available (e.g., during SSR)
      if (error instanceof Error && error.message.includes('window is not defined')) {
        console.warn('[TutorialService] ⚠️ Storage not available (SSR), skipping tutorial load');
      } else {
        console.error('[TutorialService] ❌ Failed to load completed tutorials:', error);
        console.error('[TutorialService] Error stack:', error instanceof Error ? error.stack : 'No stack');
      }
    } finally {
      this.isLoading = false;
      console.log('[TutorialService] ✅ Finished loading completed tutorials. Final set:', Array.from(this.completedTutorials));
    }
  }

  async markTutorialCompleted(tutorialId: string): Promise<void> {
    console.log('[TutorialService] markTutorialCompleted called for:', tutorialId);
    if (!isStorageAvailable()) {
      console.log('[TutorialService] Storage not available, cannot mark as completed');
      return;
    }

    try {
      this.completedTutorials.add(tutorialId);
      const storage = getStorageAdapter();
      const completedArray = Array.from(this.completedTutorials);
      console.log('[TutorialService] Saving completed tutorials to storage:', completedArray);
      console.log('[TutorialService] Storage key:', TUTORIAL_STORAGE_KEY);
      console.log('[TutorialService] Storage value to save:', JSON.stringify(completedArray));
      await storage.setItem(
        TUTORIAL_STORAGE_KEY,
        JSON.stringify(completedArray)
      );
      
      // Verify it was saved
      const verify = await storage.getItem(TUTORIAL_STORAGE_KEY);
      console.log('[TutorialService] Verification - read back from storage:', verify);
      
      console.log('[TutorialService] ✅ Successfully marked tutorial as completed:', tutorialId);
      console.log('[TutorialService] Current completed tutorials:', Array.from(this.completedTutorials));
    } catch (error) {
      console.error('[TutorialService] ❌ Failed to mark tutorial as completed:', error);
      throw error;
    }
  }

  isTutorialCompleted(tutorialId: string): boolean {
    const isCompleted = this.completedTutorials.has(tutorialId);
    console.log(`[TutorialService] isTutorialCompleted(${tutorialId}):`, isCompleted, '| Current set:', Array.from(this.completedTutorials));
    return isCompleted;
  }

  async waitForLoad(): Promise<void> {
    console.log('[TutorialService] waitForLoad called, isLoading:', this.isLoading);
    // Wait for loading to complete
    let waitCount = 0;
    while (this.isLoading) {
      waitCount++;
      console.log(`[TutorialService] Waiting for load to complete... (${waitCount})`);
      await new Promise(resolve => setTimeout(resolve, 50));
      if (waitCount > 100) {
        console.warn('[TutorialService] waitForLoad timeout after 5 seconds');
        break;
      }
    }
    console.log('[TutorialService] Load finished, completedTutorials size:', this.completedTutorials.size);
    // If not loading but completedTutorials is empty, try loading once more
    if (this.completedTutorials.size === 0 && isStorageAvailable()) {
      console.log('[TutorialService] Set is empty, attempting to reload from storage');
      await this.loadCompletedTutorials();
    }
    console.log('[TutorialService] waitForLoad complete, final set:', Array.from(this.completedTutorials));
  }

  async resetTutorial(tutorialId: string): Promise<void> {
    if (!isStorageAvailable()) {
      return;
    }

    try {
      this.completedTutorials.delete(tutorialId);
      const storage = getStorageAdapter();
      await storage.setItem(
        TUTORIAL_STORAGE_KEY,
        JSON.stringify(Array.from(this.completedTutorials))
      );
    } catch (error) {
      console.error('Failed to reset tutorial:', error);
    }
  }

  async resetAllTutorials(): Promise<void> {
    if (!isStorageAvailable()) {
      return;
    }

    try {
      this.completedTutorials.clear();
      const storage = getStorageAdapter();
      await storage.removeItem(TUTORIAL_STORAGE_KEY);
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
  waitForLoad: () => {
    return getInstance().waitForLoad();
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

