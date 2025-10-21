import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Promotion {
  id: string;
  title: string;
  description: string;
  discount_type: string;
  discount_value: number;
  end_time: string;
}

interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  cuisine_type: string;
  price_range?: number;
  hours?: any;
  activePromotions?: number;
}

export default function RestaurantDetailScreen({ route, navigation }: any) {
  const { restaurant, promotion } = route.params || {};
  const [isFollowing, setIsFollowing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Mock data for restaurant details
  const restaurantData: Restaurant = restaurant || {
    id: '1',
    name: 'The Local Tavern',
    description: 'A cozy neighborhood tavern serving classic American comfort food and craft beverages.',
    address: '123 Main Street, Downtown',
    phone: '(555) 123-4567',
    cuisine_type: 'American',
    price_range: 2,
    activePromotions: 2,
  };

  const mockPromotions: Promotion[] = [
    {
      id: '1',
      title: '50% Off All Appetizers',
      description: 'Happy hour special on all appetizers from 3-6 PM weekdays',
      discount_type: 'percentage',
      discount_value: 50,
      end_time: '2025-08-25T18:00:00Z',
    },
    {
      id: '2',
      title: '$5 Craft Beers',
      description: 'All craft beers on tap for just $5 during happy hour',
      discount_type: 'fixed_amount',
      discount_value: 5,
      end_time: '2025-08-25T19:00:00Z',
    },
  ];

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
    Alert.alert(
      isFollowing ? 'Unfollowed' : 'Following!',
      isFollowing 
        ? `You will no longer receive notifications from ${restaurantData.name}`
        : `You will now receive notifications about deals from ${restaurantData.name}`
    );
  };

  const toggleNotifications = () => {
    if (!isFollowing) {
      Alert.alert('Follow Required', 'Please follow this restaurant first to enable notifications.');
      return;
    }
    setNotificationsEnabled(!notificationsEnabled);
  };

  const formatDiscountText = (promo: Promotion) => {
    switch (promo.discount_type) {
      case 'percentage':
        return `${promo.discount_value}% OFF`;
      case 'fixed_amount':
        return `$${promo.discount_value}`;
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

  const getPriceRangeText = (range?: number) => {
    switch (range) {
      case 1: return '$';
      case 2: return '$$';
      case 3: return '$$$';
      case 4: return '$$$$';
      default: return 'N/A';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Restaurant Header */}
      <View style={styles.header}>
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{restaurantData.name}</Text>
          <Text style={styles.cuisineType}>{restaurantData.cuisine_type}</Text>
          <Text style={styles.priceRange}>{getPriceRangeText(restaurantData.price_range)}</Text>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={toggleFollow}
          >
            <Ionicons 
              name={isFollowing ? 'heart' : 'heart-outline'} 
              size={20} 
              color={isFollowing ? '#fff' : '#FF6B35'} 
            />
            <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Restaurant Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>
          {restaurantData.description || 'A great local restaurant with amazing food and atmosphere.'}
        </Text>
        
        {restaurantData.address && (
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{restaurantData.address}</Text>
          </View>
        )}
        
        {restaurantData.phone && (
          <TouchableOpacity style={styles.detailItem}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{restaurantData.phone}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification Settings */}
      {isFollowing && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <TouchableOpacity 
            style={styles.notificationToggle}
            onPress={toggleNotifications}
          >
            <View style={styles.notificationInfo}>
              <Ionicons 
                name={notificationsEnabled ? 'notifications' : 'notifications-off'} 
                size={20} 
                color="#FF6B35" 
              />
              <Text style={styles.notificationText}>
                {notificationsEnabled ? 'Notifications Enabled' : 'Notifications Disabled'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      )}

      {/* Active Promotions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Active Deals ({mockPromotions.length})
        </Text>
        
        {mockPromotions.map((promo) => (
          <View key={promo.id} style={styles.promotionCard}>
            <View style={styles.promotionHeader}>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {formatDiscountText(promo)}
                </Text>
              </View>
              <Text style={styles.timeRemaining}>
                {formatTimeRemaining(promo.end_time)}
              </Text>
            </View>
            
            <Text style={styles.promotionTitle}>{promo.title}</Text>
            <Text style={styles.promotionDescription}>{promo.description}</Text>
            
            <TouchableOpacity style={styles.useButton}>
              <Text style={styles.useButtonText}>Use This Deal</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionItem}>
          <Ionicons name="map-outline" size={20} color="#FF6B35" />
          <Text style={styles.actionText}>Get Directions</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionItem}>
          <Ionicons name="share-outline" size={20} color="#FF6B35" />
          <Text style={styles.actionText}>Share Restaurant</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionItem}>
          <Ionicons name="flag-outline" size={20} color="#FF6B35" />
          <Text style={styles.actionText}>Report Issue</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cuisineType: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '500',
    marginBottom: 4,
  },
  priceRange: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    alignItems: 'flex-end',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B35',
    backgroundColor: '#fff',
  },
  followingButton: {
    backgroundColor: '#FF6B35',
  },
  followButtonText: {
    marginLeft: 4,
    color: '#FF6B35',
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  notificationToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  promotionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  promotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  discountBadge: {
    backgroundColor: '#FF6B35',
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
    marginBottom: 8,
  },
  promotionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  useButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  useButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
});
