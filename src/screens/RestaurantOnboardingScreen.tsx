import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

// Import phase components
import {
  Phase1BasicInfo,
  Phase2MenuUpload,
  Phase3SpecialMenus,
  Phase4Images,
} from '../components/onboarding';

const { width } = Dimensions.get('window');

interface OnboardingData {
  // Phase 1 - Basic Info
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  instagram_handle: string;
  tiktok_handle: string;
  hours_monday: string;
  hours_tuesday: string;
  hours_wednesday: string;
  hours_thursday: string;
  hours_friday: string;
  hours_saturday: string;
  hours_sunday: string;

  // Phase 2 - Menu Upload
  regularMenuFile: any | null;

  // Phase 3 - Special Menus
  happyHourMenuFile: any | null;
  lunchMenuFile: any | null;
  happyHourDeals: Array<{
    title: string;
    description: string;
    price: number;
    days: string[];
    startTime: string;
    endTime: string;
  }>;

  // Phase 4 - Images
  logoFile: any | null;
  exteriorImageFile: any | null;
  interiorImageFile: any | null;
  foodImages: Array<{
    file: any;
    name: string;
    description: string;
  }>;
}

const phases = [
  { id: 1, title: 'Restaurant Info', description: 'Basic information about your restaurant' },
  { id: 2, title: 'Regular Menu', description: 'Upload your standard menu' },
  { id: 3, title: 'Special Menus', description: 'Happy hour and lunch specials (optional)' },
  { id: 4, title: 'Images & Branding', description: 'Logo, photos, and food images' },
];

