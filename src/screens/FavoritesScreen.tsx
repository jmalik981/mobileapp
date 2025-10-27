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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface Restaurant {
  id: string;
  name: string;
  description?: string | null;
  city: string;
  state: string;
  cuisine_type?: string | null;
  price_range?: string | null;
  image_url?: string | null;
  logo_url?: string | null;
  exterior_image_url?: string | null;
}

interface Favorite {
  id: string;
  created_at: string;
  restaurant: Restaurant;
}

interface HappyHourDeal {
  id: string;
  restaurant_id: string;
  title: string;
}

interface LunchSpecial {
  id: string;
  restaurant_id: string;
  title: string;
}

export default function FavoritesScreen({ navigation }: any) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [dealsByRestaurant, setDealsByRestaurant] = useState<Record<string, HappyHourDeal[]>>({});
  const [lunchSpecialsByRestaurant, setLunchSpecialsByRestaurant] = useState<Record<string, LunchSpecial[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Login Required', 'Please login to view favorites', [
        { text: 'OK', onPress: () => navigation.navigate('Profile') }
      ]);
      return;
    }
    setUserId(user.id);
    loadFavorites(user.id);
  };

  const loadFavorites = async (uid: string) => {
    try {
      setLoading(true);

      // Fetch favorites with restaurant details
      const { data: favData, error: favError } = await supabase
        .from('favorites')
        .select(`
          id,
          created_at,
          restaurant:restaurants!inner(
            id,
            name,
            description,
            city,
            state,
            cuisine_type,
            price_range,
            image_url,
            logo_url,
            exterior_image_url
          )
        `)
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (favError) throw favError;

      const typedFavorites = (favData || []) as unknown as Favorite[];
      setFavorites(typedFavorites);

      // Fetch deals and lunch specials for favorites
      const favRestaurantIds = typedFavorites.map(f => f.restaurant.id);

      if (favRestaurantIds.length > 0) {
        // Fetch happy hour deals
        const { data: deals } = await supabase
          .from('happy_hour_deals')
          .select('*')
          .in('restaurant_id', favRestaurantIds)
          .eq('is_active', true);

        if (deals) {
          const dealsMap: Record<string, HappyHourDeal[]> = {};
          deals.forEach(deal => {
            if (!dealsMap[deal.restaurant_id]) dealsMap[deal.restaurant_id] = [];
            dealsMap[deal.restaurant_id].push(deal);
          });
          setDealsByRestaurant(dealsMap);
        }

        // Fetch lunch specials
        const { data: lunchSpecials } = await supabase
          .from('content')
          .select('*')
          .eq('type', 'lunch_special')
          .eq('is_active', true)
          .in('restaurant_id', favRestaurantIds);

        if (lunchSpecials) {
          const lunchMap: Record<string, LunchSpecial[]> = {};
          lunchSpecials.forEach(special => {
            if (!lunchMap[special.restaurant_id]) lunchMap[special.restaurant_id] = [];
            lunchMap[special.restaurant_id].push(special);
          });
          setLunchSpecialsByRestaurant(lunchMap);
        }
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      Alert.alert('Error', 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (restaurantId: string) => {
    if (!userId) return;

    try {
      setRemovingIds(prev => [...prev, restaurantId]);

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId);

      if (error) throw error;

      setFavorites(prev => prev.filter(fav => fav.restaurant.id !== restaurantId));
      Alert.alert('Success', 'Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      Alert.alert('Error', 'Failed to remove favorite');
    } finally {
      setRemovingIds(prev => prev.filter(id => id !== restaurantId));
    }
  };

  const onRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    await loadFavorites(userId);
    setRefreshing(false);
  };

  const renderGridItem = (favorite: Favorite) => {
    const restaurant = favorite.restaurant;
    const deals = dealsByRestaurant[restaurant.id] || [];
    const lunchSpecials = lunchSpecialsByRestaurant[restaurant.id] || [];
    const isRemoving = removingIds.includes(restaurant.id);
    const coverImage = restaurant.exterior_image_url || restaurant.logo_url || restaurant.image_url;

    return (
      <TouchableOpacity
        key={favorite.id}
        style={styles.gridCard}
        onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id })}
      >
        <View style={styles.gridImageContainer}>
          <Image
            source={{ uri: coverImage || 'https://via.placeholder.com/400x200' }}
            style={styles.gridImage}
          />
          <TouchableOpacity
            style={styles.favoriteButtonGrid}
            onPress={() => removeFavorite(restaurant.id)}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <ActivityIndicator size="small" color="#ff4444" />
            ) : (
              <Ionicons name="heart" size={20} color="#ff4444" />
            )}
          </TouchableOpacity>

          {/* Badges */}
          {(deals.length > 0 || lunchSpecials.length > 0) && (
            <View style={styles.badgesContainer}>
              {deals.length > 0 && (
                <View style={styles.dealBadge}>
                  <Ionicons name="time" size={10} color="#ec4899" />
                  <Text style={styles.badgeText}>Happy Hour</Text>
                </View>
              )}
              {lunchSpecials.length > 0 && (
                <View style={styles.lunchBadge}>
                  <Ionicons name="calendar" size={10} color="#3b82f6" />
                  <Text style={styles.badgeText}>Lunch</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.gridContent}>
          <Text style={styles.gridName} numberOfLines={1}>{restaurant.name}</Text>
          
          <View style={styles.gridMetaRow}>
            {restaurant.cuisine_type && (
              <Text style={styles.gridCuisine}>{restaurant.cuisine_type}</Text>
            )}
            {restaurant.cuisine_type && restaurant.price_range && (
              <Text style={styles.gridDot}>•</Text>
            )}
            {restaurant.price_range && (
              <Text style={styles.gridPrice}>{restaurant.price_range}</Text>
            )}
          </View>

          <View style={styles.gridLocationRow}>
            <Ionicons name="location" size={12} color="#999" />
            <Text style={styles.gridLocation}>{restaurant.city}, {restaurant.state}</Text>
          </View>

          {restaurant.description && (
            <Text style={styles.gridDescription} numberOfLines={2}>
              {restaurant.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderListItem = (favorite: Favorite) => {
    const restaurant = favorite.restaurant;
    const deals = dealsByRestaurant[restaurant.id] || [];
    const lunchSpecials = lunchSpecialsByRestaurant[restaurant.id] || [];
    const isRemoving = removingIds.includes(restaurant.id);
    const coverImage = restaurant.exterior_image_url || restaurant.logo_url || restaurant.image_url;

    return (
      <TouchableOpacity
        key={favorite.id}
        style={styles.listCard}
        onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id })}
      >
        <Image
          source={{ uri: coverImage || 'https://via.placeholder.com/400x200' }}
          style={styles.listImage}
        />

        <View style={styles.listContent}>
          <View style={styles.listHeader}>
            <Text style={styles.listName} numberOfLines={1}>{restaurant.name}</Text>
            <TouchableOpacity
              style={styles.favoriteButtonList}
              onPress={() => removeFavorite(restaurant.id)}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <ActivityIndicator size="small" color="#ff4444" />
              ) : (
                <Ionicons name="heart" size={20} color="#ff4444" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.listMetaRow}>
            <Ionicons name="location" size={14} color="#666" />
            <Text style={styles.listLocation}>{restaurant.city}, {restaurant.state}</Text>
          </View>

          <View style={styles.listTagsRow}>
            {restaurant.cuisine_type && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{restaurant.cuisine_type}</Text>
              </View>
            )}
            {restaurant.price_range && (
              <View style={[styles.tag, styles.priceTag]}>
                <Text style={styles.tagText}>{restaurant.price_range}</Text>
              </View>
            )}
          </View>

          {(deals.length > 0 || lunchSpecials.length > 0) && (
            <View style={styles.listBadgesRow}>
              {deals.length > 0 && (
                <View style={styles.dealBadgeLarge}>
                  <Ionicons name="time" size={12} color="#ec4899" />
                  <Text style={styles.badgeTextLarge}>Happy Hour</Text>
                </View>
              )}
              {lunchSpecials.length > 0 && (
                <View style={styles.lunchBadgeLarge}>
                  <Ionicons name="calendar" size={12} color="#3b82f6" />
                  <Text style={styles.badgeTextLarge}>Lunch Special</Text>
                </View>
              )}
            </View>
          )}

          {restaurant.description && (
            <Text style={styles.listDescription} numberOfLines={2}>
              {restaurant.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Favorites</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'grid' && styles.viewButtonActive]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons
              name="grid"
              size={18}
              color={viewMode === 'grid' ? '#fff' : '#4169E1'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'list' && styles.viewButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list"
              size={18}
              color={viewMode === 'list' ? '#fff' : '#4169E1'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {favorites.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={
            viewMode === 'grid' ? styles.gridContainer : styles.listContainer
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {viewMode === 'grid'
            ? favorites.map(renderGridItem)
            : favorites.map(renderListItem)}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyText}>
            Start exploring restaurants and add your favorites to see them here
          </Text>
          <TouchableOpacity
            style={styles.discoverButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.discoverButtonText}>Discover Restaurants</Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
  },
  viewButtonActive: {
    backgroundColor: '#4169E1',
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  listContainer: {
    padding: 16,
  },
  // Grid Styles
  gridCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  gridImageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e9ecef',
  },
  favoriteButtonGrid: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  badgesContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  dealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fce7f3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  lunchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#333',
  },
  gridContent: {
    padding: 12,
  },
  gridName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridCuisine: {
    fontSize: 12,
    color: '#666',
  },
  gridDot: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 4,
  },
  gridPrice: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  gridLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  gridLocation: {
    fontSize: 11,
    color: '#999',
  },
  gridDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  // List Styles
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  listImage: {
    width: 120,
    height: '100%',
    minHeight: 160,
    backgroundColor: '#e9ecef',
  },
  listContent: {
    flex: 1,
    padding: 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  favoriteButtonList: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  listLocation: {
    fontSize: 12,
    color: '#666',
  },
  listTagsRow: {
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
  priceTag: {
    backgroundColor: '#fef3c7',
  },
  tagText: {
    fontSize: 10,
    color: '#333',
    fontWeight: '500',
  },
  listBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  dealBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fce7f3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  lunchBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeTextLarge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
  listDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  discoverButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  discoverButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});