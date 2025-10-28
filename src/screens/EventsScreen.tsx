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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';

interface Event {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  sport_category: string | null;
  tags: string[] | null;
  start_at: string;
  end_at: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

const EventsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    sport_category: '',
    tags: '',
    start_at: new Date(),
    end_at: new Date(),
    image_url: '',
  });

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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
        Alert.alert('Error', 'Restaurant not found');
        navigation.goBack();
        return;
      }

      setRestaurantId(restaurant.id);

      const { data: eventsData } = await supabase
        .from('restaurant_events')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('start_at', { ascending: false });

      setEvents(eventsData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: any): Promise<string> => {
    if (!restaurantId) throw new Error('Restaurant ID is required');

    try {
      const fileExt = file.uri.split('.').pop();
      const fileName = `${restaurantId}/events/event-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const response = await fetch(file.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(fileName, blob, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('restaurant-images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading event image:', error);
      throw error;
    }
  };

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photo library');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadingImage(true);
        const imageAsset = result.assets[0];
        const url = await handleUpload(imageAsset);
        setForm({ ...form, image_url: url });
        setUploadingImage(false);
        Alert.alert('Success', 'Image uploaded successfully');
      }
    } catch (error: any) {
      setUploadingImage(false);
      Alert.alert('Error', error.message || 'Failed to upload image');
    }
  };

  const handleSave = async () => {
    if (!restaurantId || !form.title.trim() || !form.start_at) {
      Alert.alert('Validation Error', 'Please fill in title and start date/time');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        restaurant_id: restaurantId,
        title: form.title,
        description: form.description || null,
        sport_category: form.sport_category || null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        start_at: form.start_at.toISOString(),
        end_at: form.end_at ? form.end_at.toISOString() : null,
        image_url: form.image_url || null,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('restaurant_events')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setEvents([data, ...events]);
      setForm({
        title: '',
        description: '',
        sport_category: '',
        tags: '',
        start_at: new Date(),
        end_at: new Date(),
        image_url: '',
      });

      Alert.alert('Success', 'Event created successfully');
    } catch (error: any) {
      console.error('Error saving event:', error);
      Alert.alert('Error', error.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(eventId);
            try {
              const { error } = await supabase
                .from('restaurant_events')
                .delete()
                .eq('id', eventId);

              if (error) throw error;

              setEvents(events.filter(ev => ev.id !== eventId));
              Alert.alert('Success', 'Event deleted successfully');
            } catch (error: any) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', error.message || 'Failed to delete event');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#171717" />
        <Text style={styles.loadingText}>Loading events...</Text>
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
        <Text style={styles.headerTitle}>Events</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Create Event Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create Event</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(value) => setForm({ ...form, title: value })}
                placeholder="Event title"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.sport_category}
                  onValueChange={(value) => setForm({ ...form, sport_category: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Select category" value="" />
                  <Picker.Item label="Cricket" value="cricket" />
                  <Picker.Item label="Football" value="football" />
                  <Picker.Item label="Basketball" value="basketball" />
                  <Picker.Item label="Soccer" value="soccer" />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(value) => setForm({ ...form, description: value })}
                placeholder="Event description..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tags (comma separated)</Text>
              <TextInput
                style={styles.input}
                value={form.tags}
                onChangeText={(value) => setForm({ ...form, tags: value })}
                placeholder="e.g. india vs pakistan, watch party"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Starts At *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                <Text style={styles.dateButtonText}>
                  {formatDateTime(form.start_at.toISOString())}
                </Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={form.start_at}
                  mode="datetime"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowStartPicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setForm({ ...form, start_at: selectedDate });
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ends At (optional)</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                <Text style={styles.dateButtonText}>
                  {formatDateTime(form.end_at.toISOString())}
                </Text>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={form.end_at}
                  mode="datetime"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowEndPicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setForm({ ...form, end_at: selectedDate });
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Event Flyer (image)</Text>
              {form.image_url ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: form.image_url }}
                    style={styles.imagePreview}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={pickImage}
                    disabled={uploadingImage}
                  >
                    <Text style={styles.changeImageButtonText}>Change Image</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadButton, uploadingImage && styles.uploadButtonDisabled]}
                  onPress={pickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.uploadButtonText}>Uploading...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.uploadButtonText}>Upload Image</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving || !form.title.trim()}
            >
              {saving ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Saving...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Event</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Events List Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Events ({events.length})</Text>

            {events.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No events yet</Text>
              </View>
            ) : (
              <View style={styles.eventsContainer}>
                {events.map((event) => (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={styles.eventContent}>
                      <View style={styles.eventInfo}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventDate}>
                          {formatDateTime(event.start_at)}
                        </Text>
                        {event.description && (
                          <Text style={styles.eventDescription} numberOfLines={2}>
                            {event.description}
                          </Text>
                        )}
                        {event.tags && event.tags.length > 0 && (
                          <View style={styles.tagsContainer}>
                            {event.tags.map((tag, index) => (
                              <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                      {event.sport_category && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{event.sport_category}</Text>
                        </View>
                      )}
                    </View>

                    {event.image_url && (
                      <Image
                        source={{ uri: event.image_url }}
                        style={styles.eventImage}
                        resizeMode="cover"
                      />
                    )}

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(event.id)}
                      disabled={deleting === event.id}
                    >
                      {deleting === event.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>
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
    marginBottom: 16,
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
    minHeight: 100,
    paddingTop: 10,
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 50,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B7280',
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
  imagePreviewContainer: {
    gap: 12,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  changeImageButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  changeImageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171717',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  eventsContainer: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    position: 'relative',
  },
  eventContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  eventDescription: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    color: '#4338CA',
    fontWeight: '500',
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  eventImage: {
    width: '100%',
    height: 160,
    borderRadius: 6,
    marginTop: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default EventsScreen;