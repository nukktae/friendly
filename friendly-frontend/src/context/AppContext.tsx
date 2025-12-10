import { AuthService } from "@/src/services/auth/authService";
import { ClassesService, PRODUCTS } from "@/src/services/classes/classesService";
import { FirestoreService } from "@/src/services/firestore/firestoreService";
import tutorialService, { TutorialConfig } from "@/src/services/tutorial/tutorialService";
import { Class, SortOption, User, UserProfile } from "@/src/types";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AppContextType {
  // Authentication
  isAuthenticated: boolean;
  user: User | null;
  userProfile: UserProfile | null;
  isOnboardingComplete: boolean;
  authInitialized: boolean;
  setIsOnboardingComplete: (completed: boolean) => void;
  loadUserProfile: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  isGoogleSignInAvailable: boolean;

  // Favorites
  favorites: Set<number>;
  toggleFavorite: (productId: number) => void;

  // Search & Filter
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  filteredProducts: Class[];

  // App actions
  logout: () => void;

  // Tutorial state
  showTutorial: boolean;
  currentTutorial: TutorialConfig | null;
  currentTutorialStep: number;
  startTutorial: (tutorialId: string, force?: boolean) => void;
  nextTutorialStep: () => void;
  previousTutorialStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetTutorials: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("default");

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentTutorial, setCurrentTutorial] = useState<TutorialConfig | null>(null);
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);

  // Helper function to load profile by uid
  const loadProfileByUid = async (uid: string) => {
    try {
      const profile = await FirestoreService.getUserProfile(uid);
      if (profile) {
        setUserProfile(profile);
        setIsOnboardingComplete(profile.onboardingCompleted);
      } else {
        // Profile doesn't exist yet - this is normal for new users
        setUserProfile(null);
        setIsOnboardingComplete(false);
      }
    } catch (error: any) {
      // FirestoreService now returns null instead of throwing for 404s
      // Only log unexpected errors
      if (!error?.message?.includes('Network request failed') && 
          !error?.message?.includes('Failed to fetch') &&
          !error?.message?.includes('not found') &&
          !error?.message?.includes('404')) {
        console.error('Error loading user profile:', error);
      }
      setUserProfile(null);
      setIsOnboardingComplete(false);
    }
  };

  // Function to load user profile explicitly
  const loadUserProfile = async () => {
    if (!user?.uid) return;
    await loadProfileByUid(user.uid);
  };

  // Listen to auth state changes
  useEffect(() => {
    // Configure Google Sign-In for mobile platforms
    AuthService.configureGoogleSignIn();
    
    // Check initial auth state synchronously to avoid race condition on refresh
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      const userObj = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        name: currentUser.displayName || undefined,
      };
      setIsAuthenticated(true);
      setUser(userObj);
      // Load profile immediately for initial auth check
      loadProfileByUid(currentUser.uid);
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setAuthInitialized(true);
    
    const unsubscribe = AuthService.onAuthStateChanged(async (user: User | null) => {
      if (user) {
        setIsAuthenticated(true);
        setUser(user);
        // Load profile immediately when auth state changes
        // This ensures onboarding state is loaded before navigation decisions
        await loadProfileByUid(user.uid);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setUserProfile(null);
        setIsOnboardingComplete(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Computed values
  const filteredProducts = React.useMemo(() => {
    return ClassesService.filterAndSortClasses(PRODUCTS, searchTerm, sortOption);
  }, [searchTerm, sortOption]);

  // Actions
  const toggleFavorite = (productId: number) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
  };

  // Tutorial functions
  const startTutorial = (tutorialId: string, force: boolean = false) => {
    console.log(`[Tutorial] Attempting to start tutorial: ${tutorialId}`);
    
    let tutorial: TutorialConfig;
    
    switch (tutorialId) {
      case 'dashboard':
        tutorial = tutorialService.getDashboardTutorial();
        break;
      case 'schedule':
        tutorial = tutorialService.getScheduleTutorial();
        break;
      case 'community':
        tutorial = tutorialService.getCommunityTutorial();
        break;
      default:
        console.warn(`Unknown tutorial ID: ${tutorialId}`);
        return;
    }

    // Check if tutorial is already completed (unless forced)
    const isCompleted = tutorialService.isTutorialCompleted(tutorial.id);
    console.log(`[Tutorial] ${tutorial.id} completed status:`, isCompleted);
    
    if (isCompleted && !force) {
      console.log(`[Tutorial] Skipping ${tutorialId} - already completed. Call with force=true to show again.`);
      return;
    }

    console.log(`[Tutorial] Starting tutorial ${tutorialId} with ${tutorial.steps.length} steps`);
    setCurrentTutorial(tutorial);
    setCurrentTutorialStep(0);
    setShowTutorial(true);
  };

  const nextTutorialStep = () => {
    if (currentTutorial && currentTutorialStep < currentTutorial.steps.length - 1) {
      setCurrentTutorialStep(currentTutorialStep + 1);
    }
  };

  const previousTutorialStep = () => {
    if (currentTutorialStep > 0) {
      setCurrentTutorialStep(currentTutorialStep - 1);
    }
  };

  const skipTutorial = async () => {
    console.log('[AppContext] skipTutorial called, currentTutorial:', currentTutorial?.id);
    if (currentTutorial) {
      await tutorialService.markTutorialCompleted(currentTutorial.id);
      // Verify it was saved
      const isNowCompleted = tutorialService.isTutorialCompleted(currentTutorial.id);
      console.log('[AppContext] Verification - tutorial is now completed:', isNowCompleted);
    }
    setShowTutorial(false);
    setCurrentTutorial(null);
    setCurrentTutorialStep(0);
    console.log('[AppContext] Tutorial skipped and hidden');
  };

  const completeTutorial = async () => {
    console.log('[AppContext] completeTutorial called, currentTutorial:', currentTutorial?.id);
    if (currentTutorial) {
      await tutorialService.markTutorialCompleted(currentTutorial.id);
      // Verify it was saved
      const isNowCompleted = tutorialService.isTutorialCompleted(currentTutorial.id);
      console.log(`[AppContext] ✅ Marked tutorial as completed: ${currentTutorial.id}`);
      console.log('[AppContext] Verification - tutorial is now completed:', isNowCompleted);
      if (!isNowCompleted) {
        console.error('[AppContext] ⚠️ WARNING: Tutorial completion was not saved properly!');
      }
    }
    setShowTutorial(false);
    setCurrentTutorial(null);
    setCurrentTutorialStep(0);
    console.log('[AppContext] Tutorial completed and hidden');
  };

  const resetTutorials = async () => {
    console.log('[Tutorial] Resetting all tutorials...');
    await tutorialService.resetAllTutorials();
    console.log('[Tutorial] All tutorials reset!');
  };

  const logout = async () => {
    try {
      console.log('Starting logout process...');
      await AuthService.logout();
      console.log('Firebase logout successful');
      
      // Clear saved credentials
      try {
        await AsyncStorage.removeItem('@remembered_credentials');
      } catch (error) {
        console.error('Failed to clear saved credentials:', error);
      }
      
      // Clear local state
      setFavorites(new Set());
      setSearchTerm("");
      setSortOption("default");
      
      // Note: Authentication state will be updated by onAuthStateChanged listener
      console.log('Logout process completed');
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await AuthService.login(email, password);
      // Auth state will be updated by onAuthStateChanged listener
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    try {
      await AuthService.signup(email, password, name);
      // Auth state will be updated by onAuthStateChanged listener
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      await AuthService.signInWithGoogle();
      // Auth state will be updated by onAuthStateChanged listener
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const value: AppContextType = {
    isAuthenticated,
    user,
    userProfile,
    isOnboardingComplete,
    authInitialized,
    setIsOnboardingComplete,
    loadUserProfile,
    login,
    signup,
    signInWithGoogle,
    isGoogleSignInAvailable: AuthService.isGoogleSignInAvailable(),
    favorites,
    toggleFavorite,
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    filteredProducts,
    logout,
    showTutorial,
    currentTutorial,
    currentTutorialStep,
    startTutorial,
    nextTutorialStep,
    previousTutorialStep,
    skipTutorial,
    completeTutorial,
    resetTutorials,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}