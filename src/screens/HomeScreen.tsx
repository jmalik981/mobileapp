import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface Promotion {
  id: string;
  title: string;
  description: string;
  restaurant_name: string;
  discount_type: string;
  discount_value: number;
  end_time: string;
  distance?: number;
  category: 'food' | 'drinks' | 'coffee' | 'bakery' | 'hookah' | 'events';
  subcategory?: string;
  dietary_options?: string[];
}

type MainFilterType = 'all' | 'food' | 'drinks' | 'coffee' | 'bakery' | 'dietary' | 'hookah' | 'events';

interface FilterCategory {
  id: MainFilterType;
  label: string;
  icon: string;
  subcategories?: string[];
}

const FILTER_CATEGORIES: FilterCategory[] = [
  { id: 'all', label: 'All', icon: 'apps' },
  { 
    id: 'food', 
    label: 'Food', 
    icon: 'restaurant',
    subcategories: ['Pizza', 'Burgers', 'Wings', 'Sushi', 'Tacos', 'Sandwiches', 'BBQ', 'Seafood', 'Steaks', 'Pasta', 'Indian', 'Italian', 'Fast Food', 'Thai', 'Mediterranean', 'American', 'Chinese', 'Mexican', 'Japanese', 'Korean', 'Vietnamese', 'Greek', 'French', 'Soul Food', 'Deli', 'Salads']
  },
  { 
    id: 'drinks', 
    label: 'Drinks', 
    icon: 'wine',
    subcategories: ['Beer', 'Cocktails', 'Wine', 'Spirits', 'Happy Hour']
  },
  { 
    id: 'coffee', 
    label: 'Coffee', 
    icon: 'cafe',
    subcategories: ['Espresso', 'Latte', 'Cold Brew', 'Specialty', 'Pastries']
  },
  { 
    id: 'bakery', 
    label: 'Bakery', 
    icon: 'storefront',
    subcategories: ['Bread', 'Pastries', 'Cakes', 'Cookies', 'Donuts']
  },
  { 
    id: 'dietary', 
    label: 'Dietary', 
    icon: 'leaf',
    subcategories: ['Vegan', 'Vegetarian', 'Gluten-Free', 'Halal', 'Kosher', 'Keto', 'Dairy-Free', 'Nut-Free', 'Low-Carb']
  },
  { 
    id: 'hookah', 
    label: 'Hookah', 
    icon: 'cloud',
    subcategories: ['Indoor', 'Outdoor']
  },
  { id: 'events', label: 'Events', icon: 'calendar' }
];

