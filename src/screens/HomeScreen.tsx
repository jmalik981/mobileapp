import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Restaurant {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  cuisine_type_id?: number | null;
  food_style_id?: number | null;
  dietary_restriction_id?: number | null;
  price_range?: string | null;
  logo_url?: string | null;
  exterior_image_url?: string | null;
  interior_image_url?: string | null;
  cover_image_url?: string | null;
  image_url?: string | null;
  instagram_handle?: string | null;
  tiktok_handle?: string | null;
  facebook_page_url?: string | null;
  hours_monday?: string | null;
  hours_tuesday?: string | null;
  hours_wednesday?: string | null;
  hours_thursday?: string | null;
  hours_friday?: string | null;
  hours_saturday?: string | null;
  hours_sunday?: string | null;
  is_verified: boolean;
  created_at: string;
  cuisine_type?: { id: number; name: string } | null;
  food_style?: { id: number; name: string } | null;
  dietary_restriction?: { id: number; name: string } | null;
  distance?: number;
  latitude?: number;
  longitude?: number;
}

interface HappyHourDeal {
  id: string;
  restaurant_id: string;
  title: string;
  description: string;
  price: number;
  days_of_week: string[];
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

interface LunchSpecial {
  id: string;
  restaurant_id: string;
  title: string;
  description: string;
  price?: number;
  days_of_week?: string[];
  start_time?: string;
  end_time?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

interface MenuImageAsset {
  path: string;
  name: string;
  url: string;
  sortOrder: number;
}

const MENU_BUCKET = 'menus';
const COVER_BUCKET = 'cover-images';
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const DEFAULT_RADIUS_MILES = 25;
const KM_PER_MILE = 1.60934;

// Calculate distance using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

function milesToKm(miles: number): number {
  return miles * KM_PER_MILE;
}

// Geocode address to coordinates
async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBEDnzrtv8cs3x3UCLaPwjcg4RX7GHmzRE'}`
    );
    const data = await response.json();
    if (data.results && data.results[0]) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
}

