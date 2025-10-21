import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const extra = (Constants as any)?.expoConfig?.extra || (Constants as any)?.manifest?.extra || {};
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase configuration missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, or add expo.extra.supabaseUrl and expo.extra.supabaseAnonKey in app.json.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database Types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          role: 'user' | 'vendor' | 'admin';
          display_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          preferences: any | null;
          vendor_verified: boolean;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          role?: 'user' | 'vendor' | 'admin';
          display_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          preferences?: any | null;
          vendor_verified?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          role?: 'user' | 'vendor' | 'admin';
          display_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          preferences?: any | null;
          vendor_verified?: boolean;
        };
      };
      restaurants: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          owner_id: string;
          name: string;
          description: string | null;
          email: string;
          phone: string | null;
          address: string;
          latitude: number | null;
          longitude: number | null;
          website: string | null;
          cuisine_types: string[];
          price_range: number | null;
          hours: any | null;
          subscription_status: 'trial' | 'active' | 'cancelled' | 'expired';
          subscription_expires_at: string | null;
          qr_code_url: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          email: string;
          phone?: string | null;
          address: string;
          latitude?: number | null;
          longitude?: number | null;
          website?: string | null;
          cuisine_types?: string[];
          price_range?: number | null;
          hours?: any | null;
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'expired';
          subscription_expires_at?: string | null;
          qr_code_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          owner_id?: string;
          name?: string;
          description?: string | null;
          email?: string;
          phone?: string | null;
          address?: string;
          latitude?: number | null;
          longitude?: number | null;
          website?: string | null;
          cuisine_types?: string[];
          price_range?: number | null;
          hours?: any | null;
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'expired';
          subscription_expires_at?: string | null;
          qr_code_url?: string | null;
        };
      };
      promotions: {
        Row: {
          id: string;
          restaurant_id: string;
          title: string;
          description: string;
          discount_type: 'percentage' | 'fixed_amount' | 'bogo' | 'free_item';
          discount_value: number | null;
          category: 'food' | 'drinks' | 'coffee' | 'bakery' | 'hookah' | 'events';
          subcategory: string | null;
          dietary_options: string[];
          start_time: string;
          end_time: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          title: string;
          description: string;
          discount_type: 'percentage' | 'fixed_amount' | 'bogo' | 'free_item';
          discount_value?: number | null;
          category: 'food' | 'drinks' | 'coffee' | 'bakery' | 'hookah' | 'events';
          subcategory?: string | null;
          dietary_options?: string[];
          start_time: string;
          end_time: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          title?: string;
          description?: string;
          discount_type?: 'percentage' | 'fixed_amount' | 'bogo' | 'free_item';
          discount_value?: number | null;
          category?: 'food' | 'drinks' | 'coffee' | 'bakery' | 'hookah' | 'events';
          subcategory?: string | null;
          dietary_options?: string[];
          start_time?: string;
          end_time?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          restaurant_id: string;
          notification_enabled: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          restaurant_id: string;
          notification_enabled?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          restaurant_id?: string;
          notification_enabled?: boolean;
        };
      };
      feed_events: {
        Row: {
          id: string;
          created_at: string;
          restaurant_id: string | null;
          promotion_id: string | null;
          event_type: 'promotion_created' | 'promotion_updated' | 'promotion_activated' | 'promotion_deactivated' | 'announcement';
          title: string;
          body: string | null;
          image_url: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          restaurant_id?: string | null;
          promotion_id?: string | null;
          event_type: 'promotion_created' | 'promotion_updated' | 'promotion_activated' | 'promotion_deactivated' | 'announcement';
          title: string;
          body?: string | null;
          image_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          restaurant_id?: string | null;
          promotion_id?: string | null;
          event_type?: 'promotion_created' | 'promotion_updated' | 'promotion_activated' | 'promotion_deactivated' | 'announcement';
          title?: string;
          body?: string | null;
          image_url?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          created_at: string;
          restaurant_id: string | null;
          promotion_id: string | null;
          title: string;
          message: string;
          channel: 'push' | 'sms' | 'email';
          status: 'pending' | 'sent' | 'failed';
          sent_count: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          restaurant_id?: string | null;
          promotion_id?: string | null;
          title: string;
          message: string;
          channel: 'push' | 'sms' | 'email';
          status?: 'pending' | 'sent' | 'failed';
          sent_count?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          restaurant_id?: string | null;
          promotion_id?: string | null;
          title?: string;
          message?: string;
          channel?: 'push' | 'sms' | 'email';
          status?: 'pending' | 'sent' | 'failed';
          sent_count?: number;
        };
      };
      images: {
        Row: {
          id: string;
          created_at: string;
          owner_user_id: string | null;
          restaurant_id: string | null;
          promotion_id: string | null;
          kind: 'restaurant_profile' | 'restaurant_banner' | 'menu' | 'promotion';
          bucket: string;
          path: string;
          width: number | null;
          height: number | null;
          alt: string | null;
          sort_order: number | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          owner_user_id?: string | null;
          restaurant_id?: string | null;
          promotion_id?: string | null;
          kind: 'restaurant_profile' | 'restaurant_banner' | 'menu' | 'promotion';
          bucket?: string;
          path: string;
          width?: number | null;
          height?: number | null;
          alt?: string | null;
          sort_order?: number | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          owner_user_id?: string | null;
          restaurant_id?: string | null;
          promotion_id?: string | null;
          kind?: 'restaurant_profile' | 'restaurant_banner' | 'menu' | 'promotion';
          bucket?: string;
          path?: string;
          width?: number | null;
          height?: number | null;
          alt?: string | null;
          sort_order?: number | null;
        };
      };
      promotion_views: {
        Row: {
          id: string;
          created_at: string;
          promotion_id: string;
          user_id: string | null;
          source: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          promotion_id: string;
          user_id?: string | null;
          source?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          promotion_id?: string;
          user_id?: string | null;
          source?: string | null;
        };
      };
      promotion_redemptions: {
        Row: {
          id: string;
          created_at: string;
          promotion_id: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          promotion_id: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          promotion_id?: string;
          user_id?: string | null;
        };
      };
    };
  };
}

