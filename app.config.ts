import dotenv from 'dotenv';
import type { ExpoConfig } from '@expo/config-types';

// Explicitly load .env.local so GOOGLE_MAPS_API_KEY is available during build
dotenv.config({ path: '.env.local' });

const config: ExpoConfig = {
  name: 'ThatHappyHour',
  slug: 'ThatHappyHour',
  version: '1.0.0',
  scheme: 'thathappyhour',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: false,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.thathappyhour.app',
    buildNumber: '1',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'This app uses location to find nearby restaurants and happy hour deals.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'This app uses location to find nearby restaurants and happy hour deals.',
      NSCameraUsageDescription: 'This app uses the camera to scan QR codes and take photos for restaurant profiles.',
      NSPhotoLibraryUsageDescription: 'This app accesses your photo library to upload images for restaurant profiles and menus.',
      NSMicrophoneUsageDescription: 'This app may use the microphone for video recording features.',
    },
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    package: 'com.thathappyhour.app',
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default config;
