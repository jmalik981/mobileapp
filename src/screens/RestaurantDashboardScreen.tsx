import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  phone: string;
  website: string | null;
  cuisine_type_id: number | null;
  food_style_id: number | null;
  dietary_restriction_id: number | null;
  price_range: string | null;
  cover_image_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  hours_monday: string | null;
  hours_tuesday: string | null;
  hours_wednesday: string | null;
  hours_thursday: string | null;
  hours_friday: string | null;
  hours_saturday: string | null;
  hours_sunday: string | null;
  owner_id: string;
}

interface Profile {
  id: string;
  first_name: string | null;
  user_type: string;
}

interface CuisineType {
  id: number;
  name: string;
}

interface FoodStyle {
  id: number;
  name: string;
}

interface DietaryRestriction {
  id: number;
  name: string;
}

const RestaurantDashboardScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [cuisineTypes, setCuisineTypes] = useState<CuisineType[]>([]);
  const [foodStyles, setFoodStyles] = useState<FoodStyle[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestriction[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Reload data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDashboardData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        Alert.alert('Error', 'Please login to continue');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' as never }],
        });
        return;
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      if (profileData?.user_type !== 'restaurant_owner') {
        Alert.alert('Access Denied', 'Only restaurant owners can access this page');
        return;
      }

      // Load cuisine types, food styles, and dietary restrictions
      const [cuisineRes, foodStyleRes, dietaryRes] = await Promise.all([
        supabase.from('cuisine_types').select('*').order('name'),
        supabase.from('food_styles').select('*').order('name'),
        supabase.from('dietary_restrictions').select('*').order('name'),
      ]);

      setCuisineTypes(cuisineRes.data || []);
      setFoodStyles(foodStyleRes.data || []);
      setDietaryRestrictions(dietaryRes.data || []);

      // Get restaurant data
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (restaurantError && restaurantError.code !== 'PGRST116') {
        throw restaurantError;
      }

      setRestaurant(restaurantData);

      // Resolve cover image
      if (restaurantData) {
        if (restaurantData.cover_image_url) {
          setCoverUrl(restaurantData.cover_image_url);
        } else {
          const prefix = `${restaurantData.id}/`;
          const { data: listed } = await supabase.storage
            .from('cover-images')
            .list(prefix, {
              limit: 1,
              offset: 0,
              sortBy: { column: 'name', order: 'asc' },
            });

          const first = listed?.[0];
          if (first) {
            const { data } = supabase.storage
              .from('cover-images')
              .getPublicUrl(prefix + first.name);
            
            let url = data.publicUrl;
            
            if (!url.includes('/object/public/')) {
              const { data: signed } = await supabase.storage
                .from('cover-images')
                .createSignedUrl(prefix + first.name, 60 * 60);
              if (signed?.signedUrl) url = signed.signedUrl;
            }
            
            setCoverUrl(url);
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Error', error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' as never }],
            });
          },
        },
      ]
    );
  };

  const openWebsite = (url: string | null) => {
    if (!url) return;
    const withProto = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(withProto);
  };

  const openSocialMedia = (platform: 'instagram' | 'tiktok', handle: string) => {
    const cleanHandle = handle.replace(/^@/, '');
    const url = platform === 'instagram' 
      ? `https://instagram.com/${cleanHandle}`
      : `https://tiktok.com/@${cleanHandle}`;
    Linking.openURL(url);
  };

  const getWebsiteDomain = (url: string | null) => {
    if (!url) return '';
    try {
      const withProto = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(withProto);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const getCuisineName = (id: number | null) => {
    if (!id) return null;
    return cuisineTypes.find(c => c.id === id)?.name;
  };

  const getFoodStyleName = (id: number | null) => {
    if (!id) return null;
    return foodStyles.find(f => f.id === id)?.name;
  };

  const getDietaryRestrictionName = (id: number | null) => {
    if (!id) return null;
    return dietaryRestrictions.find(d => d.id === id)?.name;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#171717" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Welcome to Appy Panda!</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#FF4444" />
          </TouchableOpacity>
        </View>
        <View style={styles.setupContainer}>
          <View style={styles.setupCard}>
            <Ionicons name="storefront" size={48} color="#171717" style={styles.setupIcon} />
            <Text style={styles.setupTitle}>Set Up Your Restaurant</Text>
            <Text style={styles.setupDescription}>
              You're just a few steps away from showcasing your restaurant's lunch specials, 
              happy hours, and promotions to hungry customers in your area.
            </Text>
            <TouchableOpacity 
              style={styles.setupButton}
              onPress={() => navigation.navigate('RestaurantSetup' as never)}
            >
              <Ionicons name="storefront" size={20} color="#FFFFFF" />
              <Text style={styles.setupButtonText}>Set Up My Restaurant</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back, {profile?.first_name}!</Text>
            <Text style={styles.subtitleText}>Manage your restaurant details and content</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionButtonOutline}
          onPress={() => navigation.navigate('EditRestaurant' as never, { 
            restaurant,
            cuisineTypes,
            foodStyles,
            dietaryRestrictions
          })}
        >
          <Ionicons name="settings-outline" size={16} color="#171717" />
          <Text style={styles.actionButtonOutlineText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButtonPrimary}
          onPress={() => navigation.navigate('ManageImages' as never, { restaurantId: restaurant.id })}
        >
          <Ionicons name="images-outline" size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonPrimaryText}>Manage Images</Text>
        </TouchableOpacity>
      </View>

      {/* Cover Image Card */}
      {coverUrl && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cover</Text>
          <View style={styles.coverImageContainer}>
            <Image 
              source={{ uri: coverUrl }} 
              style={styles.coverImage}
              resizeMode="contain"
            />
          </View>
        </View>
      )}

      {/* About Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        <View style={styles.badgesContainer}>
          {getCuisineName(restaurant.cuisine_type_id) && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{getCuisineName(restaurant.cuisine_type_id)}</Text>
            </View>
          )}
          {getFoodStyleName(restaurant.food_style_id) && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{getFoodStyleName(restaurant.food_style_id)}</Text>
            </View>
          )}
          {getDietaryRestrictionName(restaurant.dietary_restriction_id) && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{getDietaryRestrictionName(restaurant.dietary_restriction_id)}</Text>
            </View>
          )}
          {restaurant.price_range && (
            <View style={styles.badgeOutline}>
              <Text style={styles.badgeOutlineText}>{restaurant.price_range}</Text>
            </View>
          )}
        </View>
        <Text style={styles.descriptionText}>
          {restaurant.description || 'No description provided.'}
        </Text>
      </View>

      {/* Contact Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contact</Text>
        <View style={styles.contactInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>
              {restaurant.address}, {restaurant.city}, {restaurant.state}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{restaurant.phone}</Text>
          </View>
          {restaurant.website && (
            <TouchableOpacity 
              style={styles.websiteRow}
              onPress={() => openWebsite(restaurant.website)}
            >
              <Ionicons name="globe-outline" size={16} color="#666" />
              <Text style={styles.websiteText}>
                {getWebsiteDomain(restaurant.website)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Hours & Socials Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hours & Socials</Text>
        
        {(restaurant.hours_monday || restaurant.hours_tuesday || restaurant.hours_wednesday ||
          restaurant.hours_thursday || restaurant.hours_friday || restaurant.hours_saturday ||
          restaurant.hours_sunday) ? (
          <View style={styles.hoursGrid}>
            {restaurant.hours_monday && (
              <View style={styles.hoursRow}>
                <Text style={styles.dayLabel}>Mon:</Text>
                <Text style={styles.hoursValue}>{restaurant.hours_monday}</Text>
              </View>
            )}
            {restaurant.hours_tuesday && (
              <View style={styles.hoursRow}>
                <Text style={styles.dayLabel}>Tue:</Text>
                <Text style={styles.hoursValue}>{restaurant.hours_tuesday}</Text>
              </View>
            )}
            {restaurant.hours_wednesday && (
              <View style={styles.hoursRow}>
                <Text style={styles.dayLabel}>Wed:</Text>
                <Text style={styles.hoursValue}>{restaurant.hours_wednesday}</Text>
              </View>
            )}
            {restaurant.hours_thursday && (
              <View style={styles.hoursRow}>
                <Text style={styles.dayLabel}>Thu:</Text>
                <Text style={styles.hoursValue}>{restaurant.hours_thursday}</Text>
              </View>
            )}
            {restaurant.hours_friday && (
              <View style={styles.hoursRow}>
                <Text style={styles.dayLabel}>Fri:</Text>
                <Text style={styles.hoursValue}>{restaurant.hours_friday}</Text>
              </View>
            )}
            {restaurant.hours_saturday && (
              <View style={styles.hoursRow}>
                <Text style={styles.dayLabel}>Sat:</Text>
                <Text style={styles.hoursValue}>{restaurant.hours_saturday}</Text>
              </View>
            )}
            {restaurant.hours_sunday && (
              <View style={styles.hoursRow}>
                <Text style={styles.dayLabel}>Sun:</Text>
                <Text style={styles.hoursValue}>{restaurant.hours_sunday}</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noDataText}>Hours not provided.</Text>
        )}

        {(restaurant.instagram_handle || restaurant.tiktok_handle) && (
          <View style={styles.socialsContainer}>
            {restaurant.instagram_handle && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openSocialMedia('instagram', restaurant.instagram_handle!)}
              >
                <View style={styles.instagramIcon}>
                  <Ionicons name="logo-instagram" size={14} color="#FFFFFF" />
                </View>
                <Text style={styles.socialHandle}>
                  {restaurant.instagram_handle.startsWith('@')
                    ? restaurant.instagram_handle
                    : `@${restaurant.instagram_handle}`}
                </Text>
              </TouchableOpacity>
            )}
            {restaurant.tiktok_handle && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openSocialMedia('tiktok', restaurant.tiktok_handle!)}
              >
                <View style={styles.tiktokIcon}>
                  <Ionicons name="musical-notes" size={14} color="#FFFFFF" />
                </View>
                <Text style={styles.socialHandleTiktok}>
                  {restaurant.tiktok_handle.startsWith('@')
                    ? restaurant.tiktok_handle
                    : `@${restaurant.tiktok_handle}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#171717',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    padding: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  actionButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  actionButtonOutlineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#171717',
    gap: 6,
  },
  actionButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 12,
  },
  coverImageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  badgeOutline: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  badgeOutlineText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  contactInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  websiteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  websiteText: {
    fontSize: 14,
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  hoursGrid: {
    gap: 8,
    marginBottom: 16,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
    width: 40,
  },
  hoursValue: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  socialsContainer: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  instagramIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E1306C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tiktokIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialHandle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E1306C',
  },
  socialHandleTiktok: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  setupCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  setupIcon: {
    marginBottom: 16,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#171717',
    marginBottom: 12,
    textAlign: 'center',
  },
  setupDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default RestaurantDashboardScreen;