import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Image,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  Portal,
  Modal,
  Checkbox,
  Surface,
  Text,
  IconButton,
  ActivityIndicator,
  Divider,
  Chip,
  HelperText,
} from 'react-native-paper';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');

export interface PromotionDeal {
  id?: string;
  restaurant_id?: string;
  title: string;
  description: string;
  price: string;
  days_of_week: string[];
  start_time: string;
  end_time: string;
  is_active: boolean;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

const DAYS_OF_WEEK = [
  { label: 'Mon', value: 'monday' },
  { label: 'Tue', value: 'tuesday' },
  { label: 'Wed', value: 'wednesday' },
  { label: 'Thu', value: 'thursday' },
  { label: 'Fri', value: 'friday' },
  { label: 'Sat', value: 'saturday' },
  { label: 'Sun', value: 'sunday' },
];

interface PromotionDealFormProps {
  restaurantId: string;
  existingDeal?: PromotionDeal;
  onSave: () => void;
  onCancel: () => void;
}

function PromotionDealForm({
  restaurantId,
  existingDeal,
  onSave,
  onCancel,
}: PromotionDealFormProps) {
  const [deal, setDeal] = useState<PromotionDeal>(
    existingDeal || {
      title: '',
      description: '',
      price: '',
      days_of_week: [],
      start_time: '11:00',
      end_time: '23:00',
      is_active: true,
      image_url: '',
    }
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof PromotionDeal, value: any) => {
    setDeal((prev) => ({ ...prev, [field]: value }));
  };

  const handleDayToggle = (day: string) => {
    setDeal((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day],
    }));
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    setError(null);

