import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface Promotion {
  id: string;
  title: string;
  description: string;
  discount: string;
  category: string;
  isActive: boolean;
  validUntil: string;
}

const RestaurantDashboardScreen = () => {
  const navigation = useNavigation();
  const [promotions, setPromotions] = useState<Promotion[]>([
    {
      id: '1',
      title: 'Happy Hour Special',
      description: '50% off all cocktails',
      discount: '50% OFF',
      category: 'drinks',
      isActive: true,
      validUntil: '2024-12-31',
    },
    {
      id: '2',
      title: 'Lunch Deal',
      description: 'Buy 1 get 1 free on burgers',
      discount: 'BOGO',
      category: 'food',
      isActive: false,
      validUntil: '2024-12-31',
    },
  ]);

  const [restaurantInfo] = useState({
    name: 'Demo Restaurant',
    address: '123 Main St, City',
    phone: '+1 (555) 123-4567',
    email: 'demo@restaurant.com',
  });

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          }),
        },
      ]
    );
  };

  const togglePromotion = (id: string) => {
    setPromotions(prev => 
      prev.map(promo => 
        promo.id === id ? { ...promo, isActive: !promo.isActive } : promo
      )
    );
  };

  const handleAddPromotion = () => {
    Alert.alert('Coming Soon', 'Add promotion functionality will be implemented');
  };

  const handleEditPromotion = (id: string) => {
    Alert.alert('Coming Soon', 'Edit promotion functionality will be implemented');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.restaurantIcon}>
            <Ionicons name="storefront" size={24} color="#4169E1" />
          </View>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{restaurantInfo.name}</Text>
            <Text style={styles.restaurantAddress}>{restaurantInfo.address}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Active Deals</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>248</Text>
          <Text style={styles.statLabel}>Views Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>34</Text>
          <Text style={styles.statLabel}>Redeemed</Text>
        </View>
      </View>

      {/* Promotions Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Promotions</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddPromotion}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Deal</Text>
          </TouchableOpacity>
        </View>

        {promotions.map((promotion) => (
          <View key={promotion.id} style={styles.promotionCard}>
            <View style={styles.promotionHeader}>
              <View style={styles.promotionInfo}>
                <Text style={styles.promotionTitle}>{promotion.title}</Text>
                <Text style={styles.promotionDescription}>{promotion.description}</Text>
                <View style={styles.promotionMeta}>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{promotion.discount}</Text>
                  </View>
                  <Text style={styles.categoryText}>{promotion.category}</Text>
                </View>
              </View>
              <View style={styles.promotionActions}>
                <Switch
                  value={promotion.isActive}
                  onValueChange={() => togglePromotion(promotion.id)}
                  trackColor={{ false: '#E9ECEF', true: '#4169E1' }}
                  thumbColor={promotion.isActive ? '#FFFFFF' : '#FFFFFF'}
                />
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => handleEditPromotion(promotion.id)}
                >
                  <Ionicons name="pencil" size={16} color="#4169E1" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.validUntil}>Valid until: {promotion.validUntil}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="analytics" size={24} color="#4169E1" />
            <Text style={styles.actionText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="settings" size={24} color="#4169E1" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="help-circle" size={24} color="#4169E1" />
            <Text style={styles.actionText}>Help</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  restaurantIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4169E1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  promotionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  promotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  promotionInfo: {
    flex: 1,
    marginRight: 12,
  },
  promotionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  promotionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  promotionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountBadge: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryText: {
    fontSize: 12,
    color: '#4169E1',
    textTransform: 'capitalize',
  },
  promotionActions: {
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  validUntil: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 14,
    color: '#4169E1',
    fontWeight: '600',
    marginTop: 8,
  },
});

export default RestaurantDashboardScreen;
