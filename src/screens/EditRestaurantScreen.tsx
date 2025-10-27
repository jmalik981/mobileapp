import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';

interface FormData {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  cuisine_type_id: string;
  food_style_id: string;
  dietary_restriction_id: string;
  price_range: string;
  website: string;
  instagram_handle: string;
  tiktok_handle: string;
  facebook_page_url: string;
  hours_monday: string;
  hours_tuesday: string;
  hours_wednesday: string;
  hours_thursday: string;
  hours_friday: string;
  hours_saturday: string;
  hours_sunday: string;
}

const EditRestaurantScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as any;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [cuisineTypes, setCuisineTypes] = useState<any[]>([]);
  const [foodStyles, setFoodStyles] = useState<any[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<any[]>([]);

  const [form, setForm] = useState<FormData>({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    cuisine_type_id: '',
    food_style_id: '',
    dietary_restriction_id: '',
    price_range: '',
    website: '',
    instagram_handle: '',
    tiktok_handle: '',
    facebook_page_url: '',
    hours_monday: '',
    hours_tuesday: '',
    hours_wednesday: '',
    hours_thursday: '',
    hours_friday: '',
    hours_saturday: '',
    hours_sunday: '',
  });

  useEffect(() => {
    loadRestaurantData();
  }, []);

  const loadRestaurantData = async () => {
    try {
      setLoading(true);

      // Use passed data if available
      if (params?.restaurant) {
        setRestaurantId(params.restaurant.id);
        setCuisineTypes(params.cuisineTypes || []);
        setFoodStyles(params.foodStyles || []);
        setDietaryRestrictions(params.dietaryRestrictions || []);
        
        setForm({
          name: params.restaurant.name || '',
          description: params.restaurant.description || '',
          address: params.restaurant.address || '',
          city: params.restaurant.city || '',
          state: params.restaurant.state || '',
          zip_code: params.restaurant.zip_code || '',
          phone: params.restaurant.phone || '',
          cuisine_type_id: params.restaurant.cuisine_type_id?.toString() || '',
          food_style_id: params.restaurant.food_style_id?.toString() || '',
          dietary_restriction_id: params.restaurant.dietary_restriction_id?.toString() || '',
          price_range: params.restaurant.price_range || '',
          website: params.restaurant.website || '',
          instagram_handle: params.restaurant.instagram_handle || '',
          tiktok_handle: params.restaurant.tiktok_handle || '',
          facebook_page_url: params.restaurant.facebook_page_url || '',
          hours_monday: params.restaurant.hours_monday || '',
          hours_tuesday: params.restaurant.hours_tuesday || '',
          hours_wednesday: params.restaurant.hours_wednesday || '',
          hours_thursday: params.restaurant.hours_thursday || '',
          hours_friday: params.restaurant.hours_friday || '',
          hours_saturday: params.restaurant.hours_saturday || '',
          hours_sunday: params.restaurant.hours_sunday || '',
        });
      } else {
        // Fetch fresh data if not passed
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert('Error', 'Please login to continue');
          navigation.goBack();
          return;
        }

        // Load dropdown data
        const [cuisineRes, foodStyleRes, dietaryRes] = await Promise.all([
          supabase.from('cuisine_types').select('*').order('name'),
          supabase.from('food_styles').select('*').order('name'),
          supabase.from('dietary_restrictions').select('*').order('name'),
        ]);

        setCuisineTypes(cuisineRes.data || []);
        setFoodStyles(foodStyleRes.data || []);
        setDietaryRestrictions(dietaryRes.data || []);

        // Load restaurant data
        const { data: restaurant, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('owner_id', user.id)
          .single();

        if (error || !restaurant) {
          Alert.alert('Error', 'Restaurant not found. Complete setup first.');
          navigation.goBack();
          return;
        }

        setRestaurantId(restaurant.id);
        setForm({
          name: restaurant.name || '',
          description: restaurant.description || '',
          address: restaurant.address || '',
          city: restaurant.city || '',
          state: restaurant.state || '',
          zip_code: restaurant.zip_code || '',
          phone: restaurant.phone || '',
          cuisine_type_id: restaurant.cuisine_type_id?.toString() || '',
          food_style_id: restaurant.food_style_id?.toString() || '',
          dietary_restriction_id: restaurant.dietary_restriction_id?.toString() || '',
          price_range: restaurant.price_range || '',
          website: restaurant.website || '',
          instagram_handle: restaurant.instagram_handle || '',
          tiktok_handle: restaurant.tiktok_handle || '',
          facebook_page_url: restaurant.facebook_page_url || '',
          hours_monday: restaurant.hours_monday || '',
          hours_tuesday: restaurant.hours_tuesday || '',
          hours_wednesday: restaurant.hours_wednesday || '',
          hours_thursday: restaurant.hours_thursday || '',
          hours_friday: restaurant.hours_friday || '',
          hours_saturday: restaurant.hours_saturday || '',
          hours_sunday: restaurant.hours_sunday || '',
        });
      }
    } catch (error: any) {
      console.error('Error loading restaurant:', error);
      Alert.alert('Error', error.message || 'Failed to load restaurant data');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!restaurantId) return;

    // Basic validation
    if (!form.name.trim()) {
      Alert.alert('Validation Error', 'Restaurant name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        price_range: form.price_range || null,
        cuisine_type_id: form.cuisine_type_id ? parseInt(form.cuisine_type_id) : null,
        food_style_id: form.food_style_id ? parseInt(form.food_style_id) : null,
        dietary_restriction_id: form.dietary_restriction_id ? parseInt(form.dietary_restriction_id) : null,
      };

      const { error } = await supabase
        .from('restaurants')
        .update(payload)
        .eq('id', restaurantId);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error saving restaurant:', error);
      Alert.alert('Error', error.message || 'Failed to save changes');
    } finally {
      setSaving(false);
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
        <Text style={styles.headerTitle}>Edit Restaurant</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Restaurant Name *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(value) => updateField('name', value)}
                placeholder="Restaurant name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(value) => updateField('description', value)}
                placeholder="Tell customers about your restaurant..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cuisine Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.cuisine_type_id}
                  onValueChange={(value) => updateField('cuisine_type_id', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select cuisine type" value="" />
                  {cuisineTypes.map((cuisine) => (
                    <Picker.Item key={cuisine.id} label={cuisine.name} value={cuisine.id.toString()} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Food Style</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.food_style_id}
                  onValueChange={(value) => updateField('food_style_id', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select food style" value="" />
                  {foodStyles.map((style) => (
                    <Picker.Item key={style.id} label={style.name} value={style.id.toString()} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dietary Restrictions</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.dietary_restriction_id}
                  onValueChange={(value) => updateField('dietary_restriction_id', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select dietary restriction" value="" />
                  {dietaryRestrictions.map((restriction) => (
                    <Picker.Item key={restriction.id} label={restriction.name} value={restriction.id.toString()} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price Range</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.price_range}
                  onValueChange={(value) => updateField('price_range', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select price range" value="" />
                  <Picker.Item label="$ - Budget friendly" value="$" />
                  <Picker.Item label="$ - Moderate" value="$" />
                  <Picker.Item label="$$ - Upscale" value="$$" />
                  <Picker.Item label="$$ - Fine dining" value="$$" />
                </Picker>
              </View>
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={form.address}
                onChangeText={(value) => updateField('address', value)}
                placeholder="Street address"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={form.city}
                  onChangeText={(value) => updateField('city', value)}
                  placeholder="City"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={form.state}
                  onChangeText={(value) => updateField('state', value)}
                  placeholder="State"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ZIP Code</Text>
              <TextInput
                style={styles.input}
                value={form.zip_code}
                onChangeText={(value) => updateField('zip_code', value)}
                placeholder="ZIP Code"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Contact Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={(value) => updateField('phone', value)}
                placeholder="+1 (555) 123-4567"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                value={form.website}
                onChangeText={(value) => updateField('website', value)}
                placeholder="https://example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Social Media Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Media</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Instagram Handle</Text>
              <TextInput
                style={styles.input}
                value={form.instagram_handle}
                onChangeText={(value) => updateField('instagram_handle', value)}
                placeholder="yourhandle"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>TikTok Handle</Text>
              <TextInput
                style={styles.input}
                value={form.tiktok_handle}
                onChangeText={(value) => updateField('tiktok_handle', value)}
                placeholder="yourhandle"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Facebook Page URL</Text>
              <TextInput
                style={styles.input}
                value={form.facebook_page_url}
                onChangeText={(value) => updateField('facebook_page_url', value)}
                placeholder="https://facebook.com/yourpage"
                placeholderTextColor="#9CA3AF"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Hours Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Operating Hours</Text>
            
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
              <View key={day} style={styles.inputGroup}>
                <Text style={styles.label}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
                <TextInput
                  style={styles.input}
                  value={form[`hours_${day}` as keyof FormData]}
                  onChangeText={(value) => updateField(`hours_${day}` as keyof FormData, value)}
                  placeholder="e.g. 11am - 9pm"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            ))}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Saving...</Text>
              </>
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

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
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 50,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171717',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default EditRestaurantScreen;