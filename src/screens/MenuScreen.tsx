import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');

interface MenuFile {
  name: string;
  url: string;
  isImage: boolean;
  size?: number;
  path: string;
}

export default function MenuScreen() {
  const [files, setFiles] = useState<MenuFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const BUCKET = 'menus';

  useEffect(() => {
    loadMenuFiles();
  }, []);

  const loadMenuFiles = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to continue');
        setLoading(false);
        return;
      }

      // Find the restaurant by owner_id
      const { data: restaurant, error: rErr } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (rErr || !restaurant) {
        setError('Restaurant not found. Complete setup first.');
        setLoading(false);
        return;
      }

      setRestaurantId(restaurant.id);
      const prefix = `${restaurant.id}/`;
      
      const { data: listed, error: lErr } = await supabase.storage
        .from(BUCKET)
        .list(prefix, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (lErr) {
        setError('Unable to load menu files. Ensure a public "menus" storage bucket exists.');
        setLoading(false);
        return;
      }

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
      for (const item of items) {
        const ext = item.name.toLowerCase();
        const isImage = ext.endsWith('.png') || ext.endsWith('.jpg') || 
                       ext.endsWith('.jpeg') || ext.endsWith('.webp');
        const path = `${prefix}${item.name}`;
        
        let url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        
        // If the SDK returned an authenticated URL, fall back to a signed URL
        if (!url.includes('/object/public/')) {
          const { data: signed } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, 60 * 60);
          if (signed?.signedUrl) url = signed.signedUrl;
        }
        
        temp.push({
          name: item.name,
          url,
          isImage,
          size: (item as any).metadata?.size,
          path,
        });
      }

      // Sort by saved order first, then fallback to name
      temp.sort((a, b) => {
        const ai = orderMap.get(a.path);
        const bi = orderMap.get(b.path);
        if (ai == null && bi == null) return a.name.localeCompare(b.name);
        if (ai == null) return 1;
        if (bi == null) return -1;
        return ai - bi;
      });

      setFiles(temp);
    } catch (err: any) {
      setError(err.message || 'Failed to load menu files');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMenuFiles();
  };

  const pickFile = async () => {
    try {
      Alert.alert(
        'Select File Type',
        'Choose how you want to add your menu',
        [
          {
            text: 'Camera',
            onPress: () => pickFromCamera(),
          },
          {
            text: 'Photo Library',
            onPress: () => pickFromLibrary(),
          },
          {
            text: 'Document',
            onPress: () => pickDocument(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadFile(result.assets[0].uri, result.assets[0].fileName || 'camera-image.jpg');
    }
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library permissions.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadFile(result.assets[0].uri, result.assets[0].fileName || 'library-image.jpg');
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadFile(result.assets[0].uri, result.assets[0].name);
    }
  };

  const uploadFile = async (uri: string, fileName: string) => {
    if (!restaurantId) return;
    
    setUploading(true);
    setError(null);

    try {
      const path = `${restaurantId}/${fileName}`;
      
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Convert base64 to blob
      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, arrayBuffer, {
          contentType: fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      await loadMenuFiles();
      Alert.alert('Success', 'File uploaded successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      Alert.alert('Upload Error', err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileName: string) => {
    if (!restaurantId) return;

    Alert.alert(
      'Delete File',
      `Are you sure you want to delete ${fileName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.storage
                .from(BUCKET)
                .remove([`${restaurantId}/${fileName}`]);

              if (error) throw error;

              await loadMenuFiles();
              Alert.alert('Success', 'File deleted successfully');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete file');
            }
          },
        },
      ]
    );
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
    } catch (err: any) {
      setError(err.message || 'Failed to save order');
      Alert.alert('Error', err.message || 'Failed to save order');
    } finally {
      setSavingOrder(false);
    }
  };

  const moveFile = (fromIndex: number, toIndex: number) => {
    const newFiles = [...files];
    const [movedFile] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, movedFile);
    setFiles(newFiles);
    setDirty(true);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#171717" />
        <Text style={styles.loadingText}>Loading menu files...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Menu</Text>
          <Text style={styles.subtitle}>Manage your menu files stored in the menus bucket.</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={pickFile}
              disabled={uploading || !restaurantId}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>
                {uploading ? 'Uploading...' : 'Upload File'}
              </Text>
            </TouchableOpacity>
            
            {dirty && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={saveOrder}
                disabled={savingOrder}
              >
                <Ionicons name="save-outline" size={20} color="#171717" />
                <Text style={[styles.buttonText, { color: '#171717' }]}>
                  {savingOrder ? 'Saving...' : 'Save Order'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Files Grid */}
        {files.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No menu files found</Text>
            <Text style={styles.emptySubtitle}>
              Upload menus in onboarding or contact support to enable uploads here.
            </Text>
          </View>
        ) : (
          <View style={styles.filesGrid}>
            {files.map((file, index) => (
              <View key={file.path} style={styles.fileCard}>
                <View style={styles.fileHeader}>
                  <Text style={styles.fileName} numberOfLines={2}>
                    {file.name}
                  </Text>
                </View>
                
                <View style={styles.fileContent}>
                  {file.isImage ? (
                    <TouchableOpacity
                      style={styles.imageContainer}
                      onPress={() => {
                        setPreviewSrc(file.url);
                        setPreviewTitle(file.name);
                        setPreviewOpen(true);
                      }}
                    >
                      <Image source={{ uri: file.url }} style={styles.menuImage} />
                      <View style={styles.imageOverlay}>
                        <Text style={styles.imageOverlayText}>Tap to preview</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.pdfContainer}>
                      <Ionicons name="document-text" size={32} color="#6B7280" />
                      <Text style={styles.pdfLabel}>PDF</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.fileActions}>
                  {!file.isImage && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.viewButton]}
                      onPress={() => {
                        // Open PDF in browser
                        if (file.url) {
                          // You might want to use Linking.openURL(file.url) here
                          Alert.alert('PDF', 'PDF viewing functionality can be implemented');
                        }
                      }}
                    >
                      <Text style={styles.actionButtonText}>View</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteFile(file.name)}
                  >
                    <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        visible={previewOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {previewTitle}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setPreviewOpen(false)}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              {previewSrc && (
                <Image
                  source={{ uri: previewSrc }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#171717',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  filesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  fileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: (width - 48) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fileHeader: {
    marginBottom: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 18,
  },
  fileContent: {
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  menuImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  pdfContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pdfLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  fileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: width * 0.9,
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  previewImage: {
    width: '100%',
    height: height * 0.6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
});