export default function RestaurantOnboardingScreen({ navigation }: any) {
  const [currentPhase, setCurrentPhase] = useState(1);
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    instagram_handle: '',
    tiktok_handle: '',
    hours_monday: '',
    hours_tuesday: '',
    hours_wednesday: '',
    hours_thursday: '',
    hours_friday: '',
    hours_saturday: '',
    hours_sunday: '',
    regularMenuFile: null,
    happyHourMenuFile: null,
    lunchMenuFile: null,
    happyHourDeals: [],
    logoFile: null,
    exteriorImageFile: null,
    interiorImageFile: null,
    foodImages: [],
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigation.replace('Login');
        return;
      }

      setUserId(user.id);

      // Check if user already has a restaurant
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id, onboarding_completed, onboarding_step')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (restaurant) {
        if (restaurant.onboarding_completed) {
          navigation.replace('RestaurantDashboard');
        } else {
          setCurrentPhase(restaurant.onboarding_step || 1);
        }
      }
    };

    getUser();
  }, [navigation]);

  const updateOnboardingData = (updates: Partial<OnboardingData>) => {
    setOnboardingData((prev) => ({ ...prev, ...updates }));
  };

  const handlePhaseComplete = async (phaseData: Partial<OnboardingData>) => {
    setIsLoading(true);
    updateOnboardingData(phaseData);

    try {
      // Ensure we have a user id
      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          navigation.replace('Login');
          return;
        }
        effectiveUserId = user.id;
        setUserId(user.id);
      }

      // Merge current form state with phase updates
      const merged = { ...onboardingData, ...phaseData };

      // Whitelist columns that exist in the restaurants table
      const allowedKeys = new Set([
        'name',
        'address',
        'city',
        'state',
        'zip_code',
        'phone',
        'email',
        'instagram_handle',
        'tiktok_handle',
        'hours_monday',
        'hours_tuesday',
        'hours_wednesday',
        'hours_thursday',
        'hours_friday',
        'hours_saturday',
        'hours_sunday',
        'website',
        'cuisine_types',
        'price_range',
        'logo_url',
        'exterior_image_url',
        'interior_image_url',
      ]);

      const filteredData = Object.fromEntries(
        Object.entries(merged).filter(([key]) => allowedKeys.has(key))
      ) as Record<string, any>;

      // Check if restaurant exists
      const { data: existingRestaurant, error: fetchErr } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', effectiveUserId!)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      if (existingRestaurant?.id) {
        const { error: updErr } = await supabase
          .from('restaurants')
          .update({
            onboarding_step: currentPhase + 1,
            onboarding_completed: currentPhase === 4,
            ...filteredData,
          })
          .eq('id', existingRestaurant.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from('restaurants').insert({
          owner_id: effectiveUserId!,
          onboarding_step: currentPhase + 1,
          onboarding_completed: currentPhase === 4,
          ...filteredData,
        });
        if (insErr) throw insErr;
      }

      setCompletedPhases((prev) => [...prev, currentPhase]);

      if (currentPhase === 4) {
        // Final phase completed - redirect to dashboard
        Alert.alert('Success!', 'Your restaurant has been set up successfully!', [
          {
            text: 'Continue',
            onPress: () => navigation.replace('RestaurantDashboard'),
          },
        ]);
      } else {
        setCurrentPhase((prev) => prev + 1);
      }
    } catch (error: any) {
      console.error('Error saving onboarding progress:', error);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const goToPreviousPhase = () => {
    if (currentPhase > 1) {
      setCurrentPhase((prev) => prev - 1);
    }
  };

  const progress = ((currentPhase - 1) / phases.length) * 100;

  const renderCurrentPhase = () => {
    const commonProps = {
      data: onboardingData,
      onComplete: handlePhaseComplete,
      onUpdate: updateOnboardingData,
      isLoading,
    };

    switch (currentPhase) {
      case 1:
        return <Phase1BasicInfo {...commonProps} />;
      case 2:
        return <Phase2MenuUpload {...commonProps} />;
      case 3:
        return <Phase3SpecialMenus {...commonProps} />;
      case 4:
        return <Phase4Images {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Appy Panda</Text>
          <Text style={styles.subtitle}>
            Step {currentPhase} of {phases.length}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Restaurant Onboarding</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Phase Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phaseNavigation}>
          {phases.map((phase) => (
            <View
              key={phase.id}
              style={[
                styles.phaseItem,
                phase.id === currentPhase && styles.phaseItemActive,
                completedPhases.includes(phase.id) && styles.phaseItemCompleted,
              ]}
            >
              {completedPhases.includes(phase.id) ? (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              ) : (
                <View
                  style={[
                    styles.phaseNumber,
                    phase.id === currentPhase && styles.phaseNumberActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.phaseNumberText,
                      phase.id === currentPhase && styles.phaseNumberTextActive,
                    ]}
                  >
                    {phase.id}
                  </Text>
                </View>
              )}
              <View style={styles.phaseInfo}>
                <Text style={styles.phaseTitle}>{phase.title}</Text>
                <Text style={styles.phaseDescription}>{phase.description}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Current Phase Content */}
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{phases[currentPhase - 1]?.title}</Text>
              {completedPhases.includes(currentPhase) && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              )}
            </View>
            <Text style={styles.cardDescription}>{phases[currentPhase - 1]?.description}</Text>
            {renderCurrentPhase()}
          </View>
        </View>

        {/* Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton, currentPhase === 1 && styles.navButtonDisabled]}
            onPress={goToPreviousPhase}
            disabled={currentPhase === 1}
          >
            <Ionicons name="arrow-back" size={16} color={currentPhase === 1 ? '#999' : '#666'} />
            <Text style={[styles.navButtonText, currentPhase === 1 && styles.navButtonTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          {currentPhase === 3 && (
            <Text style={styles.optionalText}>Phase 3 is optional - you can skip to images</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#171717',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#171717',
    borderRadius: 2,
  },
  phaseNavigation: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 200,
  },
  phaseItemActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#171717',
  },
  phaseItemCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10B981',
  },
  phaseNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  phaseNumberActive: {
    borderColor: '#171717',
    backgroundColor: '#171717',
  },
  phaseNumberText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
  },
  phaseNumberTextActive: {
    color: '#fff',
  },
  phaseInfo: {
    flex: 1,
  },
  phaseTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 2,
  },
  phaseDescription: {
    fontSize: 10,
    color: '#6b7280',
  },
  content: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#171717',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  navigation: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  prevButton: {
    alignSelf: 'flex-start',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 4,
  },
  navButtonTextDisabled: {
    color: '#9ca3af',
  },
  optionalText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
  },
});
