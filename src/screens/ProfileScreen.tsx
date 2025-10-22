import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase'; // adjust path if needed

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    smsNotifications: false,
    emailNotifications: false,
    locationTracking: true,
  });

  // Fetch current user and favorites
  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;
      setCurrentUser(user);

      if (user) {
        const { data: favoriteRows, error: favError } = await supabase
          .from('favorites')
          .select('restaurant_id')
          .eq('user_id', user.id);

        if (favError) throw favError;
        setFavoritesCount(favoriteRows?.length || 0);
      }
    } catch (error) {
      console.error('User error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sign out user properly
  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert('Error', error.message);
            return;
          }
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  const userId = currentUser?.id;

  useEffect(() => {
    if (!userId) return;
    
    const fetchStats = async () => {
      const { data: followRows, error: followErr } = await supabase
      .from('user_follows')
      .select('id, restaurant_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

      if (followErr) throw followErr;

      console.log('followCount', followRows);
      setFollowingCount(followRows?.length || 0);

    }
    fetchStats()

  }, [userId]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#171717" />
      </View>
    );
  }

  console.log('user', currentUser);

  return (
    <ScrollView style={styles.container}>
      {/* User Info Section */}
      <View style={styles.section}>
        <View style={styles.userInfo}>
          {currentUser?.user_metadata?.avatar_url ? (
            <Image
              source={{ uri: currentUser.user_metadata.avatar_url }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#171717" />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {currentUser?.user_metadata?.first_name && ` ${currentUser?.user_metadata?.first_name}`}
              {currentUser?.user_metadata?.last_name && ` ${currentUser?.user_metadata?.last_name}`}
              {!currentUser?.user_metadata?.first_name && !currentUser?.user_metadata?.last_name && 'User'}
            </Text>
            <Text style={styles.userEmail}>{currentUser?.email}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="pencil" size={20} color="#171717" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{favoritesCount}</Text>
            <Text style={styles.statLabel}>
              Favorites
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>
      </View>

      {/* Notification Settings (Dummy) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        {[
          {
            icon: 'notifications',
            title: 'Push Notifications',
            subtitle: 'Get notified about new deals',
            key: 'pushNotifications',
          },
          {
            icon: 'chatbubble',
            title: 'SMS Notifications',
            subtitle: 'Receive deals via text message',
            key: 'smsNotifications',
          },
          {
            icon: 'mail',
            title: 'Email Notifications',
            subtitle: 'Weekly digest of deals',
            key: 'emailNotifications',
          },
          {
            icon: 'location',
            title: 'Location Tracking',
            subtitle: 'Find deals near you',
            key: 'locationTracking',
          },
        ].map((item) => (
          <View key={item.key} style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name={item.icon as any} size={20} color="#171717" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
            <Switch
              value={notificationSettings[item.key as keyof typeof notificationSettings]}
              onValueChange={() =>
                setNotificationSettings((prev) => ({
                  ...prev,
                  [item.key]: !prev[item.key as keyof typeof notificationSettings],
                }))
              }
              trackColor={{ false: '#ccc', true: '#171717' }}
            />
          </View>
        ))}
      </View>

      {/* Menu Options (Dummy) */}
      <View style={styles.section}>
        {[
          { icon: 'help-circle-outline', text: 'Help & Support' },
          { icon: 'document-text-outline', text: 'Terms & Privacy' },
          { icon: 'star-outline', text: 'Rate the App' },
          { icon: 'share-outline', text: 'Share with Friends' },
        ].map((item) => (
          <TouchableOpacity key={item.text} style={styles.menuItem}>
            <Ionicons name={item.icon as any} size={20} color="#666" />
            <Text style={styles.menuText}>{item.text}</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: '#fff', marginVertical: 8, paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff2ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarImage: { width: 60, height: 60, borderRadius: 30, marginRight: 16 },
  userDetails: { flex: 1 },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#666' },
  editButton: { padding: 8 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#171717', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#666' },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingText: { marginLeft: 12, flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '500', color: '#333' },
  settingSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: { fontSize: 16, color: '#333', marginLeft: 12, flex: 1 },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  signOutText: { fontSize: 16, color: '#e74c3c', marginLeft: 8, fontWeight: '500' },
  footer: { alignItems: 'center', paddingVertical: 20 },
  version: { fontSize: 12, color: '#999' },
});
