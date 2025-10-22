import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface Restaurant {
  id: string;
  name: string;
  city?: string;
  state?: string;
  logo_url?: string;
  image_url?: string;
}

interface RestaurantPost {
  id: string;
  title: string;
  content?: string;
  image_url?: string;
  post_type?: string;
  restaurant_id: string;
  created_at: string;
}

interface FollowedRestaurant {
  id: string;
  restaurant: Restaurant;
}

export default function FollowingScreen({ navigation }: any) {
  const [followedRestaurants, setFollowedRestaurants] = useState<FollowedRestaurant[]>([]);
  const [recentPosts, setRecentPosts] = useState<RestaurantPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchFollowingData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigation.navigate('Login');
        return;
      }

      // 1️⃣ Get followed restaurants
      const { data: followRows, error: followErr } = await supabase
        .from('user_follows')
        .select('id, restaurant_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (followErr) throw followErr;

      if (!followRows || followRows.length === 0) {
        setFollowedRestaurants([]);
        setRecentPosts([]);
        setLoading(false);
        return;
      }

      const restaurantIds = followRows.map((f) => f.restaurant_id);

      // 2️⃣ Get restaurant details
      const { data: restaurantsData, error: restErr } = await supabase
        .from('restaurants')
        .select('id, name, city, state, logo_url, image_url')
        .in('id', restaurantIds);

      if (restErr) throw restErr;

      const idToRestaurant: Record<string, Restaurant> = {};
      (restaurantsData || []).forEach((r) => (idToRestaurant[r.id] = r));

      const safeFollows = followRows
        .map((f) => ({
          id: f.id,
          restaurant: idToRestaurant[f.restaurant_id],
        }))
        .filter((f) => !!f.restaurant);

      setFollowedRestaurants(safeFollows);

      // 3️⃣ Get active posts
      const { data: postsData, error: postErr } = await supabase
        .from('restaurant_posts')
        .select('*')
        .in('restaurant_id', restaurantIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (postErr) throw postErr;

      const now = Date.now();
      const filtered = (postsData || []).filter((p) => {
        const schedOk = !p.scheduled_at || new Date(p.scheduled_at).getTime() <= now;
        const expOk = !p.expires_at || new Date(p.expires_at).getTime() >= now;
        return schedOk && expOk;
      });

      setRecentPosts(filtered);
    } catch (err) {
      console.error('Error loading following data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchFollowingData();
  }, [fetchFollowingData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFollowingData();
  };

  const handleUnfollow = async (restaurantId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId);

      if (error) throw error;

      setFollowedRestaurants((prev) =>
        prev.filter((f) => f.restaurant.id !== restaurantId)
      );
      setRecentPosts((prev) =>
        prev.filter((p) => p.restaurant_id !== restaurantId)
      );
    } catch (err) {
      console.error('Error unfollowing:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={{ marginTop: 12, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Following ({followedRestaurants.length})</Text>
        <Text style={styles.headerSubtitle}>Stay updated with your favorite restaurants</Text>
      </View>

      {followedRestaurants.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>You're not following any restaurants</Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.exploreButtonText}>Discover Restaurants</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {followedRestaurants.map((follow) => (
            <View key={follow.id} style={styles.restaurantCard}>
              <View style={styles.restaurantHeader}>
                <Text style={styles.restaurantName}>{follow.restaurant.name}</Text>
                <TouchableOpacity onPress={() => handleUnfollow(follow.restaurant.id)}>
                  <Ionicons name="heart" size={22} color="#e74c3c" />
                </TouchableOpacity>
              </View>
              <Text style={styles.restaurantLocation}>
                {follow.restaurant.city}, {follow.restaurant.state}
              </Text>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() =>
                  
                  navigation.navigate('RestaurantDetail', { restaurantId: follow.restaurant.id })
                }
              >
                <Text style={styles.viewButtonText}>View Details</Text>
                <Ionicons name="chevron-forward" size={16} color="#FF6B35" />
              </TouchableOpacity>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Recent Updates</Text>
          {recentPosts.length === 0 ? (
            <Text style={styles.noUpdates}>No recent posts yet</Text>
          ) : (
            recentPosts.map((post) => (
              <View key={post.id} style={styles.postCard}>
              

                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postContent}>{post.content}</Text>
                <Text style={styles.postTime}>
                  {new Date(post.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomColor: '#e9ecef',
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: { fontSize: 18, color: '#333', marginTop: 12, marginBottom: 20 },
  exploreButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exploreButtonText: { color: '#fff', fontWeight: '600' },
  restaurantCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  restaurantLocation: { fontSize: 13, color: '#666', marginTop: 4 },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  viewButtonText: { color: '#FF6B35', fontWeight: '500', marginRight: 4 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
    marginTop: 20,
    color: '#333',
  },
  noUpdates: {
    marginHorizontal: 16,
    color: '#777',
    marginTop: 10,
    fontStyle: 'italic',
  },
  postCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 12,
    borderRadius: 10,
  },
  postTitle: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  postContent: { fontSize: 13, color: '#555', marginTop: 4 },
  postTime: { fontSize: 12, color: '#999', marginTop: 6 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
