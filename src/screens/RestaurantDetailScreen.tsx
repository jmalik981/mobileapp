import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Linking,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

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
  lunch_menu_text?: string | null;
  cuisine_type?: { id: number; name: string } | null;
  food_style?: { id: number; name: string } | null;
  dietary_restriction?: { id: number; name: string } | null;
}

interface HappyHourDeal {
  id: string;
  title: string;
  description: string;
  price: number;
  days_of_week: string[];
  start_time: string;
  end_time: string;
}

interface LunchSpecial {
  id: string;
  title: string;
  description: string;
  price?: number;
  start_time?: string;
  end_time?: string;
  start_date?: string;
  end_date?: string;
}

interface MenuImage {
  url: string;
  name: string;
}

export default function RestaurantDetailScreen({ route, navigation }: any) {
  const { restaurantId } = route.params;
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [happyHourDeals, setHappyHourDeals] = useState<HappyHourDeal[]>([]);
  const [lunchSpecials, setLunchSpecials] = useState<LunchSpecial[]>([]);
  const [menuImages, setMenuImages] = useState<MenuImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    loadRestaurantData();
    checkIfFavorite();
  }, [restaurantId]);

  const loadRestaurantData = async () => {
    try {
      setLoading(true);

      // Fetch restaurant details
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select(`
          *,
          cuisine_type:cuisine_types!cuisine_type_id(id, name),
          food_style:food_styles!food_style_id(id, name),
          dietary_restriction:dietary_restrictions!dietary_restriction_id(id, name)
        `)
        .eq('id', restaurantId)
        .single();

      if (restaurantError) throw restaurantError;
      setRestaurant(restaurantData);

      // Fetch happy hour deals
      const { data: dealsData } = await supabase
        .from('happy_hour_deals')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true);

      if (dealsData) setHappyHourDeals(dealsData);

      // Fetch lunch specials
      const { data: lunchData } = await supabase
        .from('content')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('type', 'lunch_special')
        .eq('is_active', true);

      if (lunchData) setLunchSpecials(lunchData);

      // Fetch menu images from storage
      const { data: menuFiles } = await supabase.storage
        .from('menus')
        .list(`${restaurantId}/`, { limit: 100 });

      if (menuFiles) {
        const images = menuFiles
          .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name))
          .map(file => ({
            url: supabase.storage.from('menus').getPublicUrl(`${restaurantId}/${file.name}`).data.publicUrl,
            name: file.name,
          }));
        setMenuImages(images);
      }

    } catch (error) {
      console.error('Error loading restaurant:', error);
      Alert.alert('Error', 'Failed to load restaurant details');
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const toggleFavorite = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Login Required', 'Please login to save favorites');
        return;
      }

      if (isFavorite) {
        // Remove from favorites
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('restaurant_id', restaurantId);
        
        setIsFavorite(false);
        Alert.alert('Removed', 'Restaurant removed from favorites');
      } else {
        // Add to favorites
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, restaurant_id: restaurantId });
        
        setIsFavorite(true);
        Alert.alert('Saved', 'Restaurant added to favorites!');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  const openPhone = () => {
    if (restaurant?.phone) {
      Linking.openURL(`tel:${restaurant.phone}`);
    }
  };

  const openWebsite = () => {
    if (restaurant?.website) {
      let url = restaurant.website;
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      Linking.openURL(url);
    }
  };

  const openMaps = () => {
    if (restaurant) {
      const address = `${restaurant.address}, ${restaurant.city}, ${restaurant.state} ${restaurant.zip_code}`;
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      Linking.openURL(url);
    }
  };

  const openSocial = (platform: 'instagram' | 'tiktok' | 'facebook') => {
    let url = '';
    if (platform === 'instagram' && restaurant?.instagram_handle) {
      url = `https://instagram.com/${restaurant.instagram_handle.replace('@', '')}`;
    } else if (platform === 'tiktok' && restaurant?.tiktok_handle) {
      url = `https://tiktok.com/@${restaurant.tiktok_handle.replace('@', '')}`;
    } else if (platform === 'facebook' && restaurant?.facebook_page_url) {
      url = restaurant.facebook_page_url;
    }
    if (url) Linking.openURL(url);
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return time;
    }
  };

  const formatDays = (days: string[]) => {
    if (days.length === 7) return 'Every day';
    const dayMap: Record<string, string> = {
      monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
      thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
    };
    return days.map(d => dayMap[d] || d).join(', ');
  };

  const getTodayHours = () => {
    if (!restaurant) return 'Closed';
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    const key = `hours_${today}` as keyof Restaurant;
    return (restaurant[key] as string) || 'Closed';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#171717" />
        <Text style={styles.loadingText}>Loading restaurant...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#999" />
        <Text style={styles.errorText}>Restaurant not found</Text>
      </View>
    );
  }

  const coverImage = restaurant.cover_image_url || restaurant.exterior_image_url || restaurant.image_url;
  const allImages = [
    coverImage,
    restaurant.exterior_image_url,
    restaurant.interior_image_url,
    ...menuImages.map(img => img.url)
  ].filter(Boolean);

  return (
    <ScrollView style={styles.container}>
      {/* Hero Image Gallery */}
      <View style={styles.heroContainer}>
        {allImages.length > 0 && (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setSelectedImageIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {allImages.map((img, idx) => (
                <Image
                  key={idx}
                  source={{ uri: img || 'https://via.placeholder.com/400x300' }}
                  style={styles.heroImage}
                />
              ))}
            </ScrollView>
            
            {/* Image Indicators */}
            <View style={styles.imageIndicators}>
              {allImages.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.indicator,
                    selectedImageIndex === idx && styles.indicatorActive
                  ]}
                />
              ))}
            </View>
          </>
        )}

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Favorite Button */}
        <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={28}
            color={isFavorite ? "#ff4444" : "#fff"}
          />
        </TouchableOpacity>
      </View>

      {/* Restaurant Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {restaurant.logo_url && (
            <Image source={{ uri: restaurant.logo_url }} style={styles.logo} />
          )}
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <Text style={styles.name}>{restaurant.name}</Text>
              {restaurant.is_verified && (
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              )}
            </View>
            {restaurant.description && (
              <Text style={styles.description}>{restaurant.description}</Text>
            )}
          </View>
        </View>

        {/* Tags */}
        <View style={styles.tagsRow}>
          {restaurant.cuisine_type && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{restaurant.cuisine_type.name}</Text>
            </View>
          )}
          {restaurant.food_style && (
            <View style={[styles.tag, styles.tagOutline]}>
              <Text style={styles.tagTextOutline}>{restaurant.food_style.name}</Text>
            </View>
          )}
          {restaurant.dietary_restriction && (
            <View style={[styles.tag, styles.tagGreen]}>
              <Text style={styles.tagTextGreen}>{restaurant.dietary_restriction.name}</Text>
            </View>
          )}
          {restaurant.price_range && (
            <View style={[styles.tag, styles.tagOutline]}>
              <Text style={styles.tagTextOutline}>{restaurant.price_range}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={openPhone}>
          <Ionicons name="call" size={20} color="#171717" />
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={openMaps}>
          <Ionicons name="navigate" size={20} color="#171717" />
          <Text style={styles.actionText}>Directions</Text>
        </TouchableOpacity>
        {restaurant.website && (
          <TouchableOpacity style={styles.actionButton} onPress={openWebsite}>
            <Ionicons name="globe" size={20} color="#171717" />
            <Text style={styles.actionText}>Website</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact & Location</Text>
        
        <View style={styles.infoRow}>
          <Ionicons name="location" size={20} color="#666" />
          <Text style={styles.infoText}>
            {restaurant.address}, {restaurant.city}, {restaurant.state} {restaurant.zip_code}
          </Text>
        </View>

        {restaurant.phone && (
          <TouchableOpacity style={styles.infoRow} onPress={openPhone}>
            <Ionicons name="call" size={20} color="#666" />
            <Text style={[styles.infoText, styles.linkText]}>{restaurant.phone}</Text>
          </TouchableOpacity>
        )}

        {restaurant.website && (
          <TouchableOpacity style={styles.infoRow} onPress={openWebsite}>
            <Ionicons name="globe" size={20} color="#666" />
            <Text style={[styles.infoText, styles.linkText]}>
              {restaurant.website.replace(/^https?:\/\/(www\.)?/, '')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Social Media */}
        {(restaurant.instagram_handle || restaurant.tiktok_handle || restaurant.facebook_page_url) && (
          <View style={styles.socialRow}>
            {restaurant.instagram_handle && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openSocial('instagram')}
              >
                <Ionicons name="logo-instagram" size={24} color="#E4405F" />
              </TouchableOpacity>
            )}
            {restaurant.tiktok_handle && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openSocial('tiktok')}
              >
                <Ionicons name="musical-notes" size={24} color="#000" />
              </TouchableOpacity>
            )}
            {restaurant.facebook_page_url && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openSocial('facebook')}
              >
                <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hours</Text>
        <View style={styles.todayHours}>
          <Text style={styles.todayLabel}>Today:</Text>
          <Text style={styles.todayValue}>{getTodayHours()}</Text>
        </View>
        
        <View style={styles.hoursGrid}>
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
            const key = `hours_${day.toLowerCase()}` as keyof Restaurant;
            const hours = (restaurant[key] as string) || 'Closed';
            return (
              <View key={day} style={styles.hoursRow}>
                <Text style={styles.dayText}>{day}</Text>
                <Text style={[styles.hoursText, hours === 'Closed' && styles.closedText]}>
                  {hours}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Happy Hour Deals */}
      {happyHourDeals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Happy Hour Deals</Text>
          {happyHourDeals.map((deal) => (
            <View key={deal.id} style={styles.dealCard}>
              <View style={styles.dealHeader}>
                <Text style={styles.dealTitle}>{deal.title}</Text>
                <View style={styles.priceTag}>
                  <Text style={styles.priceText}>${deal.price.toFixed(2)}</Text>
                </View>
              </View>
              <Text style={styles.dealDescription}>{deal.description}</Text>
              <View style={styles.dealMeta}>
                <View style={styles.dealMetaItem}>
                  <Ionicons name="time" size={14} color="#f59e0b" />
                  <Text style={styles.dealMetaText}>
                    {formatTime(deal.start_time)} - {formatTime(deal.end_time)}
                  </Text>
                </View>
                <View style={styles.dealMetaItem}>
                  <Ionicons name="calendar" size={14} color="#f59e0b" />
                  <Text style={styles.dealMetaText}>{formatDays(deal.days_of_week)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Lunch Specials */}
      {lunchSpecials.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lunch Specials</Text>
          {lunchSpecials.map((special) => (
            <View key={special.id} style={styles.lunchCard}>
              <View style={styles.dealHeader}>
                <Text style={styles.dealTitle}>{special.title}</Text>
                {special.price && (
                  <View style={[styles.priceTag, styles.blueTag]}>
                    <Text style={styles.priceText}>${Number(special.price).toFixed(2)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.dealDescription}>{special.description}</Text>
              {special.start_time && special.end_time && (
                <View style={styles.dealMetaItem}>
                  <Ionicons name="time" size={14} color="#3b82f6" />
                  <Text style={[styles.dealMetaText, styles.blueText]}>
                    {formatTime(special.start_time)} - {formatTime(special.end_time)}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Lunch Menu Text */}
      {restaurant.lunch_menu_text && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lunch Menu</Text>
          <Text style={styles.menuText}>{restaurant.lunch_menu_text}</Text>
        </View>
      )}

      {/* Menu Images */}
      {menuImages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu Gallery</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {menuImages.map((image, idx) => (
              <Image
                key={idx}
                source={{ uri: image.url }}
                style={styles.menuImage}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#999',
  },
  heroContainer: {
    position: 'relative',
    height: 300,
    backgroundColor: '#000',
  },
  heroImage: {
    width: width,
    height: 300,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 40,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTop: {
    flexDirection: 'row',
    gap: 16,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#e9ecef',
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  tag: {
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagOutline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tagGreen: {
    backgroundColor: '#dcfce7',
  },
  tagText: {
    fontSize: 12,
    color: '#171717',
    fontWeight: '500',
  },
  tagTextOutline: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tagTextGreen: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#171717',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  linkText: {
    color: '#171717',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayHours: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    marginBottom: 16,
  },
  todayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  todayValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  hoursGrid: {
    gap: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  hoursText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  closedText: {
    color: '#999',
  },
  dealCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  lunchCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  dealTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  priceTag: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  blueTag: {
    backgroundColor: '#3b82f6',
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  dealDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  dealMeta: {
    gap: 8,
  },
  dealMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dealMetaText: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '500',
  },
  blueText: {
    color: '#2563eb',
  },
  menuText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  menuImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#e9ecef',
  },
});