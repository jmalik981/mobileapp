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
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

interface HappyHourDeal {
  title: string;
  description: string;
  price: number;
  days: string[];
  startTime: string;
  endTime: string;
}

interface Phase3Data {
  happyHourMenuFile: any | null;
  lunchMenuFile: any | null;
  happyHourDeals: HappyHourDeal[];
}

interface Props {
  data: Phase3Data;
  onComplete: (data: Partial<Phase3Data>) => void;
  onUpdate: (data: Partial<Phase3Data>) => void;
  isLoading: boolean;
}

const daysOfWeek = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

export default function Phase3SpecialMenus({ data, onComplete, onUpdate, isLoading }: Props) {
  const [formData, setFormData] = useState<Phase3Data>(data);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFileChange = (type: 'happyHour' | 'lunch', file: any | null) => {
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.mimeType || file.type)) {
        setErrors((prev) => ({ ...prev, [type]: 'Please upload a PDF or image file' }));
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, [type]: 'File size must be less than 10MB' }));
        return;
      }

      setErrors((prev) => ({ ...prev, [type]: '' }));
    }

    const newData = {
      ...formData,
      [type === 'happyHour' ? 'happyHourMenuFile' : 'lunchMenuFile']: file,
    };
    setFormData(newData);
    onUpdate(newData);
  };

  const pickFile = async (type: 'happyHour' | 'lunch') => {
    Alert.alert(
      'Upload Menu',
      'Choose how you want to upload your menu',
      [
        {
          text: 'Take Photo',
          onPress: () => takePhoto(type),
        },
        {
          text: 'Choose from Library',
          onPress: () => pickImage(type),
        },
        {
          text: 'Browse Files',
          onPress: () => pickDocument(type),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickDocument = async (type: 'happyHour' | 'lunch') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        handleFileChange(type, file);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const pickImage = async (type: 'happyHour' | 'lunch') => {
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
          name: asset.fileName || `${type}_menu.jpg`,
          type: asset.type || 'image/jpeg',
          size: asset.fileSize || 0,
        };
        handleFileChange(type, file);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async (type: 'happyHour' | 'lunch') => {
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
          name: `${type}_menu_photo.jpg`,
          type: 'image/jpeg',
          size: asset.fileSize || 0,
        };
        handleFileChange(type, file);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const addHappyHourDeal = () => {
    const newDeal: HappyHourDeal = {
      title: '',
      description: '',
      price: 0,
      days: [],
      startTime: '16:00',
      endTime: '19:00',
    };

    const newData = {
      ...formData,
      happyHourDeals: [...formData.happyHourDeals, newDeal],
    };
    setFormData(newData);
    onUpdate(newData);
  };

  const removeHappyHourDeal = (index: number) => {
    const newData = {
      ...formData,
      happyHourDeals: formData.happyHourDeals.filter((_, i) => i !== index),
    };
    setFormData(newData);
    onUpdate(newData);
  };

  const updateHappyHourDeal = (index: number, updates: Partial<HappyHourDeal>) => {
    const newDeals = [...formData.happyHourDeals];
    newDeals[index] = { ...newDeals[index], ...updates };

    const newData = {
      ...formData,
      happyHourDeals: newDeals,
    };
    setFormData(newData);
    onUpdate(newData);
  };

  const handleDayToggle = (dealIndex: number, day: string) => {
    const deal = formData.happyHourDeals[dealIndex];
    const newDays = deal.days.includes(day)
      ? deal.days.filter((d) => d !== day)
      : [...deal.days, day];

    updateHappyHourDeal(dealIndex, { days: newDays });
  };

  const handleSubmit = () => {
    onComplete(formData);
  };

  const handleSkip = () => {
    onComplete({});
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const FileUploadCard = ({
    title,
    file,
    onFileChange,
    onPickFile,
    error,
  }: {
    title: string;
    file: any | null;
    onFileChange: (file: any | null) => void;
    onPickFile: () => void;
    error?: string;
  }) => (
    <View style={styles.fileCard}>
      <Text style={styles.fileCardTitle}>{title}</Text>
      {!file ? (
        <TouchableOpacity style={styles.uploadButton} onPress={onPickFile}>
          <Ionicons name="cloud-upload-outline" size={24} color="#6b7280" />
          <Text style={styles.uploadButtonText}>Tap to upload menu</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.filePreview}>
          {file.type?.startsWith('image/') || file.uri ? (
            <Image source={{ uri: file.uri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.fileIcon}>
              <Ionicons name="document-text" size={20} color="#10B981" />
            </View>
          )}
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>{file.name}</Text>
            <Text style={styles.fileSize}>{formatFileSize(file.size || 0)}</Text>
          </View>
          <TouchableOpacity onPress={() => onFileChange(null)}>
            <Ionicons name="close" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.optionalBanner}>
        <Text style={styles.optionalTitle}>This phase is optional!</Text>
        <Text style={styles.optionalText}>
          You can skip this step and add special menus later, or continue to add your happy hour and lunch specials now.
        </Text>
      </View>

      {/* Menu File Uploads */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={20} color="#171717" />
          <Text style={styles.sectionTitle}>Special Menu Uploads (Optional)</Text>
        </View>

        <View style={styles.fileCardsContainer}>
          <FileUploadCard
            title="Happy Hour Menu"
            file={formData.happyHourMenuFile}
            onFileChange={(file) => handleFileChange('happyHour', file)}
            onPickFile={() => pickFile('happyHour')}
            error={errors.happyHour}
          />

          <FileUploadCard
            title="Lunch Menu"
            file={formData.lunchMenuFile}
            onFileChange={(file) => handleFileChange('lunch', file)}
            onPickFile={() => pickFile('lunch')}
            error={errors.lunch}
          />
        </View>
      </View>

      {/* Happy Hour Deals */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="pricetag-outline" size={20} color="#171717" />
          <Text style={styles.sectionTitle}>Happy Hour Deals (Optional)</Text>
          <TouchableOpacity style={styles.addButton} onPress={addHappyHourDeal}>
            <Ionicons name="add" size={16} color="#171717" />
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>
          Add specific deals like "Wings and beer for $10 every Wednesday 12pm to 6pm"
        </Text>

        {formData.happyHourDeals.map((deal, index) => (
          <View key={index} style={styles.dealCard}>
            <View style={styles.dealHeader}>
              <Text style={styles.dealTitle}>Deal #{index + 1}</Text>
              <TouchableOpacity onPress={() => removeHappyHourDeal(index)}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.dealForm}>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 2 }]}>
                  <Text style={styles.label}>Deal Title</Text>
                  <TextInput
                    style={styles.input}
                    value={deal.title}
                    onChangeText={(value) => updateHappyHourDeal(index, { title: value })}
                    placeholder="Wings and Beer Special"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>Price ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={deal.price ? deal.price.toString() : ''}
                    onChangeText={(value) => updateHappyHourDeal(index, { price: parseFloat(value) || 0 })}
                    placeholder="10.00"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={deal.description}
                  onChangeText={(value) => updateHappyHourDeal(index, { description: value })}
                  placeholder="Wings and beer for 10 dollars"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Days of the Week</Text>
                <View style={styles.daysContainer}>
                  {daysOfWeek.map((day) => (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.dayButton,
                        deal.days.includes(day.value) && styles.dayButtonActive,
                      ]}
                      onPress={() => handleDayToggle(index, day.value)}
                    >
                      <Text
                        style={[
                          styles.dayButtonText,
                          deal.days.includes(day.value) && styles.dayButtonTextActive,
                        ]}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Start Time</Text>
                  <TextInput
                    style={styles.input}
                    value={deal.startTime}
                    onChangeText={(value) => updateHappyHourDeal(index, { startTime: value })}
                    placeholder="16:00"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>End Time</Text>
                  <TextInput
                    style={styles.input}
                    value={deal.endTime}
                    onChangeText={(value) => updateHappyHourDeal(index, { endTime: value })}
                    placeholder="19:00"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            </View>
          </View>
        ))}

        {formData.happyHourDeals.length === 0 && (
          <View style={styles.emptyDeals}>
            <Ionicons name="pricetag-outline" size={48} color="#6b7280" />
            <Text style={styles.emptyDealsText}>No deals added yet</Text>
            <TouchableOpacity style={styles.addFirstDealButton} onPress={addHappyHourDeal}>
              <Ionicons name="add" size={16} color="#171717" />
              <Text style={styles.addFirstDealText}>Add Your First Deal</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.navigation}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip This Step</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? 'Saving...' : 'Continue to Images'}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  optionalBanner: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  optionalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  optionalText: {
    fontSize: 12,
    color: '#1d4ed8',
    lineHeight: 16,
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
  fileCardsContainer: {
    gap: 16,
  },
  fileCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fileCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 12,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  uploadButtonText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 12,
  },
  imagePreview: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 8,
  },
  fileName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  fileSize: {
    fontSize: 10,
    color: '#059669',
    marginTop: 2,
  },
  dealCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dealTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  dealForm: {
    gap: 12,
  },
  inputGroup: {
    marginBottom: 12,
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
  row: {
    flexDirection: 'row',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  dayButtonActive: {
    backgroundColor: '#171717',
    borderColor: '#171717',
  },
  dayButtonText: {
    fontSize: 12,
    color: '#6b7280',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  emptyDeals: {
    alignItems: 'center',
    paddingVertical: 40,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  emptyDealsText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 16,
  },
  addFirstDealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  addFirstDealText: {
    fontSize: 12,
    color: '#171717',
    marginLeft: 4,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  continueButton: {
    backgroundColor: '#171717',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  errorText: {
    fontSize: 10,
    color: '#ef4444',
    marginTop: 4,
  },
});
