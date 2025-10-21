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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../lib/supabase'; // Adjust path as needed

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
  cuisine_type?: {
    id: number;
    name: string;
  } | null;
  food_style?: {
    id: number;
    name: string;
  } | null;
  dietary_restriction?: {
    id: number;
    name: string;
  } | null;
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

// Calculate distance using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Geocode address to coordinates
async function geocodeAddress(address: string): Promise<{lat: number, lng: number} | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=YOUR_GOOGLE_MAPS_API_KEY`
    );
    const data = await response.json();
    if (data.results && data.results[0]) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng
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
  const [showMap, setShowMap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [useLocationFilter, setUseLocationFilter] = useState(false); // NEW: Controls near me filter
  
  // Filter states
  const [cuisineTypes, setCuisineTypes] = useState<CuisineType[]>([]);
  const [foodStyles, setFoodStyles] = useState<FoodStyle[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestriction[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState<number | null>(null);
  const [selectedFoodStyle, setSelectedFoodStyle] = useState<number | null>(null);
  const [selectedDietary, setSelectedDietary] = useState<number | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  
  // Deals
  const [dealsByRestaurant, setDealsByRestaurant] = useState<Record<string, HappyHourDeal[]>>({});

  // Map search
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSuggestions, setMapSuggestions] = useState<any[]>([]);
  const [mapRegion, setMapRegion] = useState<any>(null);

  useEffect(() => {
    getLocationPermission();
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [restaurants, searchQuery, selectedCuisine, selectedFoodStyle, selectedDietary, selectedPriceRange, showOpenOnly, useLocationFilter]); // Removed 'location' dependency

  const getLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to find nearby restaurants');
        return;
      }

      let userLocation = await Location.getCurrentPositionAsync({});
      setLocation(userLocation);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const toggleNearMeFilter = async () => {
    if (!useLocationFilter) {
      // Turning ON near me filter
      if (!location) {
        await getLocationPermission();
      }
      setUseLocationFilter(true);
    } else {
      // Turning OFF near me filter
      setUseLocationFilter(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch restaurants with relations - Fixed join syntax
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('restaurants')
        .select(`
          *,
          cuisine_type:cuisine_types!cuisine_type_id(id, name),
          food_style:food_styles!food_style_id(id, name),
          dietary_restriction:dietary_restrictions!dietary_restriction_id(id, name)
        `);

      if (restaurantsError) {
        console.error('Restaurants Error:', restaurantsError);
        throw restaurantsError;
      }

      console.log('Restaurants fetched:', restaurantsData?.length);

      // Fetch happy hour deals
      const { data: dealsData, error: dealsError } = await supabase
        .from('happy_hour_deals')
        .select('*');

      if (dealsError) {
        console.error('Deals Error:', dealsError);
      }

      console.log('Deals fetched:', dealsData?.length);

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
        dealsData.forEach(deal => {
          if (!dealsMap[deal.restaurant_id]) {
            dealsMap[deal.restaurant_id] = [];
          }
          dealsMap[deal.restaurant_id].push(deal);
        });
      }
      setDealsByRestaurant(dealsMap);

      // Set restaurants WITHOUT geocoding first (geocoding can be slow)
      if (restaurantsData && restaurantsData.length > 0) {
        setRestaurants(restaurantsData);
        
        // Geocode in background (optional - can be slow)
        // Comment this out if you don't need coordinates immediately
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

  // Separate function for background geocoding
  const geocodeRestaurantsInBackground = async (restaurantsData: any[]) => {
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

        // Update state after each batch
        setRestaurants([...updatedRestaurants]);
        
        // Small delay between batches to avoid rate limits
        if (i + batchSize < restaurantsData.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
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
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.city.toLowerCase().includes(query) ||
        r.cuisine_type?.name.toLowerCase().includes(query)
      );
    }

    // Cuisine filter
    if (selectedCuisine) {
      filtered = filtered.filter(r => r.cuisine_type_id === selectedCuisine);
    }

    // Food style filter
    if (selectedFoodStyle) {
      filtered = filtered.filter(r => r.food_style_id === selectedFoodStyle);
    }

    // Dietary filter
    if (selectedDietary) {
      filtered = filtered.filter(r => r.dietary_restriction_id === selectedDietary);
    }

    // Price range filter
    if (selectedPriceRange) {
      filtered = filtered.filter(r => r.price_range === selectedPriceRange);
    }

    // Open now filter
    if (showOpenOnly) {
      filtered = filtered.filter(r => isRestaurantOpenNow(r));
    }

    // Distance filter ONLY if "Near Me" is active
    if (useLocationFilter && location) {
      filtered = filtered
        .map(restaurant => {
          if (restaurant.latitude && restaurant.longitude) {
            const distance = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              restaurant.latitude,
              restaurant.longitude
            );
            return { ...restaurant, distance };
          }
          return { ...restaurant, distance: Infinity };
        })
        .filter(r => r.distance <= 50) // Within 50km
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else {
      // Show all restaurants, calculate distance for display only
      if (location) {
        filtered = filtered.map(restaurant => {
          if (restaurant.latitude && restaurant.longitude) {
            const distance = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              restaurant.latitude,
              restaurant.longitude
            );
            return { ...restaurant, distance };
          }
          return restaurant;
        });
      }
    }

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
    
    // Simplified - assume format "9:00 AM - 10:00 PM"
    return true; // You can implement proper time parsing here
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
    setSearchQuery('');
  };

  const renderRestaurantCard = (restaurant: Restaurant) => {
    const deals = dealsByRestaurant[restaurant.id] || [];
    const coverUrl = restaurant.cover_image_url || restaurant.exterior_image_url || restaurant.image_url;

    return (
      <TouchableOpacity
        key={restaurant.id}
        style={styles.restaurantCard}
        onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id })}
      >
        {/* Cover Image */}
        <Image
          source={{ uri: coverUrl || 'https://via.placeholder.com/400x200' }}
          style={styles.coverImage}
        />
        
        {/* Badges */}
        <View style={styles.badgeContainer}>
          {restaurant.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#fff" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
          {restaurant.distance && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{restaurant.distance.toFixed(1)} km</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{restaurant.city}, {restaurant.state}</Text>
          </View>

          {restaurant.cuisine_type && (
            <View style={styles.tagRow}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{restaurant.cuisine_type.name}</Text>
              </View>
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

          {/* Happy Hour Deal */}
          {deals.length > 0 && (
            <View style={styles.dealBadge}>
              <Ionicons name="time-outline" size={14} color="#f59e0b" />
              <Text style={styles.dealText}>{deals[0].title}</Text>
            </View>
          )}

          {/* Hours */}
          <View style={styles.hoursRow}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.hoursText}>Today: {getTodayHours(restaurant)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMapView = () => {
    if (!location) return null;

    return (
      <Modal
        visible={showMap}
        animationType="slide"
        onRequestClose={() => setShowMap(false)}
      >
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
            {filteredRestaurants.map(restaurant => {
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
                {cuisineTypes.map(cuisine => (
                  <TouchableOpacity
                    key={cuisine.id}
                    style={[
                      styles.filterChip,
                      selectedCuisine === cuisine.id && styles.filterChipActive
                    ]}
                    onPress={() => setSelectedCuisine(selectedCuisine === cuisine.id ? null : cuisine.id)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedCuisine === cuisine.id && styles.filterChipTextActive
                    ]}>
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
                {foodStyles.map(style => (
                  <TouchableOpacity
                    key={style.id}
                    style={[
                      styles.filterChip,
                      selectedFoodStyle === style.id && styles.filterChipActive
                    ]}
                    onPress={() => setSelectedFoodStyle(selectedFoodStyle === style.id ? null : style.id)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedFoodStyle === style.id && styles.filterChipTextActive
                    ]}>
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
                {dietaryRestrictions.map(dietary => (
                  <TouchableOpacity
                    key={dietary.id}
                    style={[
                      styles.filterChip,
                      selectedDietary === dietary.id && styles.filterChipActive
                    ]}
                    onPress={() => setSelectedDietary(selectedDietary === dietary.id ? null : dietary.id)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedDietary === dietary.id && styles.filterChipTextActive
                    ]}>
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
                {['$', '$$', '$$$', '$$$$'].map(price => (
                  <TouchableOpacity
                    key={price}
                    style={[
                      styles.priceButton,
                      selectedPriceRange === price && styles.priceButtonActive
                    ]}
                    onPress={() => setSelectedPriceRange(selectedPriceRange === price ? null : price)}
                  >
                    <Text style={[
                      styles.priceButtonText,
                      selectedPriceRange === price && styles.priceButtonTextActive
                    ]}>
                      {price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Open Now */}
            <View style={styles.filterSection}>
              <TouchableOpacity
                style={styles.switchRow}
                onPress={() => setShowOpenOnly(!showOpenOnly)}
              >
                <Text style={styles.filterLabel}>Open Now</Text>
                <View style={[styles.switch, showOpenOnly && styles.switchActive]}>
                  {showOpenOnly && <View style={styles.switchThumb} />}
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.filtersActions}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton} 
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>
                Apply ({filteredRestaurants.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading restaurants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Restaurants Near You</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowMap(true)}
          >
            <Ionicons name="map-outline" size={24} color="#4169E1" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={24} color="#4169E1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
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
      </View>

      {/* Location Info */}
      {location && (
        <View style={styles.locationBar}>
          <Ionicons name="location" size={16} color="#4169E1" />
          <Text style={styles.locationText}>
            Showing {filteredRestaurants.length} restaurants within 50km
          </Text>
        </View>
      )}

      {/* Restaurant List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredRestaurants.length > 0 ? (
          filteredRestaurants.map(renderRestaurantCard)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No restaurants found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your filters or location
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={clearFilters}>
              <Text style={styles.emptyButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {renderMapView()}
      {renderFiltersModal()}
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
    fontSize: 18,
    fontWeight: '600',
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
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#f0f4ff',
  },
  locationText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#4169E1',
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
  coverImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#e9ecef',
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    backgroundColor: '#4169E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#666',
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceTag: {
    backgroundColor: '#fef3c7',
  },
  tagText: {
    fontSize: 11,
    color: '#4169E1',
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  dealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
  },
  dealText: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '600',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Map Modal Styles
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
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
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
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
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
    backgroundColor: '#4169E1',
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
    backgroundColor: '#4169E1',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});