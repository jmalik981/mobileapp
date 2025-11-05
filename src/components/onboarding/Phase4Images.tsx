import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface FoodImage {
  file: any;
  name: string;
  description: string;
}

interface Phase4Data {
  logoFile: any | null;
  exteriorImageFile: any | null;
  interiorImageFile: any | null;
  foodImages: FoodImage[];
}

interface Props {
  data: Phase4Data;
  onComplete: (data: Partial<Phase4Data>) => void;
  onUpdate: (data: Partial<Phase4Data>) => void;
  isLoading: boolean;
}

export default function Phase4Images({ data, onComplete, onUpdate, isLoading }: Props) {
  const [formData, setFormData] = useState<Phase4Data>(data);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleImageChange = (type: 'logo' | 'exterior' | 'interior', file: any | null) => {
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({ ...prev, [type]: 'Please upload an image file (JPG, PNG)' }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, [type]: 'Image size must be less than 5MB' }));
        return;
      }

      setErrors((prev) => ({ ...prev, [type]: '' }));
    }

    const newData = {
      ...formData,
      [`${type}File`]: file,
    };
    setFormData(newData);
    onUpdate(newData);
  };

  const addFoodImage = (file: any) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, food: 'Please upload image files only (JPG, PNG)' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, food: 'Image size must be less than 5MB' }));
      return;
    }

    const newFoodImage: FoodImage = {
      file,
      name: '',
      description: '',
    };

    const newData = {
      ...formData,
      foodImages: [...formData.foodImages, newFoodImage],
    };
    setFormData(newData);
    onUpdate(newData);
    setErrors((prev) => ({ ...prev, food: '' }));
  };

  const updateFoodImage = (index: number, updates: Partial<Omit<FoodImage, 'file'>>) => {
    const newFoodImages = [...formData.foodImages];
    newFoodImages[index] = { ...newFoodImages[index], ...updates };

    const newData = { ...formData, foodImages: newFoodImages };
    setFormData(newData);
    onUpdate(newData);
  };

  const removeFoodImage = (index: number) => {
    const newFoodImages = formData.foodImages.filter((_, i) => i !== index);
    const newData = { ...formData, foodImages: newFoodImages };
    setFormData(newData);
    onUpdate(newData);
  };

  const pickImage = async (type: 'logo' | 'exterior' | 'interior' | 'food') => {
    Alert.alert(
      'Add Image',
      'Choose how you want to add your image',
      [
        {
          text: 'Take Photo',
          onPress: () => takePhoto(type),
        },
        {
          text: 'Choose from Library',
          onPress: () => selectFromLibrary(type),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const selectFromLibrary = async (type: 'logo' | 'exterior' | 'interior' | 'food') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const file = {
          uri: asset.uri,
          name: asset.fileName || `${type}.jpg`,
          type: asset.type || 'image/jpeg',
          size: asset.fileSize || 0,
        };

        if (type === 'food') {
          addFoodImage(file);
        } else {
          handleImageChange(type, file);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async (type: 'logo' | 'exterior' | 'interior' | 'food') => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const file = {
          uri: asset.uri,
          name: `${type}_photo.jpg`,
          type: 'image/jpeg',
          size: asset.fileSize || 0,
        };

        if (type === 'food') {
          addFoodImage(file);
        } else {
          handleImageChange(type, file);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSubmit = () => {
    // Validate required images
    const newErrors: Record<string, string> = {};
    if (!formData.logoFile) newErrors.logo = 'Logo is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onComplete(formData);
  };

  const ImageUploadCard = ({
    title,
    description,
    file,
    onFileChange,
    onPickImage,
    error,
    required = false,
  }: {
    title: string;
    description: string;
    file: any | null;
    onFileChange: (file: any | null) => void;
    onPickImage: () => void;
    error?: string;
    required?: boolean;
  }) => (
    <View style={styles.imageCard}>
      <View style={styles.imageCardHeader}>
        <Text style={styles.imageCardTitle}>
          {title}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        <Text style={styles.imageCardDescription}>{description}</Text>
      </View>

      {!file ? (
        <TouchableOpacity
          style={[styles.uploadArea, error && styles.uploadAreaError]}
          onPress={onPickImage}
        >
          <Ionicons name="camera-outline" size={32} color="#6b7280" />
          <Text style={styles.uploadText}>Tap to add image</Text>
          <Text style={styles.uploadSubtext}>JPG, PNG up to 5MB</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: file.uri }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => onFileChange(null)}
          >
            <Ionicons name="close" size={16} color="#ef4444" />
          </TouchableOpacity>
          <Text style={styles.imageFileName}>{file.name}</Text>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Required Images */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="images-outline" size={20} color="#171717" />
          <Text style={styles.sectionTitle}>Restaurant Images</Text>
        </View>

        <ImageUploadCard
          title="Restaurant Logo"
          description="Your restaurant's logo for branding"
          file={formData.logoFile}
          onFileChange={(file) => handleImageChange('logo', file)}
          onPickImage={() => pickImage('logo')}
          error={errors.logo}
          required
        />

        <ImageUploadCard
          title="Exterior Photo"
          description="Outside view of your restaurant (optional)"
          file={formData.exteriorImageFile}
          onFileChange={(file) => handleImageChange('exterior', file)}
          onPickImage={() => pickImage('exterior')}
          error={errors.exterior}
        />

        <ImageUploadCard
          title="Interior Photo"
          description="Inside view of your restaurant (optional)"
          file={formData.interiorImageFile}
          onFileChange={(file) => handleImageChange('interior', file)}
          onPickImage={() => pickImage('interior')}
          error={errors.interior}
        />
      </View>

      {/* Food Images */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="camera-outline" size={20} color="#171717" />
          <Text style={styles.sectionTitle}>Food Images (Optional)</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => pickImage('food')}
          >
            <Ionicons name="add" size={16} color="#171717" />
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>
          Add photos of your dishes with names and descriptions to entice customers
        </Text>

        {errors.food && <Text style={styles.errorText}>{errors.food}</Text>}

        {formData.foodImages.length > 0 ? (
          <View style={styles.foodImagesContainer}>
            {formData.foodImages.map((foodImage, index) => (
              <View key={index} style={styles.foodImageCard}>
                <View style={styles.foodImagePreview}>
                  <Image source={{ uri: foodImage.file.uri }} style={styles.foodImage} />
                  <TouchableOpacity
                    style={styles.removeFoodImageButton}
                    onPress={() => removeFoodImage(index)}
                  >
                    <Ionicons name="close" size={12} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.foodImageForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Dish Name</Text>
                    <TextInput
                      style={styles.input}
                      value={foodImage.name}
                      onChangeText={(value) => updateFoodImage(index, { name: value })}
                      placeholder="e.g., Grilled Salmon"
                      placeholderTextColor="#999"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={foodImage.description}
                      onChangeText={(value) => updateFoodImage(index, { description: value })}
                      placeholder="Brief description of the dish..."
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyFoodImages}>
            <Ionicons name="camera-outline" size={48} color="#6b7280" />
            <Text style={styles.emptyText}>No food images added yet</Text>
            <TouchableOpacity
              style={styles.addFirstImageButton}
              onPress={() => pickImage('food')}
            >
              <Ionicons name="add" size={16} color="#171717" />
              <Text style={styles.addFirstImageText}>Add Your First Food Photo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.completionBanner}>
        <Text style={styles.completionTitle}>Almost done!</Text>
        <Text style={styles.completionText}>
          Once you complete this step, your restaurant will be live on Appy Panda and customers can discover your business.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.completeButton, (!formData.logoFile || isLoading) && styles.completeButtonDisabled]}
        onPress={handleSubmit}
        disabled={!formData.logoFile || isLoading}
      >
        <Text style={styles.completeButtonText}>
          {isLoading ? 'Completing Setup...' : 'Complete Onboarding'}
        </Text>
        <Ionicons name="checkmark" size={16} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    marginLeft: 8,
    flex: 1,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  description: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 16,
  },
  imageCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  imageCardHeader: {
    marginBottom: 12,
  },
  imageCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 4,
  },
  required: {
    color: '#ef4444',
  },
  imageCardDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  uploadAreaError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  uploadText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFileName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
    marginTop: 8,
  },
  foodImagesContainer: {
    gap: 16,
  },
  foodImageCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  foodImagePreview: {
    position: 'relative',
    marginBottom: 12,
  },
  foodImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  removeFoodImageButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodImageForm: {
    gap: 12,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    color: '#171717',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  emptyFoodImages: {
    alignItems: 'center',
    paddingVertical: 40,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 16,
  },
  addFirstImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  addFirstImageText: {
    fontSize: 12,
    color: '#171717',
    marginLeft: 4,
  },
  completionBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 4,
  },
  completionText: {
    fontSize: 12,
    color: '#059669',
    lineHeight: 16,
  },
  completeButton: {
    backgroundColor: '#171717',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
});