    try {
      const fileExt = uri.split('.').pop()?.toLowerCase();
      const fileName = `${restaurantId}/promo-${Date.now()}.${fileExt}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to blob
      const arrayBuffer = Uint8Array.from(atob(base64), (c) =>
        c.charCodeAt(0)
      ).buffer;

      const { error: uploadError } = await supabase.storage
        .from('promotion-menus')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('promotion-menus').getPublicUrl(fileName);

      setDeal((prev) => ({ ...prev, image_url: publicUrl }));
    } catch (err: any) {
      setError('Failed to upload image');
      Alert.alert('Upload Error', err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!deal.title.trim()) {
      Alert.alert('Validation Error', 'Title is required');
      return;
    }
    if (!deal.description.trim()) {
      Alert.alert('Validation Error', 'Description is required');
      return;
    }
    if (deal.days_of_week.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one day');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const payload = {
        ...deal,
        restaurant_id: restaurantId,
        price: deal.price ? parseFloat(deal.price) : 0,
      };

      if (existingDeal?.id) {
        const { error: updateError } = await supabase
          .from('promotion_deals')
          .update(payload)
          .eq('id', existingDeal.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('promotion_deals')
          .insert([payload]);

        if (insertError) throw insertError;
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save promotion');
      Alert.alert('Error', err.message || 'Failed to save promotion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.formContainer}>
      <Card style={styles.formCard}>
        <Card.Title
          title={existingDeal ? 'Edit Promotion' : 'Add Promotion'}
          right={(props) => (
            <IconButton {...props} icon="close" onPress={onCancel} />
          )}
        />
        <Card.Content>
          <TextInput
            label="Title *"
            value={deal.title}
            onChangeText={(text) => handleChange('title', text)}
            style={styles.input}
            mode="outlined"
            placeholder="e.g. 30% off Dinner Combos"
          />

          <TextInput
            label="Description *"
            value={deal.description}
            onChangeText={(text) => handleChange('description', text)}
            style={styles.input}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="Describe the promotion..."
          />

          <TextInput
            label="Price"
            value={deal.price}
            onChangeText={(text) => handleChange('price', text)}
            style={styles.input}
            mode="outlined"
            keyboardType="decimal-pad"
            placeholder="$0.00"
            left={<TextInput.Icon icon="currency-usd" />}
          />

          {/* Days of Week */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>Days Available *</Text>
            <View style={styles.daysContainer}>
              {DAYS_OF_WEEK.map((day) => (
                <Chip
                  key={day.value}
                  selected={deal.days_of_week.includes(day.value)}
                  onPress={() => handleDayToggle(day.value)}
                  style={[
                    styles.dayChip,
                    deal.days_of_week.includes(day.value) &&
                      styles.dayChipSelected,
                  ]}
                  textStyle={styles.dayChipText}
                  mode={
                    deal.days_of_week.includes(day.value)
                      ? 'flat'
                      : 'outlined'
                  }
                >
                  {day.label}
                </Chip>
              ))}
            </View>
          </View>

          {/* Time Range */}
          <View style={styles.timeContainer}>
            <View style={styles.timeInputWrapper}>
              <TextInput
                label="Start Time"
                value={deal.start_time}
                onChangeText={(text) => handleChange('start_time', text)}
                style={styles.timeInput}
                mode="outlined"
                placeholder="11:00"
                left={<TextInput.Icon icon="clock-outline" />}
              />
            </View>
            <View style={styles.timeInputWrapper}>
              <TextInput
                label="End Time"
                value={deal.end_time}
                onChangeText={(text) => handleChange('end_time', text)}
                style={styles.timeInput}
                mode="outlined"
                placeholder="23:00"
                left={<TextInput.Icon icon="clock-outline" />}
              />
            </View>
          </View>

          {/* Image Upload */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>Promotion Image</Text>
            <Button
              mode="outlined"
              onPress={pickImage}
              disabled={uploading}
              icon="upload"
              style={styles.uploadButton}
              loading={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
            </Button>
            {deal.image_url && (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: deal.image_url }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <IconButton
                  icon="close-circle"
                  size={24}
                  onPress={() => handleChange('image_url', '')}
                  style={styles.removeImageButton}
                  iconColor="#F44336"
                />
              </View>
            )}
          </View>

          {/* Active Status */}
          <Checkbox.Item
            label="Active Promotion"
            status={deal.is_active ? 'checked' : 'unchecked'}
            onPress={() => handleChange('is_active', !deal.is_active)}
            style={styles.checkbox}
          />

          {error && (
            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={onCancel}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              disabled={saving || uploading}
              loading={saving}
              style={styles.saveButton}
            >
              {existingDeal ? 'Update' : 'Add'} Promotion
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

export default function PromotionDealsScreen() {
  const [promos, setPromos] = useState<PromotionDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromotionDeal | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'Please log in to continue');
        setLoading(false);
        return;
      }

      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (restaurantError || !restaurant) {
        setError('Restaurant not found. Complete setup first.');
        setLoading(false);
        return;
      }

      setRestaurantId(restaurant.id);

      const { data: promoDeals, error: promosError } = await supabase
        .from('promotion_deals')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (promosError) throw promosError;

      setPromos(promoDeals || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load promotions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const handleDelete = async (promoId: string) => {
    Alert.alert(
      'Delete Promotion',
      'Are you sure you want to delete this promotion?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('promotion_deals')
                .delete()
                .eq('id', promoId);

              if (error) throw error;

              setPromos(promos.filter((p) => p.id !== promoId));
              Alert.alert('Success', 'Promotion deleted successfully');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete promotion');
            }
          },
        },
      ]
    );
  };

  const handleSave = () => {
    setShowAdd(false);
    setEditingPromo(null);
    loadData();
  };

  const handleCancel = () => {
    setShowAdd(false);
    setEditingPromo(null);
  };

  const formatDays = (days: string[]) => {
    const dayMap: Record<string, string> = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
    };
    return days.map((d) => dayMap[d] || d).join(', ');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading promotions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Surface style={styles.header} elevation={2}>
          <Title style={styles.headerTitle}>Promotions</Title>
          <Paragraph style={styles.headerSubtitle}>
            Manage your promotion deals and special offers
          </Paragraph>
          {!showAdd && !editingPromo && (
            <Button
              mode="contained"
              icon="plus"
              onPress={() => setShowAdd(true)}
              style={styles.addButton}
            >
              Add Promotion
            </Button>
          )}
        </Surface>

        {/* Error Message */}
        {error && (
          <Surface style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </Surface>
        )}

        {/* Promotions List */}
        {!showAdd && !editingPromo && (
          <View style={styles.promosList}>
            {promos.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <Text style={styles.emptyText}>
                    No promotions added yet.
                  </Text>
                  <Paragraph style={styles.emptySubtext}>
                    Create your first promotion to attract more customers!
                  </Paragraph>
                </Card.Content>
              </Card>
            ) : (
              promos.map((promo) => (
                <Card key={promo.id} style={styles.promoCard} elevation={2}>
                  <Card.Content>
                    <View style={styles.promoHeader}>
                      <View style={styles.promoTitleContainer}>
                        <Title style={styles.promoTitle}>{promo.title}</Title>
                        {!promo.is_active && (
                          <Chip
                            style={styles.inactiveChip}
                            textStyle={styles.chipText}
                          >
                            Inactive
                          </Chip>
                        )}
                      </View>
                      <View style={styles.promoActions}>
                        <IconButton
                          icon="pencil"
                          size={20}
                          onPress={() => setEditingPromo(promo)}
                        />
                        <IconButton
                          icon="delete"
                          size={20}
                          iconColor="#F44336"
                          onPress={() => handleDelete(promo.id!)}
                        />
                      </View>
                    </View>

                    <Paragraph style={styles.promoDescription}>
                      {promo.description}
                    </Paragraph>

                    {promo.image_url && (
                      <Image
                        source={{ uri: promo.image_url }}
                        style={styles.promoImage}
                        resizeMode="cover"
                      />
                    )}

                    <Divider style={styles.divider} />

                    <View style={styles.promoDetails}>
                      {promo.price && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Price:</Text>
                          <Text style={styles.detailValue}>
                            ${parseFloat(promo.price).toFixed(2)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Days:</Text>
                        <Text style={styles.detailValue}>
                          {formatDays(promo.days_of_week)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time:</Text>
                        <Text style={styles.detailValue}>
                          {promo.start_time} - {promo.end_time}
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Form Modal */}
      <Portal>
        <Modal
          visible={showAdd || !!editingPromo}
          onDismiss={handleCancel}
          contentContainerStyle={styles.modal}
        >
          {restaurantId && (
            <PromotionDealForm
              restaurantId={restaurantId}
              existingDeal={editingPromo || undefined}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    marginTop: 4,
    marginBottom: 16,
    color: '#757575',
  },
  addButton: {
    marginTop: 8,
  },
  errorBox: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  errorText: {
    color: '#C62828',
  },
  promosList: {
    gap: 12,
  },
  emptyCard: {
    marginTop: 24,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#9E9E9E',
  },
  promoCard: {
    marginBottom: 12,
  },
  promoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  promoTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  inactiveChip: {
    backgroundColor: '#9E9E9E',
    height: 24,
  },
  chipText: {
    color: '#fff',
    fontSize: 11,
  },
  promoActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  promoDescription: {
    marginBottom: 12,
    color: '#616161',
  },
  promoImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
  },
  promoDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontWeight: '600',
    color: '#757575',
  },
  detailValue: {
    color: '#212121',
  },
  modal: {
    margin: 16,
    maxHeight: '90%',
  },
  formContainer: {
    maxHeight: '100%',
  },
  formCard: {
    maxHeight: '100%',
  },
  input: {
    marginBottom: 12,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#424242',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  dayChipSelected: {
    backgroundColor: '#6200EE',
  },
  dayChipText: {
    fontSize: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timeInputWrapper: {
    flex: 1,
  },
  timeInput: {
    flex: 1,
  },
  uploadButton: {
    marginBottom: 12,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 8,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  checkbox: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});