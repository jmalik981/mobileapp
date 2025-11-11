# ThatHappyHour Mobile App

A React Native app for discovering happy hour deals and restaurant promotions, with separate interfaces for food lovers and restaurant owners.

## Features

### For Food Lovers
- Browse happy hour deals and promotions
- Find nearby restaurants with location-based search
- Follow favorite restaurants for updates
- Save favorite deals and restaurants
- QR code scanning for quick access

### For Restaurant Owners
- Complete restaurant onboarding process
- Manage restaurant profile and images
- Create and manage happy hour deals
- Upload menus and promotional content
- Track promotion performance
- Manage restaurant posts and announcements

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- For iOS: Xcode and CocoaPods
- For Android: Android Studio and SDK

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd mobileapp
   npm install
   ```

2. **Environment Configuration:**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables in `.env.local`:
   - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `GOOGLE_MAPS_API_KEY`: Google Maps API key with Maps SDK enabled

3. **Database Setup:**
   - Set up a Supabase project
   - Run the database migrations (SQL files should be in `/supabase` folder)
   - Configure authentication settings in Supabase dashboard

### Development

```bash
# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

### Building for Production

#### iOS
```bash
# Generate iOS project
npx expo prebuild --platform ios

# Build for iOS
npx expo build:ios
```

#### Android
```bash
# Generate Android project
npx expo prebuild --platform android

# Build for Android
npx expo build:android
```

## Project Structure

```
src/
├── components/
│   └── onboarding/          # Restaurant onboarding components
├── lib/
│   └── supabase.ts         # Supabase client configuration
└── screens/
    ├── LoginScreen.tsx     # Authentication
    ├── OnboardingScreen.tsx # User onboarding
    ├── RestaurantOnboardingScreen.tsx # Restaurant setup
    ├── HomeScreen.tsx      # Main feed for food lovers
    ├── RestaurantDashboardScreen.tsx # Restaurant owner dashboard
    └── ...                 # Other screens
```

## Authentication & User Roles

The app supports two user types:
- **Food Lovers** (`user` role): Browse and discover deals
- **Restaurant Owners** (`vendor` role): Manage restaurant and promotions

Authentication flow:
1. User registers/logs in
2. App determines user role from profile
3. Routes to appropriate onboarding/dashboard

## Key Technologies

- **React Native** with Expo
- **Supabase** for backend/database
- **React Navigation** for routing
- **React Native Paper** for UI components
- **React Native Maps** for location features
- **Expo Camera** for QR scanning
- **TypeScript** for type safety

## Configuration Files

- `app.config.ts`: Expo configuration with environment variables
- `package.json`: Dependencies and scripts
- `tsconfig.json`: TypeScript configuration
- `android/app/build.gradle`: Android build configuration

## Troubleshooting

### Common Issues

1. **Environment variables not loading:**
   - Ensure `.env.local` exists and has correct format
   - Restart development server after changes

2. **iOS build issues:**
   - Run `cd ios && pod install` if CocoaPods issues
   - Clean build folder in Xcode

3. **Android build issues:**
   - Clean project: `cd android && ./gradlew clean`
   - Check Android SDK path in Android Studio

4. **Supabase connection issues:**
   - Verify URL and keys in `.env.local`
   - Check Supabase project status
   - Ensure RLS policies are configured correctly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here]
