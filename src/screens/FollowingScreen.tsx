import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FollowedRestaurant {
  id: string;
  name: string;
  cuisine_type: string;
  distance: number;
  activePromotions: number;
  lastPromotion?: string;
  isNotificationEnabled: boolean;
}

export default function FollowingScreen({ navigation }: any) {
  const [followedRestaurants, setFollowedRestaurants] = useState<FollowedRestaurant[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFollowedRestaurants();
  }, []);

  const loadFollowedRestaurants = () => {
    // Mock data for now - will connect to Supabase later
    const mockFollowed: FollowedRestaurant[] = [
      {
        id: '1',
        name: 'The Local Tavern',
        cuisine_type: 'American',
        distance: 0.3,
        activePromotions: 2,
        lastPromotion: '50% Off All Appetizers',
        isNotificationEnabled: true,
      },
      {
        id: '2',
        name: 'Brewhouse & Grill',
        cuisine_type: 'Pub Food',
        distance: 0.7,
        activePromotions: 1,
        lastPromotion: '$5 Craft Beers',
        isNotificationEnabled: true,
      },
      {
        id: '3',
        name: 'Sushi Palace',
        cuisine_type: 'Japanese',
        distance: 1.5,
        activePromotions: 0,
        isNotificationEnabled: false,
      },
    ];
    setFollowedRestaurants(mockFollowed);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFollowedRestaurants();
    setRefreshing(false);
  };

  const toggleNotifications = (restaurantId: string) => {
    setFollowedRestaurants(prev =>
      prev.map(restaurant =>
        restaurant.id === restaurantId
          ? { ...restaurant, isNotificationEnabled: !restaurant.isNotificationEnabled }
          : restaurant
      )
    );
  };

  const unfollowRestaurant = (restaurantId: string) => {
    setFollowedRestaurants(prev =>
      prev.filter(restaurant => restaurant.id !== restaurantId)
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Following ({followedRestaurants.length})</Text>
        <Text style={styles.headerSubtitle}>Get notified about new deals</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {followedRestaurants.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No restaurants followed yet</Text>
            <Text style={styles.emptySubtitle}>
              Follow restaurants to get notified about their latest deals
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.exploreButtonText}>Explore Deals</Text>
            </TouchableOpacity>
          </View>
        ) : (
          followedRestaurants.map((restaurant) => (
            <View key={restaurant.id} style={styles.restaurantCard}>
              <View style={styles.restaurantHeader}>
                <View style={styles.restaurantInfo}>
                  <Text style={styles.restaurantName}>{restaurant.name}</Text>
                  <Text style={styles.cuisineType}>{restaurant.cuisine_type}</Text>
                  <View style={styles.locationInfo}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text style={styles.distance}>{restaurant.distance} mi away</Text>
                  </View>
                </View>
                
                <View style={styles.restaurantActions}>
                  <TouchableOpacity
                    style={[
                      styles.notificationButton,
                      restaurant.isNotificationEnabled && styles.notificationButtonActive
                    ]}
                    onPress={() => toggleNotifications(restaurant.id)}
                  >
                    <Ionicons
                      name={restaurant.isNotificationEnabled ? 'notifications' : 'notifications-off'}
                      size={20}
                      color={restaurant.isNotificationEnabled ? '#FF6B35' : '#666'}
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.unfollowButton}
                    onPress={() => unfollowRestaurant(restaurant.id)}
                  >
                    <Ionicons name="heart" size={20} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              </View>

              {restaurant.activePromotions > 0 ? (
                <View style={styles.promotionInfo}>
                  <View style={styles.promotionBadge}>
                    <Text style={styles.promotionCount}>
                      {restaurant.activePromotions} active deal{restaurant.activePromotions > 1 ? 's' : ''}
                    </Text>
                  </View>
                  {restaurant.lastPromotion && (
                    <Text style={styles.lastPromotion}>Latest: {restaurant.lastPromotion}</Text>
                  )}
                </View>
              ) : (
                <View style={styles.noPromotions}>
                  <Text style={styles.noPromotionsText}>No active deals</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => navigation.navigate('RestaurantDetail', { restaurant })}
              >
                <Text style={styles.viewButtonText}>View Details</Text>
                <Ionicons name="chevron-forward" size={16} color="#FF6B35" />
              </TouchableOpacity>
            </View>
          ))
        )}
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
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  restaurantCard: {
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
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cuisineType: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
    marginBottom: 4,
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
  restaurantActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    padding: 8,
    marginRight: 8,
  },
  notificationButtonActive: {
    backgroundColor: '#fff2ee',
    borderRadius: 8,
  },
  unfollowButton: {
    padding: 8,
  },
  promotionInfo: {
    marginBottom: 12,
  },
  promotionBadge: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  promotionCount: {
    color: '#27ae60',
    fontSize: 12,
    fontWeight: '600',
  },
  lastPromotion: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  noPromotions: {
    marginBottom: 12,
  },
  noPromotionsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  viewButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
  },
});
