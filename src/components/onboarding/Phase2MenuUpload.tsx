import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

interface Phase2Data {
  regularMenuFile: any | null;
}

interface Props {
  data: Phase2Data;
  onComplete: (data: Partial<Phase2Data>) => void;
  onUpdate: (data: Partial<Phase2Data>) => void;
  isLoading: boolean;
}

export default function Phase2MenuUpload({ data, onComplete, onUpdate, isLoading }: Props) {
  const [formData, setFormData] = useState<Phase2Data>(data);
  const [error, setError] = useState('');

  const handleFileChange = (file: any | null) => {
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.mimeType || file.type)) {
        setError('Please upload a PDF or image file (JPG, PNG)');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setError('');
    }

    const newData = { ...formData, regularMenuFile: file };
    setFormData(newData);
    onUpdate(newData);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        handleFileChange(file);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const pickImage = async () => {
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
          name: asset.fileName || 'menu.jpg',
          type: asset.type || 'image/jpeg',
          size: asset.fileSize || 0,
        };
        handleFileChange(file);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
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
          name: 'menu_photo.jpg',
          type: 'image/jpeg',
          size: asset.fileSize || 0,
        };
        handleFileChange(file);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showPickerOptions = () => {
    Alert.alert(
      'Upload Menu',
      'Choose how you want to upload your menu',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Browse Files', onPress: pickDocument },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const removeFile = () => {
    handleFileChange(null);
  };

  const handleSubmit = () => {
    if (!formData.regularMenuFile) {
      setError('Please upload your menu');
      return;
    }
    onComplete(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={20} color="#171717" />
          <Text style={styles.sectionTitle}>Upload Your Regular Menu</Text>
        </View>

        <Text style={styles.description}>
          Upload your standard menu that customers will see. This can be a PDF or high-quality image of your menu.
        </Text>

        {!formData.regularMenuFile ? (
          <TouchableOpacity style={styles.uploadArea} onPress={showPickerOptions}>
            <Ionicons name="cloud-upload-outline" size={48} color="#6b7280" />
            <Text style={styles.uploadTitle}>Tap to upload your menu</Text>
            <Text style={styles.uploadSubtitle}>Supports PDF, JPG, PNG files up to 10MB</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.filePreview}>
            {formData.regularMenuFile.type?.startsWith('image/') || formData.regularMenuFile.uri ? (
              <Image source={{ uri: formData.regularMenuFile.uri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.fileIcon}>
                <Ionicons name="document-text" size={32} color="#10B981" />
              </View>
            )}
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{formData.regularMenuFile.name}</Text>
              <Text style={styles.fileSize}>
                {formatFileSize(formData.regularMenuFile.size || 0)}
              </Text>
            </View>
            <TouchableOpacity style={styles.removeButton} onPress={removeFile}>
              <Ionicons name="close" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Tips for a great menu upload:</Text>
        <View style={styles.tipsList}>
          <Text style={styles.tipItem}>• Use high-resolution images or clear PDF files</Text>
          <Text style={styles.tipItem}>• Make sure all text is readable</Text>
          <Text style={styles.tipItem}>• Include prices and descriptions</Text>
          <Text style={styles.tipItem}>• Keep file size under 10MB for faster loading</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.continueButton, (!formData.regularMenuFile || isLoading) && styles.continueButtonDisabled]}
        onPress={handleSubmit}
        disabled={!formData.regularMenuFile || isLoading}
      >
        <Text style={styles.continueButtonText}>
          {isLoading ? 'Uploading...' : 'Continue to Special Menus'}
        </Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
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
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 16,
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  fileIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: '#059669',
  },
  removeButton: {
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 8,
  },
  tipsContainer: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  tipsList: {
    gap: 4,
  },
  tipItem: {
    fontSize: 12,
    color: '#1d4ed8',
    lineHeight: 16,
  },
  continueButton: {
    backgroundColor: '#171717',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});