export default function HomeScreen({ navigation }: any) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([]);
  const [activeFilter, setActiveFilter] = useState<MainFilterType>('all');
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    getLocationPermission();
    loadPromotions();
  }, []);

  const getLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Allow location access to find nearby deals');
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    setLocation(location);
  };

  const loadPromotions = () => {
    // Mock data for now - will connect to Supabase later
    const mockPromotions: Promotion[] = [
      {
        id: '1',
        title: '50% Off All Appetizers',
        description: 'Get half off on all appetizers until 6 PM',
        restaurant_name: 'The Local Tavern',
        discount_type: 'percentage',
        discount_value: 50,
        end_time: '2025-08-27T18:00:00Z',
        distance: 0.3,
        category: 'food',
        subcategory: 'American',
        dietary_options: ['Vegetarian', 'Gluten-Free'],
      },
      {
        id: '2',
        title: '$5 Craft Beer Special',
        description: 'All craft beers on tap for just $5',
        restaurant_name: 'Brewhouse & Grill',
        discount_type: 'fixed_amount',
        discount_value: 5,
        end_time: '2025-08-27T19:00:00Z',
        distance: 0.5,
        category: 'drinks',
        subcategory: 'Beer',
      },
      {
        id: '3',
        title: 'Buy One Get One Wings',
        description: 'BOGO on all wing flavors during happy hour',
        restaurant_name: 'Wings & Things',
        discount_type: 'bogo',
        discount_value: 0,
        end_time: '2025-08-27T20:00:00Z',
        distance: 0.7,
        category: 'food',
        subcategory: 'American',
      },
      {
        id: '4',
        title: 'Happy Hour Cocktails',
        description: '2-for-1 on signature cocktails',
        restaurant_name: 'Rooftop Lounge',
        discount_type: 'bogo',
        discount_value: 0,
        end_time: '2025-08-27T21:00:00Z',
        distance: 0.4,
        category: 'drinks',
        subcategory: 'Cocktails',
      },
      {
        id: '5',
        title: 'Live Jazz Night',
        description: 'Free cover charge + drink specials during live music',
        restaurant_name: 'Blue Note Bistro',
        discount_type: 'free_item',
        discount_value: 0,
        end_time: '2025-08-27T22:00:00Z',
        distance: 0.6,
        category: 'events',
      },
      {
        id: '6',
        title: 'Trivia Night Special',
        description: 'Free appetizers for winning teams + drink specials',
        restaurant_name: 'Sports Bar Central',
        discount_type: 'free_item',
        discount_value: 0,
        end_time: '2025-08-27T23:00:00Z',
        distance: 0.9,
        category: 'events',
      },
      {
        id: '7',
        title: 'Authentic Thai Curry Special',
        description: '30% off all curry dishes',
        restaurant_name: 'Bangkok Garden',
        discount_type: 'percentage',
        discount_value: 30,
        end_time: '2025-08-27T20:30:00Z',
        distance: 0.4,
        category: 'food',
        subcategory: 'Thai',
        dietary_options: ['Vegan', 'Gluten-Free', 'Dairy-Free'],
      },
      {
        id: '8',
        title: 'Espresso & Pastry Combo',
        description: 'Buy any espresso drink, get pastry 50% off',
        restaurant_name: 'Morning Brew Cafe',
        discount_type: 'percentage',
        discount_value: 50,
        end_time: '2025-08-27T16:00:00Z',
        distance: 0.2,
        category: 'coffee',
        subcategory: 'Espresso',
        dietary_options: ['Vegetarian', 'Dairy-Free'],
      },
      {
        id: '9',
        title: 'Fresh Baked Bread Special',
        description: 'Buy 2 loaves, get 1 free',
        restaurant_name: 'Artisan Bakery',
        discount_type: 'bogo',
        discount_value: 0,
        end_time: '2025-08-27T17:00:00Z',
        distance: 0.3,
        category: 'bakery',
        subcategory: 'Bread',
        dietary_options: ['Vegan', 'Nut-Free'],
      },
      {
        id: '10',
        title: 'Wine Tasting Flight',
        description: '3 wine samples for $12',
        restaurant_name: 'Vineyard Bistro',
        discount_type: 'fixed_amount',
        discount_value: 12,
        end_time: '2025-08-27T19:30:00Z',
        distance: 0.6,
        category: 'drinks',
        subcategory: 'Wine',
      },
      {
        id: '11',
        title: 'Italian Pasta Night',
        description: 'All pasta dishes 40% off',
        restaurant_name: 'Nonna\'s Kitchen',
        discount_type: 'percentage',
        discount_value: 40,
        end_time: '2025-08-27T21:30:00Z',
        distance: 0.5,
        category: 'food',
        subcategory: 'Italian',
        dietary_options: ['Vegetarian', 'Gluten-Free'],
      },
      {
        id: '12',
        title: 'Cold Brew & Donuts',
        description: 'Cold brew + donut combo for $8',
        restaurant_name: 'Corner Coffee Shop',
        discount_type: 'fixed_amount',
        discount_value: 8,
        end_time: '2025-08-27T15:00:00Z',
        distance: 0.1,
        category: 'coffee',
        subcategory: 'Cold Brew',
        dietary_options: ['Vegan', 'Nut-Free'],
      },
      {
        id: '13',
        title: 'Halal Mediterranean Platter',
        description: 'Certified halal mezze platter 25% off',
        restaurant_name: 'Olive Branch',
        discount_type: 'percentage',
        discount_value: 25,
        end_time: '2025-08-27T20:00:00Z',
        distance: 0.4,
        category: 'food',
        subcategory: 'Mediterranean',
        dietary_options: ['Halal', 'Dairy-Free'],
      },
      {
        id: '14',
        title: 'Kosher Wine & Cheese',
        description: 'Kosher wine tasting with cheese board',
        restaurant_name: 'David\'s Delicatessen',
        discount_type: 'fixed_amount',
        discount_value: 15,
        end_time: '2025-08-27T19:00:00Z',
        distance: 0.6,
        category: 'drinks',
        subcategory: 'Wine',
        dietary_options: ['Kosher', 'Vegetarian'],
      },
    ];
    setPromotions(mockPromotions);
    setFilteredPromotions(mockPromotions);
  };

  const applyFilter = (filter: MainFilterType, subcategory?: string) => {
    setActiveFilter(filter);
    setActiveSubcategory(subcategory || null);
    
    if (filter === 'all') {
      setFilteredPromotions(promotions);
    } else if (filter === 'dietary') {
      // Filter by dietary options
      let filtered = promotions.filter(promo => 
        promo.dietary_options && promo.dietary_options.length > 0
      );
      if (subcategory) {
        filtered = filtered.filter(promo => 
          promo.dietary_options?.includes(subcategory)
        );
      }
      setFilteredPromotions(filtered);
    } else {
      let filtered = promotions.filter(promo => promo.category === filter);
      if (subcategory) {
        filtered = filtered.filter(promo => promo.subcategory === subcategory);
      }
      setFilteredPromotions(filtered);
    }
    
    // Hide subcategories when switching main filters
    if (!subcategory) {
      setShowSubcategories(false);
    }
  };

  useEffect(() => {
    applyFilter(activeFilter);
  }, [promotions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPromotions();
    setRefreshing(false);
  };

  const formatDiscountText = (promotion: Promotion) => {
    switch (promotion.discount_type) {
      case 'percentage':
        return `${promotion.discount_value}% OFF`;
      case 'fixed_amount':
        return `$${promotion.discount_value}`;
      case 'bogo':
        return 'BOGO';
      default:
        return 'DEAL';
    }
  };

  const formatTimeRemaining = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const handleMainFilterPress = (filter: MainFilterType) => {
    if (filter === activeFilter && FILTER_CATEGORIES.find(cat => cat.id === filter)?.subcategories) {
      setShowSubcategories(!showSubcategories);
    } else {
      applyFilter(filter);
      const hasSubcategories = FILTER_CATEGORIES.find(cat => cat.id === filter)?.subcategories;
      if (hasSubcategories && filter !== 'all') {
        setShowSubcategories(true);
      }
    }
  };

  const handleSubcategoryPress = (subcategory: string) => {
    if (activeSubcategory === subcategory) {
      applyFilter(activeFilter); // Clear subcategory filter
    } else {
      applyFilter(activeFilter, subcategory);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Deals Near You</Text>
        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => navigation.navigate('QRScanner')}
        >
          <Ionicons name="qr-code" size={24} color="#4169E1" />
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {FILTER_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.filterButton,
                activeFilter === category.id && styles.filterButtonActive
              ]}
              onPress={() => handleMainFilterPress(category.id)}
            >
              <Ionicons 
                name={category.icon as any} 
                size={18} 
                color={activeFilter === category.id ? '#fff' : '#4169E1'} 
              />
              <Text style={[
                styles.filterButtonText,
                activeFilter === category.id && styles.filterButtonTextActive
              ]}>
                {category.label}
              </Text>
              {category.subcategories && activeFilter === category.id && (
                <Ionicons 
                  name={showSubcategories ? 'chevron-up' : 'chevron-down'} 
                  size={14} 
                  color={activeFilter === category.id ? '#fff' : '#4169E1'} 
                  style={styles.chevronIcon}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Subcategory Filter Bar */}
      {showSubcategories && activeFilter !== 'all' && (
        <View style={styles.subcategoryContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcategoryScrollContent}
          >
            {FILTER_CATEGORIES.find(cat => cat.id === activeFilter)?.subcategories?.map((subcategory) => (
              <TouchableOpacity
                key={subcategory}
                style={[
                  styles.subcategoryButton,
                  activeSubcategory === subcategory && styles.subcategoryButtonActive
                ]}
                onPress={() => handleSubcategoryPress(subcategory)}
              >
                <Text style={[
                  styles.subcategoryButtonText,
                  activeSubcategory === subcategory && styles.subcategoryButtonTextActive
                ]}>
                  {subcategory}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredPromotions.length} deal{filteredPromotions.length !== 1 ? 's' : ''} found
          {activeSubcategory && ` in ${activeSubcategory}`}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredPromotions.map((promotion) => (
          <TouchableOpacity
            key={promotion.id}
            style={styles.promotionCard}
            onPress={() => navigation.navigate('RestaurantDetail', { promotion })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {formatDiscountText(promotion)}
                </Text>
              </View>
              <Text style={styles.timeRemaining}>
                {formatTimeRemaining(promotion.end_time)}
              </Text>
            </View>

            <Text style={styles.promotionTitle}>{promotion.title}</Text>
            <Text style={styles.restaurantName}>{promotion.restaurant_name}</Text>
            <Text style={styles.description}>{promotion.description}</Text>

            <View style={styles.cardFooter}>
              <View style={styles.locationInfo}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.distance}>
                  {promotion.distance?.toFixed(1)} mi away
                </Text>
              </View>
              <TouchableOpacity style={styles.followButton}>
                <Ionicons name="heart-outline" size={20} color="#4169E1" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  qrButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff2ee',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  promotionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  discountBadge: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  discountText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  timeRemaining: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: '500',
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  restaurantName: {
    fontSize: 16,
    color: '#4169E1',
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distance: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  followButton: {
    padding: 8,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filterScrollContent: {
    paddingHorizontal: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4169E1',
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    backgroundColor: '#4169E1',
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#4169E1',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  chevronIcon: {
    marginLeft: 4,
  },
  subcategoryContainer: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  subcategoryScrollContent: {
    paddingHorizontal: 20,
  },
  subcategoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  subcategoryButtonActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  subcategoryButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  subcategoryButtonTextActive: {
    color: '#fff',
  },
});