export default function RestaurantListingsScreen({ navigation }: any) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [showMap, setShowMap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showRadiusModal, setShowRadiusModal] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_RADIUS_MILES);

  // Favorites
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filter states
  const [cuisineTypes, setCuisineTypes] = useState<any[]>([]);
  const [foodStyles, setFoodStyles] = useState<any[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<any[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState<number | null>(null);
  const [selectedFoodStyle, setSelectedFoodStyle] = useState<number | null>(null);
  const [selectedDietary, setSelectedDietary] = useState<number | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [showHappyHourOnly, setShowHappyHourOnly] = useState(false);
  const [showLunchOnly, setShowLunchOnly] = useState(false);

  // Deals & Menu
  const [dealsByRestaurant, setDealsByRestaurant] = useState<Record<string, HappyHourDeal[]>>({});
  const [lunchSpecialsByRestaurant, setLunchSpecialsByRestaurant] = useState<Record<string, LunchSpecial[]>>({});
  const [menuImagesByRestaurant, setMenuImagesByRestaurant] = useState<Record<string, MenuImageAsset[]>>({});
  const [coverUrlMap, setCoverUrlMap] = useState<Record<string, string>>({});

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [
    restaurants,
    searchQuery,
    selectedCuisine,
    selectedFoodStyle,
    selectedDietary,
    selectedPriceRange,
    showOpenOnly,
    showHappyHourOnly,
    showLunchOnly,
    location,
    radiusMiles,
  ]);

  const initializeApp = async () => {
    await getCurrentUser();
    await getLocationPermission();
    await loadData();
  };

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        const { data: favoriteRows } = await supabase
          .from('favorites')
          .select('restaurant_id')
          .eq('user_id', user.id);

        const favSet = new Set<string>();
        favoriteRows?.forEach((row) => {
          if (row.restaurant_id) favSet.add(row.restaurant_id);
        });
        setFavorites(favSet);
      }
    } catch (error) {
      console.error('User error:', error);
    }
  };

  const getLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Please enable location to find nearby restaurants',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  // Linking.openURL('app-settings:');
                } else {
                  // Linking.openSettings();
                }
              },
            },
          ]
        );
        return;
      }

      let userLocation = await Location.getCurrentPositionAsync({});
      setLocation(userLocation);

      // Reverse geocode to get address
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      });

      if (reverseGeocode[0]) {
        const addr = reverseGeocode[0];
        setLocationAddress(
          `${addr.city || addr.district || ''}, ${addr.region || addr.country || ''}`
        );
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch restaurants with relations
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('restaurants')
        .select(
          `
          *,
          cuisine_type:cuisine_types(id, name),
          food_style:food_styles(id, name),
          dietary_restriction:dietary_restrictions(id, name)
        `
        )
        .eq('onboarding_completed', true)
        .order('created_at', { ascending: false });

      if (restaurantsError) throw restaurantsError;

      // Fetch happy hour deals
      const { data: dealsData } = await supabase
        .from('happy_hour_deals')
        .select('*')
        .eq('is_active', true);

      // Fetch lunch specials
      const { data: lunchData } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'lunch_special')
        .eq('is_active', true);

      // Fetch filter options
      const [cuisineRes, foodStyleRes, dietaryRes] = await Promise.all([
        supabase.from('cuisine_types').select('*').order('name'),
        supabase.from('food_styles').select('*').order('name'),
        supabase.from('dietary_restrictions').select('*').order('name'),
      ]);

      if (cuisineRes.data) setCuisineTypes(cuisineRes.data);
      if (foodStyleRes.data) setFoodStyles(foodStyleRes.data);
      if (dietaryRes.data) setDietaryRestrictions(dietaryRes.data);

      // Organize deals by restaurant
      const dealsMap: Record<string, HappyHourDeal[]> = {};
      if (dealsData) {
        dealsData.forEach((deal) => {
          if (!dealsMap[deal.restaurant_id]) dealsMap[deal.restaurant_id] = [];
          dealsMap[deal.restaurant_id].push(deal);
        });
      }
      setDealsByRestaurant(dealsMap);

      // Organize lunch specials by restaurant
      const lunchMap: Record<string, LunchSpecial[]> = {};
      if (lunchData) {
        lunchData.forEach((special) => {
          if (!lunchMap[special.restaurant_id]) lunchMap[special.restaurant_id] = [];
          lunchMap[special.restaurant_id].push(special);
        });
      }
      setLunchSpecialsByRestaurant(lunchMap);

      if (restaurantsData && restaurantsData.length > 0) {
        setRestaurants(restaurantsData);

        // Fetch menu images and cover images
        await Promise.all([
          fetchMenuImages(restaurantsData),
          fetchCoverImages(restaurantsData),
        ]);

        // Geocode restaurants in background
        setTimeout(() => {
          geocodeRestaurantsInBackground(restaurantsData);
        }, 1000);
      } else {
        setRestaurants([]);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      Alert.alert('Error', error.message || 'Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuImages = async (restaurantList: Restaurant[]) => {
    const menuImagesMap: Record<string, MenuImageAsset[]> = {};
    const restaurantIds = restaurantList.map((r) => r.id);

    // Fetch sort orders
    const { data: orderRows } = await supabase
      .from('media_order')
      .select('restaurant_id, path, sort_index')
      .eq('bucket', MENU_BUCKET)
      .in('restaurant_id', restaurantIds);

    const orderLookup = new Map<string, Map<string, number>>();
    orderRows?.forEach((row) => {
      if (!orderLookup.has(row.restaurant_id)) {
        orderLookup.set(row.restaurant_id, new Map());
      }
      if (row.sort_index != null) {
        orderLookup.get(row.restaurant_id)!.set(row.path, row.sort_index);
      }
    });

    await Promise.all(
      restaurantList.map(async (restaurant) => {
        const prefix = `${restaurant.id}/`;
        const { data: listed } = await supabase.storage.from(MENU_BUCKET).list(prefix, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

        if (!listed?.length) return;

        const assets: MenuImageAsset[] = [];
        for (const item of listed) {
          if (!item.name) continue;
          const lower = item.name.toLowerCase();
          if (!IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) continue;

          const path = `${prefix}${item.name}`;
          let url = supabase.storage.from(MENU_BUCKET).getPublicUrl(path).data.publicUrl;

          const sortOrder =
            orderLookup.get(restaurant.id)?.get(path) ?? Number.POSITIVE_INFINITY;
          assets.push({ path, name: item.name, url, sortOrder });
        }

        if (assets.length > 0) {
          assets.sort((a, b) => {
            if (a.sortOrder === b.sortOrder) {
              return a.path.localeCompare(b.path);
            }
            return a.sortOrder - b.sortOrder;
          });
          menuImagesMap[restaurant.id] = assets;
        }
      })
    );

    setMenuImagesByRestaurant(menuImagesMap);
  };

  const fetchCoverImages = async (restaurantList: Restaurant[]) => {
    const coverMap: Record<string, string> = {};

    await Promise.all(
      restaurantList.map(async (restaurant) => {
        const dbCover = restaurant.cover_image_url;
        if (dbCover) {
          coverMap[restaurant.id] = dbCover;
          return;
        }

        const prefix = `${restaurant.id}/`;
        const { data: listed } = await supabase.storage.from(COVER_BUCKET).list(prefix, {
          limit: 1,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

        const first = listed?.[0];
        if (first) {
          let url = supabase.storage
            .from(COVER_BUCKET)
            .getPublicUrl(prefix + first.name).data.publicUrl;
          coverMap[restaurant.id] = url;
        }
      })
    );

    setCoverUrlMap(coverMap);
  };

  const geocodeRestaurantsInBackground = async (restaurantsData: Restaurant[]) => {
    try {
      const batchSize = 5;
      const updatedRestaurants = [...restaurantsData];

      for (let i = 0; i < restaurantsData.length; i += batchSize) {
        const batch = restaurantsData.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (restaurant, batchIndex) => {
            const index = i + batchIndex;
            const fullAddress = `${restaurant.address}, ${restaurant.city}, ${restaurant.state} ${restaurant.zip_code}`;
            const coords = await geocodeAddress(fullAddress);

            if (coords) {
              updatedRestaurants[index] = {
                ...updatedRestaurants[index],
                latitude: coords.lat,
                longitude: coords.lng,
              };
            }
          })
        );

        setRestaurants([...updatedRestaurants]);

        if (i + batchSize < restaurantsData.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...restaurants];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query) ||
          r.city.toLowerCase().includes(query) ||
          r.cuisine_type?.name.toLowerCase().includes(query)
      );
    }

    // Cuisine filter
    if (selectedCuisine) {
      filtered = filtered.filter((r) => r.cuisine_type_id === selectedCuisine);
    }

    // Food style filter
    if (selectedFoodStyle) {
      filtered = filtered.filter((r) => r.food_style_id === selectedFoodStyle);
    }

    // Dietary filter
    if (selectedDietary) {
      filtered = filtered.filter((r) => r.dietary_restriction_id === selectedDietary);
    }

    // Price range filter
    if (selectedPriceRange) {
      filtered = filtered.filter((r) => r.price_range === selectedPriceRange);
    }

    // Open now filter
    if (showOpenOnly) {
      filtered = filtered.filter((r) => isRestaurantOpenNow(r));
    }

    // Happy hour filter
    if (showHappyHourOnly) {
      filtered = filtered.filter((r) => {
        const deals = dealsByRestaurant[r.id] || [];
        return deals.some((deal) => isCurrentTimeInRange(deal.start_time, deal.end_time, deal.days_of_week));
      });
    }

    // Lunch special filter
    if (showLunchOnly) {
      filtered = filtered.filter((r) => {
        const specials = lunchSpecialsByRestaurant[r.id] || [];
        return specials.some(
          (special) =>
            special.start_time &&
            special.end_time &&
            isCurrentTimeInRange(special.start_time, special.end_time, special.days_of_week || [])
        );
      });
    }

    // Distance filter (always apply if location available)
    // if (location) {
    //   filtered = filtered
    //     .map((restaurant) => {
    //       if (restaurant.latitude && restaurant.longitude) {
    //         const distanceKm = calculateDistance(
    //           location.coords.latitude,
    //           location.coords.longitude,
    //           restaurant.latitude,
    //           restaurant.longitude
    //         );
    //         const distanceMiles = kmToMiles(distanceKm);
    //         return { ...restaurant, distance: distanceMiles };
    //       }
    //       return { ...restaurant, distance: Infinity };
    //     })
    //     .filter((r) => r.distance! <= radiusMiles)
    //     .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    // }

    setFilteredRestaurants(filtered);
  };

  const isRestaurantOpenNow = (restaurant: Restaurant): boolean => {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayKey = `hours_${currentDay}` as keyof Restaurant;
    const hoursString = restaurant[dayKey] as string | null;

    if (!hoursString || hoursString.toLowerCase() === 'closed') {
      return false;
    }

    return true; // Simplified
  };

  const isCurrentTimeInRange = (startTime: string, endTime: string, days: string[]): boolean => {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const dayMap: Record<string, string> = {
      monday: 'mon',
      tuesday: 'tue',
      wednesday: 'wed',
      thursday: 'thu',
      friday: 'fri',
      saturday: 'sat',
      sunday: 'sun',
    };

    const currentDayName =
      Object.keys(dayMap).find((key) => dayMap[key] === currentDay) || currentDay;
    if (!days.includes(currentDayName)) return false;

    const parseTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);

    return currentTime >= startMinutes && currentTime <= endMinutes;
  };

  const toggleFavorite = async (restaurantId: string) => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to save favorites');
      return;
    }

    try {
      const isFavorite = favorites.has(restaurantId);

      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('restaurant_id', restaurantId);

        setFavorites((prev) => {
          const newSet = new Set(prev);
          newSet.delete(restaurantId);
          return newSet;
        });
      } else {
        await supabase.from('favorites').insert({
          user_id: currentUser.id,
          restaurant_id: restaurantId,
        });

        setFavorites((prev) => new Set(prev).add(restaurantId));
      }
    } catch (error) {
      console.error('Favorite error:', error);
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getTodayHours = (restaurant: Restaurant): string => {
    const today = new Date().getDay();
    const dayMap = [
      'hours_sunday',
      'hours_monday',
      'hours_tuesday',
      'hours_wednesday',
      'hours_thursday',
      'hours_friday',
      'hours_saturday',
    ];
    const key = dayMap[today] as keyof Restaurant;
    const hours = restaurant[key] as string | null;
    return hours || 'Closed';
  };

  const clearFilters = () => {
    setSelectedCuisine(null);
    setSelectedFoodStyle(null);
    setSelectedDietary(null);
    setSelectedPriceRange(null);
    setShowOpenOnly(false);
    setShowHappyHourOnly(false);
    setShowLunchOnly(false);
    setSearchQuery('');
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const renderRestaurantCard = (restaurant: Restaurant) => {
    const deals = dealsByRestaurant[restaurant.id] || [];
    const lunchSpecials = lunchSpecialsByRestaurant[restaurant.id] || [];
    const menuImages = menuImagesByRestaurant[restaurant.id] || [];
    const isFavorite = favorites.has(restaurant.id);

    const coverUrl =
      coverUrlMap[restaurant.id] ||
      restaurant.exterior_image_url ||
      restaurant.image_url ||
      'https://via.placeholder.com/400x200';

    return (
      <TouchableOpacity
        key={restaurant.id}
        style={styles.restaurantCard}
        onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id })}
      >
        {/* Cover Image */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: coverUrl }} style={styles.coverImage} resizeMode="cover" />

          {/* Badges */}
          <View style={styles.badgeContainer}>
            <View style={styles.badgeRow}>
              {restaurant.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#fff" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
              {restaurant.distance && (
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceText}>
                    {restaurant.distance.toFixed(1)} mi
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Favorite Button */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(restaurant.id)}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? '#ef4444' : '#fff'}
            />
          </TouchableOpacity>

          {/* Restaurant Views & Menu Images */}
          {(restaurant.exterior_image_url ||
            restaurant.interior_image_url ||
            menuImages.length > 0) && (
            <View style={styles.imageGallery}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {menuImages.slice(0, 2).map((image, idx) => (
                  <View key={idx} style={styles.galleryThumbnail}>
                    <Image source={{ uri: image.url }} style={styles.thumbnailImage} />
                  </View>
                ))}
                {restaurant.exterior_image_url && (
                  <View style={styles.galleryThumbnail}>
                    <Image
                      source={{ uri: restaurant.exterior_image_url }}
                      style={styles.thumbnailImage}
                    />
                    <View style={styles.thumbnailLabel}>
                      <Text style={styles.thumbnailLabelText}>Ext</Text>
                    </View>
                  </View>
                )}
                {restaurant.interior_image_url && (
                  <View style={styles.galleryThumbnail}>
                    <Image
                      source={{ uri: restaurant.interior_image_url }}
                      style={styles.thumbnailImage}
                    />
                    <View style={styles.thumbnailLabel}>
                      <Text style={styles.thumbnailLabelText}>Int</Text>
                    </View>
                  </View>
                )}
                {menuImages.length > 2 && (
                  <View style={[styles.galleryThumbnail, styles.moreImagesThumb]}>
                    <Text style={styles.moreImagesText}>+{menuImages.length - 2}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.metaText}>
              {restaurant.city}, {restaurant.state}
            </Text>
            {restaurant.distance && (
              <Text style={styles.distanceInline}>
                • {restaurant.distance.toFixed(1)} mi away
              </Text>
            )}
          </View>

          {(restaurant.cuisine_type || restaurant.dietary_restriction || restaurant.price_range) && (
            <View style={styles.tagRow}>
              {restaurant.cuisine_type && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{restaurant.cuisine_type.name}</Text>
                </View>
              )}
              {restaurant.dietary_restriction && (
                <View style={[styles.tag, styles.dietaryTag]}>
                  <Text style={styles.tagText}>{restaurant.dietary_restriction.name}</Text>
                </View>
              )}
              {restaurant.price_range && (
                <View style={[styles.tag, styles.priceTag]}>
                  <Text style={styles.tagText}>{restaurant.price_range}</Text>
                </View>
              )}
            </View>
          )}

          {restaurant.description && (
            <Text style={styles.description} numberOfLines={2}>
              {restaurant.description}
            </Text>
          )}

          {/* Happy Hour Deals */}
          {deals.length > 0 && (
            <View style={styles.dealSection}>
              {deals.slice(0, 1).map((deal) => (
                <View key={deal.id} style={styles.dealBadge}>
                  <Ionicons name="time-outline" size={14} color="#f59e0b" />
                  <View style={styles.dealContent}>
                    <Text style={styles.dealTitle}>{deal.title}</Text>
                    <Text style={styles.dealPrice}>${deal.price.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
              {deals.length > 1 && (
                <Text style={styles.moreDealsText}>+{deals.length - 1} more deals</Text>
              )}
            </View>
          )}

          {/* Lunch Specials */}
          {lunchSpecials.length > 0 && (
            <View style={styles.lunchSection}>
              {lunchSpecials.slice(0, 1).map((special) => (
                <View key={special.id} style={styles.lunchBadge}>
                  <Ionicons name="restaurant-outline" size={14} color="#3b82f6" />
                  <View style={styles.lunchContent}>
                    <Text style={styles.lunchTitle}>{special.title}</Text>
                    {special.price && (
                      <Text style={styles.lunchPrice}>${special.price.toFixed(2)}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Hours */}
          <View style={styles.hoursRow}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.hoursText}>Today: {getTodayHours(restaurant)}</Text>
          </View>

          {/* Social Links */}
          {(restaurant.instagram_handle || restaurant.facebook_page_url) && (
            <View style={styles.socialRow}>
              {restaurant.instagram_handle && (
                <Ionicons name="logo-instagram" size={16} color="#e4405f" />
              )}
              {restaurant.facebook_page_url && (
                <Ionicons name="logo-facebook" size={16} color="#1877f2" />
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMapView = () => {
    if (!location) return null;

    return (
      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Restaurants Near You</Text>
            <TouchableOpacity onPress={() => setShowMap(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            showsUserLocation
          >
            {filteredRestaurants.map((restaurant) => {
              if (!restaurant.latitude || !restaurant.longitude) return null;
              return (
                <Marker
                  key={restaurant.id}
                  coordinate={{
                    latitude: restaurant.latitude,
                    longitude: restaurant.longitude,
                  }}
                  title={restaurant.name}
                  description={restaurant.address}
                  onCalloutPress={() => {
                    setShowMap(false);
                    navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id });
                  }}
                />
              );
            })}
          </MapView>
        </View>
      </Modal>
    );
  };

  const renderFiltersModal = () => {
    return (
      <Modal
        visible={showFilters}
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.filtersContainer}>
          <View style={styles.filtersHeader}>
            <Text style={styles.filtersTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersScroll}>
            {/* Cuisine Type */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Cuisine Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {cuisineTypes.map((cuisine) => (
                  <TouchableOpacity
                    key={cuisine.id}
                    style={[
                      styles.filterChip,
                      selectedCuisine === cuisine.id && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setSelectedCuisine(selectedCuisine === cuisine.id ? null : cuisine.id)
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedCuisine === cuisine.id && styles.filterChipTextActive,
                      ]}
                    >
                      {cuisine.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Food Style */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Food Style</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {foodStyles.map((style) => (
                  <TouchableOpacity
                    key={style.id}
                    style={[
                      styles.filterChip,
                      selectedFoodStyle === style.id && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setSelectedFoodStyle(selectedFoodStyle === style.id ? null : style.id)
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedFoodStyle === style.id && styles.filterChipTextActive,
                      ]}
                    >
                      {style.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Dietary Restrictions */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Dietary Options</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {dietaryRestrictions.map((dietary) => (
                  <TouchableOpacity
                    key={dietary.id}
                    style={[
                      styles.filterChip,
                      selectedDietary === dietary.id && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setSelectedDietary(selectedDietary === dietary.id ? null : dietary.id)
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedDietary === dietary.id && styles.filterChipTextActive,
                      ]}
                    >
                      {dietary.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Price Range</Text>
              <View style={styles.priceRow}>
                {['$', '$$', '$$$', '$$$$'].map((price) => (
                  <TouchableOpacity
                    key={price}
                    style={[
                      styles.priceButton,
                      selectedPriceRange === price && styles.priceButtonActive,
                    ]}
                    onPress={() =>
                      setSelectedPriceRange(selectedPriceRange === price ? null : price)
                    }
                  >
                    <Text
                      style={[
                        styles.priceButtonText,
                        selectedPriceRange === price && styles.priceButtonTextActive,
                      ]}
                    >
                      {price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Toggle Filters */}
            <View style={styles.filterSection}>
              <TouchableOpacity
                style={styles.switchRow}
                onPress={() => setShowOpenOnly(!showOpenOnly)}
              >
                <Text style={styles.filterLabel}>Open Now</Text>
                <View style={[styles.switch, showOpenOnly && styles.switchActive]}>
                  <View style={[styles.switchThumb, showOpenOnly && styles.switchThumbActive]} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <TouchableOpacity
                style={styles.switchRow}
                onPress={() => setShowHappyHourOnly(!showHappyHourOnly)}
              >
                <Text style={styles.filterLabel}>Happy Hour Now</Text>
                <View style={[styles.switch, showHappyHourOnly && styles.switchActive]}>
                  <View
                    style={[styles.switchThumb, showHappyHourOnly && styles.switchThumbActive]}
                  />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <TouchableOpacity
                style={styles.switchRow}
                onPress={() => setShowLunchOnly(!showLunchOnly)}
              >
                <Text style={styles.filterLabel}>Lunch Specials Now</Text>
                <View style={[styles.switch, showLunchOnly && styles.switchActive]}>
                  <View style={[styles.switchThumb, showLunchOnly && styles.switchThumbActive]} />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.filtersActions}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyButtonText}>
                Apply ({filteredRestaurants.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderRadiusModal = () => {
    return (
      <Modal
        visible={showRadiusModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRadiusModal(false)}
      >
        <View style={styles.radiusModalOverlay}>
          <View style={styles.radiusModalContent}>
            <Text style={styles.radiusModalTitle}>Search Radius</Text>
            <Text style={styles.radiusModalSubtitle}>
              Show restaurants within {radiusMiles} miles
            </Text>

            <View style={styles.radiusOptions}>
              {[10, 25, 50, 100].map((miles) => (
                <TouchableOpacity
                  key={miles}
                  style={[
                    styles.radiusOption,
                    radiusMiles === miles && styles.radiusOptionActive,
                  ]}
                  onPress={() => {
                    setRadiusMiles(miles);
                    setShowRadiusModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.radiusOptionText,
                      radiusMiles === miles && styles.radiusOptionTextActive,
                    ]}
                  >
                    {miles} mi
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.radiusModalClose}
              onPress={() => setShowRadiusModal(false)}
            >
              <Text style={styles.radiusModalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#171717" />
        <Text style={styles.loadingText}>Loading restaurants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover Restaurants</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Map')}>
            <Ionicons name="location" size={24} color="#171717" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowFilters(true)}>
            <Ionicons name="options-outline" size={24} color="#171717" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {/* <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants, cuisine..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View> */}

    
      {/* Results Count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''}{' '}
          found
        </Text>
      </View>

      {/* Restaurant List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredRestaurants.length > 0 ? (
          filteredRestaurants.map(renderRestaurantCard)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No restaurants found</Text>
            <Text style={styles.emptyText}>
              {location
                ? `No restaurants within ${radiusMiles} miles. Try increasing the radius.`
                : 'Enable location or adjust your filters'}
            </Text>
            {(searchQuery ||
              selectedCuisine ||
              selectedFoodStyle ||
              selectedDietary ||
              selectedPriceRange) && (
              <TouchableOpacity style={styles.emptyButton} onPress={clearFilters}>
                <Text style={styles.emptyButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {renderMapView()}
      {renderFiltersModal()}
      {renderRadiusModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f4ff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  locationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  locationCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  locationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  locationAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  locationRadius: {
    fontSize: 11,
    color: '#171717',
    marginTop: 2,
  },
  locationCardButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  locationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f4ff',
  },
  resultsBar: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
  },
  resultsText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  restaurantCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginVertical: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  coverContainer: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e9ecef',
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 60,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  distanceBadge: {
    backgroundColor: '#171717',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGallery: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  galleryThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailLabel: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  thumbnailLabelText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600',
  },
  moreImagesThumb: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
  },
  moreImagesText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#171717',
  },
  cardContent: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  metaText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#666',
  },
  distanceInline: {
    marginLeft: 4,
    fontSize: 13,
    color: '#171717',
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dietaryTag: {
    backgroundColor: '#dcfce7',
  },
  priceTag: {
    backgroundColor: '#fef3c7',
  },
  tagText: {
    fontSize: 11,
    color: '#171717',
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 10,
  },
  dealSection: {
    marginBottom: 10,
  },
  dealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  dealContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealTitle: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '600',
    flex: 1,
  },
  dealPrice: {
    fontSize: 13,
    color: '#d97706',
    fontWeight: '700',
  },
  moreDealsText: {
    fontSize: 11,
    color: '#d97706',
    marginTop: 4,
    fontStyle: 'italic',
  },
  lunchSection: {
    marginBottom: 10,
  },
  lunchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  lunchContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lunchTitle: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '600',
    flex: 1,
  },
  lunchPrice: {
    fontSize: 13,
    color: '#1d4ed8',
    fontWeight: '700',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hoursText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  emptyButton: {
    backgroundColor: '#171717',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Map Modal
  mapContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  map: {
    flex: 1,
  },
  // Filters Modal Styles
  filtersContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  filtersScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginTop: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#171717',
    borderColor: '#171717',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  priceButtonActive: {
    backgroundColor: '#171717',
    borderColor: '#171717',
  },
  priceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  priceButtonTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#171717',
    alignItems: 'flex-end',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  filtersActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#171717',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});