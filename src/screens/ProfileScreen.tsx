import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }: any) {
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    smsNotifications: false,
    emailNotifications: false,
    locationTracking: true,
  });

  const [userStats] = useState({
    followedRestaurants: 3,
    dealsUsed: 12,
    moneySaved: 85.50,
  });

  const toggleNotification = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => {
          // TODO: Clear user session/tokens when Supabase is integrated
          // For now, navigate back to login screen
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }},
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Info Section */}
      <View style={styles.section}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#4169E1" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>John Doe</Text>
            <Text style={styles.userEmail}>john.doe@example.com</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="pencil" size={20} color="#4169E1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.followedRestaurants}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.dealsUsed}</Text>
            <Text style={styles.statLabel}>Deals Used</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>${userStats.moneySaved}</Text>
            <Text style={styles.statLabel}>Money Saved</Text>
          </View>
        </View>
      </View>

      {/* Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications" size={20} color="#4169E1" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingSubtitle}>Get notified about new deals</Text>
            </View>
          </View>
          <Switch
            value={notificationSettings.pushNotifications}
            onValueChange={() => toggleNotification('pushNotifications')}
            trackColor={{ false: '#ccc', true: '#4169E1' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="chatbubble" size={20} color="#4169E1" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>SMS Notifications</Text>
              <Text style={styles.settingSubtitle}>Receive deals via text message</Text>
            </View>
          </View>
          <Switch
            value={notificationSettings.smsNotifications}
            onValueChange={() => toggleNotification('smsNotifications')}
            trackColor={{ false: '#ccc', true: '#4169E1' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="mail" size={20} color="#4169E1" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Email Notifications</Text>
              <Text style={styles.settingSubtitle}>Weekly digest of deals</Text>
            </View>
          </View>
          <Switch
            value={notificationSettings.emailNotifications}
            onValueChange={() => toggleNotification('emailNotifications')}
            trackColor={{ false: '#ccc', true: '#4169E1' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="location" size={20} color="#4169E1" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Location Tracking</Text>
              <Text style={styles.settingSubtitle}>Find deals near you</Text>
            </View>
          </View>
          <Switch
            value={notificationSettings.locationTracking}
            onValueChange={() => toggleNotification('locationTracking')}
            trackColor={{ false: '#ccc', true: '#4169E1' }}
          />
        </View>
      </View>

      {/* Menu Options */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={20} color="#666" />
          <Text style={styles.menuText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="document-text-outline" size={20} color="#666" />
          <Text style={styles.menuText}>Terms & Privacy</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="star-outline" size={20} color="#666" />
          <Text style={styles.menuText}>Rate the App</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="share-outline" size={20} color="#666" />
          <Text style={styles.menuText}>Share with Friends</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff2ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4169E1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  signOutText: {
    fontSize: 16,
    color: '#e74c3c',
    marginLeft: 8,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  version: {
    fontSize: 12,
    color: '#999',
  },
});
