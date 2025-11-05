import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

interface MenuFile {
  name: string;
  url: string;
  path: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LunchSpecialScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [savingWritten, setSavingWritten] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [files, setFiles] = useState<MenuFile[]>([]);
  const [writtenMenu, setWrittenMenu] = useState('');
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  const BUCKET = 'lunch-menus';

  useEffect(() => {
    loadData();
  }, []);

  const isImageFile = (filename: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please login to continue');
        navigation.goBack();
        return;
      }

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id, lunch_menu_text')
        .eq('owner_id', user.id)
        .single();

      if (!restaurant) {
        Alert.alert('Error', 'Restaurant not found. Complete setup first.');
        navigation.goBack();
        return;
      }

      setRestaurantId(restaurant.id);
      setWrittenMenu(restaurant.lunch_menu_text || '');

      const prefix = `${restaurant.id}/`;
      const { data: listed } = await supabase.storage
        .from(BUCKET)
        .list(prefix, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

      const items = listed || [];

      // Load saved order
      const { data: orderRows } = await supabase
        .from('media_order')
        .select('path, sort_index')
        .eq('restaurant_id', restaurant.id)
        .eq('bucket', BUCKET);

      const orderMap = new Map<string, number>();
      orderRows?.forEach((row) => orderMap.set(row.path, row.sort_index));

      const temp: MenuFile[] = [];
      for (const it of items) {
        const path = `${prefix}${it.name}`;
        let url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        if (!url.includes('/object/public/')) {
          const { data: signed } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, 60 * 60);
          if (signed?.signedUrl) url = signed.signedUrl;
        }
        temp.push({ name: it.name, url, path });
      }

      temp.sort((a, b) => {
        const ai = orderMap.get(a.path);
        const bi = orderMap.get(b.path);
        if (ai == null && bi == null) return a.name.localeCompare(b.name);
        if (ai == null) return 1;
        if (bi == null) return -1;
        return ai - bi;
      });

