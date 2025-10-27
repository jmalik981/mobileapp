import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../lib/supabase';

interface MenuFile {
  name: string;
  url: string;
  path: string;
  size?: number;
}

interface HappyHourDeal {
  id?: string;
  restaurant_id?: string;
  title: string;
  description: string;
  price: string;
  days_of_week: string[];
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at?: string;
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

const HappyHourScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'deals' | 'menu'>('deals');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  
  const [files, setFiles] = useState<MenuFile[]>([]);
  const [deals, setDeals] = useState<HappyHourDeal[]>([]);
  
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<HappyHourDeal | null>(null);
  const [dealForm, setDealForm] = useState<HappyHourDeal>({
    title: '',
    description: '',
    price: '',
    days_of_week: [],
    start_time: '16:00',
    end_time: '19:00',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const BUCKET = 'happy-hour-menus';

  useEffect(() => {
    loadData();
  }, []);

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
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!restaurant) {
        Alert.alert('Error', 'Restaurant not found. Complete setup first.');
        navigation.goBack();
        return;
      }

      setRestaurantId(restaurant.id);

      // Load menu files
      const prefix = `${restaurant.id}/`;
      const { data: listed } = await supabase.storage
        .from(BUCKET)
        .list(prefix, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (listed && listed.length > 0) {
        const filePromises = listed.map(async (file) => {
          const { data: url } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(`${prefix}${file.name}`);
          return {
            name: file.name,
            url: url.publicUrl,
            path: `${prefix}${file.name}`,
            size: file.metadata?.size,
          };
        });
        const resolvedFiles = await Promise.all(filePromises);
        setFiles(resolvedFiles);
      }

      // Load happy hour deals
      const { data: happyHourDeals } = await supabase
        .from('happy_hour_deals')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (happyHourDeals) {
        setDeals(happyHourDeals);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!restaurantId) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setUploading(true);
      const file = result.assets[0];
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurantId}/${Date.now()}.${fileExt}`;

      const response = await fetch(file.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, blob, {
          contentType: file.mimeType || 'application/pdf',
        });

      if (uploadError) throw uploadError;

      const { data: url } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

      setFiles([
        ...files,
        {
          name: fileName.split('/').pop() || '',
          url: url.publicUrl,
          path: fileName,
          size: file.size,
        },
      ]);

      Alert.alert('Success', 'Menu PDF uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!restaurantId) return;

    Alert.alert('Delete File', 'Are you sure you want to delete this file?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const path = `${restaurantId}/${fileName}`;
            const { error } = await supabase.storage.from(BUCKET).remove([path]);

            if (error) throw error;

            setFiles(files.filter((f) => f.name !== fileName));
            Alert.alert('Success', 'File deleted successfully');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete file');
          }
        },
      },
    ]);
  };

  const openDealModal = (deal?: HappyHourDeal) => {
    if (deal) {
      setEditingDeal(deal);
      setDealForm(deal);
    } else {
      setEditingDeal(null);
      setDealForm({
        title: '',
        description: '',
        price: '',
        days_of_week: [],
        start_time: '16:00',
        end_time: '19:00',
        is_active: true,
      });
    }
    setShowDealModal(true);
  };

  const closeDealModal = () => {
    setShowDealModal(false);
    setEditingDeal(null);
  };

  const handleDayToggle = (day: string) => {
    setDealForm((prev) => {
      const newDays = prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day];
      return { ...prev, days_of_week: newDays };
    });
  };

  const handleSaveDeal = async () => {
    if (!restaurantId) return;

    if (!dealForm.title.trim()) {
      Alert.alert('Validation Error', 'Title is required');
      return;
    }

    if (!dealForm.description.trim()) {
      Alert.alert('Validation Error', 'Description is required');
      return;
    }

    if (!dealForm.price.trim()) {
      Alert.alert('Validation Error', 'Price is required');
      return;
    }

    if (dealForm.days_of_week.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one day');
      return;
    }

    try {
      setSaving(true);

      if (editingDeal?.id) {
        // Update existing deal
        const { error } = await supabase
          .from('happy_hour_deals')
          .update({
            title: dealForm.title,
            description: dealForm.description,
            price: parseFloat(dealForm.price),
            days_of_week: dealForm.days_of_week,
            start_time: dealForm.start_time,
            end_time: dealForm.end_time,
            is_active: dealForm.is_active,
          })
          .eq('id', editingDeal.id);

        if (error) throw error;
      } else {
        // Create new deal
        const { error } = await supabase.from('happy_hour_deals').insert({
          restaurant_id: restaurantId,
          title: dealForm.title,
          description: dealForm.description,
          price: parseFloat(dealForm.price),
          days_of_week: dealForm.days_of_week,
          start_time: dealForm.start_time,
          end_time: dealForm.end_time,
          is_active: dealForm.is_active,
        });

        if (error) throw error;
      }

      Alert.alert('Success', 'Happy hour deal saved successfully');
      closeDealModal();
      loadData(); // Reload deals
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error.message || 'Failed to save deal');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    Alert.alert(
      'Delete Deal',
      'Are you sure you want to delete this happy hour deal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('happy_hour_deals')
                .delete()
                .eq('id', dealId);

              if (error) throw error;

              setDeals(deals.filter((deal) => deal.id !== dealId));
              Alert.alert('Success', 'Deal deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete deal');
            }
          },
        },
      ]
    );
  };

  const formatDays = (days: string[]) => {
    if (days.length === 7) return 'Every day';

    const dayMap: Record<string, string> = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
    };

    return days.map((day) => dayMap[day] || day).join(', ');
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
        <Text style={styles.headerTitle}>Happy Hour</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'deals' && styles.tabActive]}
          onPress={() => setActiveTab('deals')}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color={activeTab === 'deals' ? '#171717' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'deals' && styles.tabTextActive]}>
            Happy Hour Deals
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'menu' && styles.tabActive]}
          onPress={() => setActiveTab('menu')}
        >
          <Ionicons
            name="document-text-outline"
            size={18}
            color={activeTab === 'menu' ? '#171717' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'menu' && styles.tabTextActive]}>
            Menu PDF
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Deals Tab */}
          {activeTab === 'deals' && (
            <>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => openDealModal()}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add Happy Hour Deal</Text>
              </TouchableOpacity>

              <View style={styles.dealsContainer}>
                {deals.length > 0 ? (
                  deals.map((deal) => (
                    <View key={deal.id} style={styles.dealCard}>
                      <View style={styles.dealContent}>
                        <View style={styles.dealInfo}>
                          <Text style={styles.dealTitle}>{deal.title}</Text>
                          <Text style={styles.dealDescription}>{deal.description}</Text>

                          <View style={styles.dealMeta}>
                            <View style={styles.dealTimeRow}>
                              <Ionicons name="time-outline" size={16} color="#6B7280" />
                              <Text style={styles.dealMetaText}>
                                {formatTime(deal.start_time)} - {formatTime(deal.end_time)}
                              </Text>
                            </View>
                            <Text style={styles.dealMetaText}>{formatDays(deal.days_of_week)}</Text>
                            <Text style={styles.dealPrice}>
                              ${parseFloat(deal.price).toFixed(2)}
                            </Text>
                          </View>

                          {!deal.is_active && (
                            <View style={styles.inactiveBadge}>
                              <Text style={styles.inactiveBadgeText}>Inactive</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.dealActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => openDealModal(deal)}
                          >
                            <Ionicons name="pencil-outline" size={20} color="#171717" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => deal.id && handleDeleteDeal(deal.id)}
                          >
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No happy hour deals added yet.</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Menu Tab */}
          {activeTab === 'menu' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Happy Hour Menu PDF</Text>

              <TouchableOpacity
                style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={handleFileUpload}
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
                    <Text style={styles.uploadButtonText}>Upload Menu PDF</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.filesContainer}>
                {files.map((file) => (
                  <View key={file.name} style={styles.fileCard}>
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      {file.size && (
                        <Text style={styles.fileSize}>
                          ({Math.round(file.size / 1024)} KB)
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteFile(file.name)}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>

      {/* Deal Form Modal */}
      <Modal
        visible={showDealModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeDealModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDeal ? 'Edit Happy Hour Deal' : 'Add New Happy Hour Deal'}
              </Text>
              <TouchableOpacity onPress={closeDealModal}>
                <Ionicons name="close" size={24} color="#171717" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={dealForm.title}
                  onChangeText={(value) => setDealForm({ ...dealForm, title: value })}
                  placeholder="e.g., Half-Price Appetizers"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={dealForm.description}
                  onChangeText={(value) => setDealForm({ ...dealForm, description: value })}
                  placeholder="Describe your happy hour deal..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price ($) *</Text>
                <TextInput
                  style={styles.input}
                  value={dealForm.price}
                  onChangeText={(value) => setDealForm({ ...dealForm, price: value })}
                  placeholder="e.g., 5.99"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Days Available *</Text>
                <View style={styles.daysGrid}>
                  {daysOfWeek.map((day) => (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.dayButton,
                        dealForm.days_of_week.includes(day.value) && styles.dayButtonActive,
                      ]}
                      onPress={() => handleDayToggle(day.value)}
                    >
                      <Text
                        style={[
                          styles.dayButtonText,
                          dealForm.days_of_week.includes(day.value) && styles.dayButtonTextActive,
                        ]}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Start Time</Text>
                  <TextInput
                    style={styles.input}
                    value={dealForm.start_time}
                    onChangeText={(value) => setDealForm({ ...dealForm, start_time: value })}
                    placeholder="16:00"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>End Time</Text>
                  <TextInput
                    style={styles.input}
                    value={dealForm.end_time}
                    onChangeText={(value) => setDealForm({ ...dealForm, end_time: value })}
                    placeholder="19:00"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setDealForm({ ...dealForm, is_active: !dealForm.is_active })}
              >
                <View
                  style={[styles.checkbox, dealForm.is_active && styles.checkboxChecked]}
                >
                  {dealForm.is_active && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Active</Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={closeDealModal}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
                  onPress={handleSaveDeal}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.modalSaveButtonText}>Saving...</Text>
                    </>
                  ) : (
                    <Text style={styles.modalSaveButtonText}>
                      {editingDeal ? 'Update Deal' : 'Add Deal'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171717',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dealsContainer: {
    gap: 12,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dealContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dealInfo: {
    flex: 1,
    marginRight: 12,
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 4,
  },
  dealDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  dealMeta: {
    gap: 4,
  },
  dealTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dealMetaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  dealPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#171717',
    marginTop: 4,
  },
  inactiveBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  inactiveBadgeText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
  },
  dealActions: {
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
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
    marginBottom: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171717',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filesContainer: {
    gap: 12,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fileInfo: {
    flex: 1,
    marginRight: 12,
  },
  fileName: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
    maxHeight: '90%',
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
    paddingBottom: 40,
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
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  dayButtonActive: {
    backgroundColor: '#171717',
    borderColor: '#171717',
  },
  dayButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#171717',
    borderColor: '#171717',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  modalSaveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#171717',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default HappyHourScreen;