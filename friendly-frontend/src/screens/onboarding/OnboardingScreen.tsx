import { OnboardingData } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface OnboardingScreenProps {
  onComplete: (data: OnboardingData) => void;
  onBack?: () => void;
}

const { width } = Dimensions.get('window');

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingData>({
    fullName: '',
    nickname: '',
    university: ''
  });
  const [fadeAnim] = useState(new Animated.Value(1));
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [filteredUniversities, setFilteredUniversities] = useState<string[]>([]);

  const steps = [
    {
      title: "What's your name?",
      subtitle: "We'd love to know what to call you",
      placeholder: "Enter your full name",
      field: 'fullName' as keyof OnboardingData,
      icon: 'person-outline',
      required: true
    },
    {
      title: "What should we call you?",
      subtitle: "Pick a nickname for your profile",
      placeholder: "Enter your nickname",
      field: 'nickname' as keyof OnboardingData,
      icon: 'at-outline',
      required: false
    },
    {
      title: "Where do you study?",
      subtitle: "Tell us about your university",
      placeholder: "Enter your university name",
      field: 'university' as keyof OnboardingData,
      icon: 'school-outline',
      required: true
    }
  ];

  // University data - will be loaded from Korean Government API with fallback
  const [universities, setUniversities] = useState<string[]>([]);
  const [isLoadingUniversities, setIsLoadingUniversities] = useState(false);

  const currentStepData = steps[currentStep];

  // Load universities when component mounts or when reaching university step
  useEffect(() => {
    if (currentStepData.field === 'university') {
      fetchUniversities();
    }
  }, [currentStep]);

  // Load universities from mock data
  const fetchUniversities = async () => {
    if (universities.length > 0) return; // Already loaded
    
    setIsLoadingUniversities(true);
    try {
      // Use mock data directly - no API calls
      const mockUniversities = [
        '서울대학교 (Seoul National University)',
        '연세대학교 (Yonsei University)',
        '고려대학교 (Korea University)',
        '성균관대학교 (Sungkyunkwan University)',
        '한양대학교 (Hanyang University)',
        '중앙대학교 (Chung-Ang University)',
        '홍익대학교 (Hongik University)',
        '동국대학교 (Dongguk University)',
        '경희대학교 (Kyung Hee University)',
        '이화여자대학교 (Ewha Womans University)',
        '서강대학교 (Sogang University)',
        '국민대학교 (Kookmin University)',
        '숙명여자대학교 (Sookmyung Women\'s University)',
        '아주대학교 (Ajou University)',
        '인하대학교 (Inha University)',
        '부산대학교 (Pusan National University)',
        '경북대학교 (Kyungpook National University)',
        '전남대학교 (Chonnam National University)',
        '충남대학교 (Chungnam National University)',
        '강원대학교 (Kangwon National University)',
        '제주대학교 (Jeju National University)',
        '울산과학기술원 (UNIST)',
        '한국과학기술원 (KAIST)',
        '포스텍 (POSTECH)',
        '광주과학기술원 (GIST)',
        'Harvard University',
        'Stanford University',
        'Massachusetts Institute of Technology (MIT)',
        'University of California, Berkeley',
        'University of Cambridge',
        'University of Oxford',
        'Princeton University',
        'Yale University',
        'Columbia University',
        'University of Chicago',
        'California Institute of Technology',
        'University of Pennsylvania',
        'Johns Hopkins University',
        'Duke University',
        'Northwestern University',
        'Cornell University',
        'University of Michigan',
        'Carnegie Mellon University',
        'New York University',
        'University of California, Los Angeles',
        'University of Southern California',
        'University of Washington',
        'University of Texas at Austin',
        'Georgia Institute of Technology',
        'University of Illinois at Urbana-Champaign',
        'University of Wisconsin-Madison',
        'University of North Carolina at Chapel Hill',
        'Boston University',
        'Rice University',
        'Emory University',
        'University of Virginia',
        'University of California, San Diego',
        'University of California, Irvine',
        'University of California, Davis',
        'University of California, Santa Barbara',
        'University of Florida',
        'Ohio State University',
        'Pennsylvania State University',
        'University of Minnesota',
        'Purdue University',
        'Indiana University',
        'University of Maryland',
        'University of Pittsburgh',
        'Rutgers University',
        'University of Connecticut',
        'University of Delaware',
        'University of Iowa',
        'University of Kansas',
        'University of Kentucky',
        'University of Missouri',
        'University of Nebraska',
        'University of Oklahoma',
        'University of Oregon',
        'University of Tennessee',
        'University of Utah',
        'University of Vermont',
        'University of Wyoming',
        'Arizona State University',
        'University of Arizona',
        'University of Colorado',
        'University of Hawaii',
        'University of Idaho',
        'University of Montana',
        'University of Nevada',
        'University of New Mexico',
        'University of North Dakota',
        'University of South Dakota',
        'Washington State University',
        'University of Alaska',
        'University of Arkansas',
        'University of Louisiana',
        'University of Mississippi',
        'University of South Carolina',
        'University of Alabama',
        'University of Maine',
        'University of New Hampshire',
        'University of Rhode Island',
        'West Virginia University'
      ];
      setUniversities(mockUniversities);
    } catch (error) {
      console.error('Error loading universities:', error);
    } finally {
      setIsLoadingUniversities(false);
    }
  };

  // Filter universities based on input
  const filterUniversities = (query: string) => {
    if (query.length < 2) {
      setFilteredUniversities([]);
      setShowUniversityDropdown(false);
      return;
    }

    const filtered = universities.filter(university =>
      university.toLowerCase().includes(query.toLowerCase()) ||
      university.includes(query)
    ).slice(0, 10); // Limit to 10 results

    setFilteredUniversities(filtered);
    setShowUniversityDropdown(filtered.length > 0);
  };

  // Handle university input change
  const handleUniversityInputChange = (text: string) => {
    setFormData(prev => ({ ...prev, university: text }));
    filterUniversities(text);
  };

  // Select university from dropdown
  const selectUniversity = (university: string) => {
    setFormData(prev => ({ ...prev, university }));
    setShowUniversityDropdown(false);
    setFilteredUniversities([]);
  };

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    callback();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      animateTransition(() => {
        setCurrentStep(currentStep + 1);
      });
    } else {
      // Complete onboarding
      onComplete(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      animateTransition(() => {
        setCurrentStep(currentStep - 1);
      });
    } else if (onBack) {
      onBack();
    }
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      animateTransition(() => {
        setCurrentStep(currentStep + 1);
      });
    } else {
      onComplete(formData);
    }
  };

  const isCurrentStepValid = () => {
    const value = formData[currentStepData.field];
    return currentStepData.required ? value.trim().length > 0 : true;
  };

  const updateFormData = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderProgressDots = () => {
    return (
      <View style={styles.progressContainer}>
        {steps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === currentStep ? styles.progressDotActive : styles.progressDotInactive
            ]}
          />
        ))}
      </View>
    );
  };

  const renderStepContent = () => {
    return (
      <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons 
            name={currentStepData.icon as any} 
            size={48} 
            color="#4a4a4a" 
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>{currentStepData.title}</Text>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>

        {/* Input Field */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={currentStepData.placeholder}
            placeholderTextColor="#999"
            value={formData[currentStepData.field]}
            onChangeText={
              currentStepData.field === 'university' 
                ? handleUniversityInputChange 
                : (value) => updateFormData(currentStepData.field, value)
            }
            autoFocus={true}
            autoCapitalize={currentStepData.field === 'fullName' ? 'words' : 'none'}
            returnKeyType="next"
            onSubmitEditing={handleNext}
          />
          
          {/* University Dropdown */}
          {currentStepData.field === 'university' && showUniversityDropdown && (
            <View style={styles.dropdownContainer}>
              {isLoadingUniversities ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading universities...</Text>
                </View>
              ) : (
                <ScrollView 
                  style={styles.dropdown}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {filteredUniversities.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.dropdownItem}
                      onPress={() => selectUniversity(item)}
                    >
                      <Text style={styles.dropdownItemText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        {/* Action Buttons - Hide when dropdown is shown */}
        {!(currentStepData.field === 'university' && showUniversityDropdown) && (
          <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !isCurrentStepValid() && styles.continueButtonDisabled
            ]}
            onPress={handleNext}
            disabled={!isCurrentStepValid()}
          >
            <Text style={[
              styles.continueButtonText,
              !isCurrentStepValid() && styles.continueButtonTextDisabled
            ]}>
              {currentStep === steps.length - 1 ? 'Complete' : 'Continue'}
            </Text>
          </TouchableOpacity>

          {/* Skip button for optional fields */}
          {!currentStepData.required && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
        )}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            {renderProgressDots()}
            
            {/* Back Button */}
            {currentStep > 0 && (
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={24} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* Step Content */}
          {renderStepContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    backgroundColor: '#000000',
  },
  progressDotInactive: {
    backgroundColor: '#e0e0e0',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#111827',
    backgroundColor: 'white',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  continueButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#999',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 200,
    zIndex: 9999,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdown: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default OnboardingScreen;