      setFiles(temp);
    } catch (error: any) {
      console.error('Error loading data:', error);
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!restaurantId) return;

    Alert.alert('Upload File', 'Choose file type', [
      {
        text: 'Image',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Please allow access to your photo library');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.8,
            });

            if (!result.canceled) {
              setUploading(true);
              const imageAsset = result.assets[0];
              await uploadFile(imageAsset.uri, imageAsset.fileName || 'image.jpg', imageAsset.type || 'image/jpeg');
            }
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to pick image');
          }
        },
      },
      {
        text: 'PDF',
        onPress: async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: 'application/pdf',
              copyToCacheDirectory: true,
            });

            if (!result.canceled) {
              setUploading(true);
              const file = result.assets[0];
              await uploadFile(file.uri, file.name, file.mimeType || 'application/pdf');
            }
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to pick PDF');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadFile = async (uri: string, filename: string, mimeType: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const path = `${restaurantId}/${filename}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, {
          upsert: true,
          contentType: mimeType,
        });

      if (error) throw error;

      Alert.alert('Success', 'File uploaded successfully');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (name: string) => {
    Alert.alert('Delete File', 'Are you sure you want to delete this file?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.storage
              .from(BUCKET)
              .remove([`${restaurantId}/${name}`]);

            if (error) throw error;

            Alert.alert('Success', 'File deleted successfully');
            await loadData();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete file');
          }
        },
      },
    ]);
  };

  const saveOrder = async () => {
    if (!restaurantId) return;

    setSavingOrder(true);
    try {
      const rows = files.map((f, i) => ({
        restaurant_id: restaurantId,
        bucket: BUCKET,
        path: f.path,
        sort_index: i,
      }));

      const { error } = await supabase
        .from('media_order')
        .upsert(rows, { onConflict: 'restaurant_id,bucket,path' });

      if (error) throw error;

      setDirty(false);
      Alert.alert('Success', 'Order saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save order');
    } finally {
      setSavingOrder(false);
    }
  };

  const saveWrittenMenu = async () => {
    if (!restaurantId) return;

    setSavingWritten(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ lunch_menu_text: writtenMenu })
        .eq('id', restaurantId);

      if (error) throw error;

      Alert.alert('Success', 'Lunch menu saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save menu');
    } finally {
      setSavingWritten(false);
    }
  };

  const moveFile = (fromIndex: number, toIndex: number) => {
    const arr = [...files];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    setFiles(arr);
    setDirty(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#171717" />
        <Text style={styles.loadingText}>Loading...</Text>
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
        <Text style={styles.headerTitle}>Lunch Special</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Upload Section */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.uploadButton, uploading && styles.buttonDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.buttonText}>Uploading...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Upload File</Text>
                </>
              )}
            </TouchableOpacity>

            {dirty && (
              <TouchableOpacity
                style={[styles.saveOrderButton, savingOrder && styles.buttonDisabled]}
                onPress={saveOrder}
                disabled={savingOrder}
              >
                {savingOrder ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.buttonText}>Saving...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Save Order</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Files Grid */}
          {files.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No lunch menu files found.</Text>
            </View>
          ) : (
            <View style={styles.filesGrid}>
              {files.map((file, index) => (
                <View key={file.path} style={styles.fileCard}>
                  <View style={styles.fileHeader}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <TouchableOpacity onPress={() => handleDelete(file.name)}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.filePreview}
                    onPress={() => {
                      if (isImageFile(file.name)) {
                        setPreviewImage({ url: file.url, name: file.name });
                      } else {
                        // For PDFs, you could use a WebView or linking
                        Alert.alert('PDF', 'PDF viewing in app coming soon');
                      }
                    }}
                  >
                    {isImageFile(file.name) ? (
                      <Image
                        source={{ uri: file.url }}
                        style={styles.fileImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.pdfPlaceholder}>
                        <Ionicons name="document-text-outline" size={40} color="#6B7280" />
                        <Text style={styles.pdfText}>PDF</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.fileActions}>
                    <TouchableOpacity
                      style={styles.moveButton}
                      onPress={() => index > 0 && moveFile(index, index - 1)}
                      disabled={index === 0}
                    >
                      <Ionicons
                        name="arrow-up"
                        size={18}
                        color={index === 0 ? '#D1D5DB' : '#374151'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.moveButton}
                      onPress={() => index < files.length - 1 && moveFile(index, index + 1)}
                      disabled={index === files.length - 1}
                    >
                      <Ionicons
                        name="arrow-down"
                        size={18}
                        color={index === files.length - 1 ? '#D1D5DB' : '#374151'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Written Menu Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Written Lunch Menu</Text>
            <TextInput
              style={styles.textArea}
              value={writtenMenu}
              onChangeText={setWrittenMenu}
              placeholder="Write out lunch menu offerings, combos, and prices here..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.saveMenuButton, savingWritten && styles.buttonDisabled]}
              onPress={saveWrittenMenu}
              disabled={savingWritten}
            >
              {savingWritten ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.buttonText}>Saving...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Save Lunch Menu</Text>
                </>
              )}
            </TouchableOpacity>

            {writtenMenu && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Preview:</Text>
                <View style={styles.previewBox}>
                  <Text style={styles.previewText}>{writtenMenu || 'Nothing saved.'}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        visible={!!previewImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {previewImage?.name}
              </Text>
              <TouchableOpacity onPress={() => setPreviewImage(null)}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {previewImage && (
              <Image
                source={{ uri: previewImage.url }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171717',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  saveOrderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  filesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  fileCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  fileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#171717',
    marginRight: 8,
  },
  filePreview: {
    height: 120,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fileImage: {
    width: '100%',
    height: '100%',
  },
  pdfPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  fileActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  moveButton: {
    padding: 6,
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
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#171717',
    minHeight: 150,
    marginBottom: 12,
  },
  saveMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171717',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  previewContainer: {
    marginTop: 16,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  previewBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  previewText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 12,
  },
  modalImage: {
    flex: 1,
    width: '100%',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default LunchSpecialScreen;