import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

interface FoodImage {
  id: string;
  restaurant_id: string;
  image_url: string;
  image_type: string;
  food_name: string | null;
  caption: string | null;
  sort_order: number;
}

const ManageImagesScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as any;

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'branding' | 'interior-exterior' | 'food'>('branding');
  
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [exteriorUrl, setExteriorUrl] = useState<string | null>(null);
  const [interiorUrl, setInteriorUrl] = useState<string | null>(null);
  const [foodImages, setFoodImages] = useState<FoodImage[]>([]);
  
  const [showFoodImageModal, setShowFoodImageModal] = useState(false);
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodDescription, setNewFoodDescription] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const resId = params?.restaurantId;
      if (!resId) {
        // Fetch restaurant ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert('Error', 'Please login to continue');
          navigation.goBack();
          return;
        }

        const { data: restaurant, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('owner_id', user.id)
          .single();

        if (error || !restaurant) {
          Alert.alert('Error', 'Restaurant not found');
          navigation.goBack();
          return;
        }

        setRestaurantId(restaurant.id);
        setLogoUrl(restaurant.logo_url);
        setExteriorUrl(restaurant.exterior_image_url);
        setInteriorUrl(restaurant.interior_image_url);
      } else {
        setRestaurantId(resId);
        
        // Load restaurant images
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('logo_url, exterior_image_url, interior_image_url')
          .eq('id', resId)
          .single();

        if (restaurant) {
          setLogoUrl(restaurant.logo_url);
          setExteriorUrl(restaurant.exterior_image_url);
          setInteriorUrl(restaurant.interior_image_url);
        }
      }

      // Load food images
      if (resId || restaurantId) {
        const { data: foodImagesData, error: foodError } = await supabase
          .from('restaurant_images')
          .select('*')
          .eq('restaurant_id', resId || restaurantId)
          .eq('image_type', 'food')
          .order('sort_order', { ascending: true });

        if (!foodError && foodImagesData) {
          setFoodImages(foodImagesData);
        }
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      Alert.alert('Error', error.message || 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    // Request permission
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return null;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      return result.assets[0];
    }
    return null;
  };

  const uploadImage = async (
    imageAsset: any,
    bucket: string,
    path: string,
    updateField?: string
  ) => {
    try {
      setUploading(true);

      // Create form data
      const fileExt = imageAsset.uri.split('.').pop();
      const fileName = `${path}-${Date.now()}.${fileExt}`;
      const filePath = `${restaurantId}/${fileName}`;

      // For React Native, we need to create a blob or use fetch
      const response = await fetch(imageAsset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: imageAsset.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // Update restaurant record if needed
      if (updateField && restaurantId) {
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({ [updateField]: publicUrl })
          .eq('id', restaurantId);

        if (updateError) throw updateError;
      }

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async () => {
    const imageAsset = await pickImage();
    if (!imageAsset) return;

    const url = await uploadImage(imageAsset, 'restaurant-images', 'logo', 'logo_url');
    if (url) {
      setLogoUrl(url);
      Alert.alert('Success', 'Logo uploaded successfully');
    }
  };

  const handleExteriorUpload = async () => {
    const imageAsset = await pickImage();
    if (!imageAsset) return;

    const url = await uploadImage(imageAsset, 'restaurant-images', 'exterior', 'exterior_image_url');
    if (url) {
      setExteriorUrl(url);
      Alert.alert('Success', 'Exterior image uploaded successfully');
    }
  };

  const handleInteriorUpload = async () => {
    const imageAsset = await pickImage();
    if (!imageAsset) return;

    const url = await uploadImage(imageAsset, 'restaurant-images', 'interior', 'interior_image_url');
    if (url) {
      setInteriorUrl(url);
      Alert.alert('Success', 'Interior image uploaded successfully');
    }
  };

  const handleFoodImageUpload = async () => {
    const imageAsset = await pickImage();
    if (!imageAsset) return;

    try {
      setUploading(true);

      const fileExt = imageAsset.uri.split('.').pop();
      const fileName = `food-${Date.now()}.${fileExt}`;
      const filePath = `${restaurantId}/${fileName}`;

      const response = await fetch(imageAsset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, blob, {
          contentType: imageAsset.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('restaurant-images').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // Add to database
      const { data: newImage, error: insertError } = await supabase
        .from('restaurant_images')
        .insert({
          restaurant_id: restaurantId,
          image_url: publicUrl,
          image_type: 'food',
          food_name: newFoodName || 'Unnamed dish',
          caption: newFoodDescription || null,
          sort_order: foodImages.length,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setFoodImages([...foodImages, newImage]);
      setNewFoodName('');
      setNewFoodDescription('');
      setShowFoodImageModal(false);
      Alert.alert('Success', 'Food image uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload food image');
    } finally {
      setUploading(false);
    }
  };

  const deleteFoodImage = async (imageId: string) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('restaurant_images')
                .delete()
                .eq('id', imageId);

              if (error) throw error;

              setFoodImages(foodImages.filter(img => img.id !== imageId));
              Alert.alert('Success', 'Image deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete image');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#171717" />
        <Text style={styles.loadingText}>Loading images...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#171717" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Images</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'branding' && styles.tabActive]}
          onPress={() => setActiveTab('branding')}
        >
          <Text style={[styles.tabText, activeTab === 'branding' && styles.tabTextActive]}>
            Branding
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'interior-exterior' && styles.tabActive]}
          onPress={() => setActiveTab('interior-exterior')}
        >
          <Text style={[styles.tabText, activeTab === 'interior-exterior' && styles.tabTextActive]}>
            Interior & Exterior
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'food' && styles.tabActive]}
          onPress={() => setActiveTab('food')}
        >
          <Text style={[styles.tabText, activeTab === 'food' && styles.tabTextActive]}>
            Food
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Logo</Text>
              <View style={styles.imageContainer}>
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={styles.image} resizeMode="contain" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.placeholderText}>No logo uploaded</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={handleLogoUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.uploadButtonText}>Uploading...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.uploadButtonText}>
                      {logoUrl ? 'Change Logo' : 'Upload Logo'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Interior & Exterior Tab */}
          {activeTab === 'interior-exterior' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Exterior</Text>
                <View style={styles.imageContainer}>
                  {exteriorUrl ? (
                    <Image source={{ uri: exteriorUrl }} style={styles.image} resizeMode="cover" />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.placeholderText}>No exterior image</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                  onPress={handleExteriorUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.uploadButtonText}>Uploading...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.uploadButtonText}>
                        {exteriorUrl ? 'Change Exterior Image' : 'Upload Exterior Image'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Interior</Text>
                <View style={styles.imageContainer}>
                  {interiorUrl ? (
                    <Image source={{ uri: interiorUrl }} style={styles.image} resizeMode="cover" />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.placeholderText}>No interior image</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                  onPress={handleInteriorUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.uploadButtonText}>Uploading...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.uploadButtonText}>
                        {interiorUrl ? 'Change Interior Image' : 'Upload Interior Image'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Food Tab */}
          {activeTab === 'food' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Food Images</Text>
              
              {foodImages.length > 0 && (
                <View style={styles.foodImagesGrid}>
                  {foodImages.map((foodImage) => (
                    <View key={foodImage.id} style={styles.foodImageCard}>
                      <Image
                        source={{ uri: foodImage.image_url }}
                        style={styles.foodImage}
                        resizeMode="cover"
                      />
                      <View style={styles.foodImageInfo}>
                        <Text style={styles.foodImageName} numberOfLines={1}>
                          {foodImage.food_name || 'Unnamed dish'}
                        </Text>
                        {foodImage.caption && (
                          <Text style={styles.foodImageCaption} numberOfLines={2}>
                            {foodImage.caption}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteFoodImage(foodImage.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={() => setShowFoodImageModal(true)}
                disabled={uploading}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.uploadButtonText}>Add Food Image</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>

      {/* Food Image Upload Modal */}
      <Modal
        visible={showFoodImageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFoodImageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Food Image</Text>
              <TouchableOpacity onPress={() => setShowFoodImageModal(false)}>
                <Ionicons name="close" size={24} color="#171717" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Dish Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newFoodName}
                  onChangeText={setNewFoodName}
                  placeholder="e.g., Signature Pasta"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newFoodDescription}
                  onChangeText={setNewFoodDescription}
                  placeholder="Describe this dish..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.modalUploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={handleFoodImageUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.uploadButtonText}>Uploading...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.uploadButtonText}>Choose & Upload Image</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
  },
  placeholder: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#171717',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#171717',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 12,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171717',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  foodImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  foodImageCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  foodImage: {
    width: '100%',
    height: 120,
  },
  foodImageInfo: {
    padding: 8,
  },
  foodImageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 4,
  },
  foodImageCaption: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#171717',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
  },
  modalUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171717',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default ManageImagesScreen;