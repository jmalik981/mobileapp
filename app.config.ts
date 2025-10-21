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
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    package: 'com.anonymous.ThatHappyHour',
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
  },
};

export default config;
