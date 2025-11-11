# Deployment Guide for ThatHappyHour

## Pre-deployment Checklist

### 1. Environment Configuration
- [ ] `.env.local` file configured with production values
- [ ] Supabase project set up with production database
- [ ] Google Maps API key configured and billing enabled
- [ ] All API keys are production-ready (not test keys)

### 2. App Configuration
- [ ] App name and bundle identifiers are correct
- [ ] Version numbers updated in `package.json` and `app.config.ts`
- [ ] Icons and splash screens are finalized
- [ ] App permissions are properly configured

### 3. Code Quality
- [ ] All TypeScript errors resolved
- [ ] No console.log statements in production code
- [ ] Error handling implemented for all API calls
- [ ] Loading states implemented for all async operations

## iOS Deployment

### Prerequisites
- Apple Developer Account ($99/year)
- Xcode installed on macOS
- iOS device for testing

### Steps

1. **Generate iOS project:**
   ```bash
   npx expo prebuild --platform ios --clean
   ```

2. **Configure signing in Xcode:**
   - Open `ios/ThatHappyHour.xcworkspace`
   - Select your team in signing settings
   - Ensure bundle identifier matches Apple Developer account

3. **Build and test:**
   ```bash
   # Test on simulator
   npx expo run:ios

   # Build for device testing
   npx expo run:ios --device
   ```

4. **Submit to App Store:**
   ```bash
   # Build for App Store
   npx expo build:ios --type archive

   # Or use EAS Build (recommended)
   npx eas build --platform ios
   ```

5. **Upload to App Store Connect:**
   - Use Xcode Organizer or Application Loader
   - Fill in app metadata and screenshots
   - Submit for review

## Android Deployment

### Prerequisites
- Google Play Developer Account ($25 one-time)
- Android Studio installed
- Android device for testing

### Steps

1. **Generate Android project:**
   ```bash
   npx expo prebuild --platform android --clean
   ```

2. **Generate signing key:**
   ```bash
   cd android/app
   keytool -genkeypair -v -keystore thathappyhour-release-key.keystore -alias thathappyhour -keyalg RSA -keysize 2048 -validity 10000
   ```

3. **Configure signing in `android/gradle.properties`:**
   ```
   THATHAPPYHOUR_UPLOAD_STORE_FILE=thathappyhour-release-key.keystore
   THATHAPPYHOUR_UPLOAD_KEY_ALIAS=thathappyhour
   THATHAPPYHOUR_UPLOAD_STORE_PASSWORD=****
   THATHAPPYHOUR_UPLOAD_KEY_PASSWORD=****
   ```

4. **Update `android/app/build.gradle`:**
   ```gradle
   signingConfigs {
       release {
           if (project.hasProperty('THATHAPPYHOUR_UPLOAD_STORE_FILE')) {
               storeFile file(THATHAPPYHOUR_UPLOAD_STORE_FILE)
               storePassword THATHAPPYHOUR_UPLOAD_STORE_PASSWORD
               keyAlias THATHAPPYHOUR_UPLOAD_KEY_ALIAS
               keyPassword THATHAPPYHOUR_UPLOAD_KEY_PASSWORD
           }
       }
   }
   ```

5. **Build and test:**
   ```bash
   # Test debug build
   npx expo run:android

   # Build release APK
   cd android && ./gradlew assembleRelease

   # Build AAB for Play Store
   cd android && ./gradlew bundleRelease
   ```

6. **Upload to Google Play Console:**
   - Create app listing in Play Console
   - Upload AAB file
   - Fill in store listing details
   - Submit for review

## EAS Build (Recommended)

### Setup
```bash
npm install -g @expo/cli
npx eas build:configure
```

### Build Commands
```bash
# Build for both platforms
npx eas build --platform all

# Build for iOS only
npx eas build --platform ios

# Build for Android only
npx eas build --platform android

# Build for internal testing
npx eas build --platform all --profile preview
```

### Submit to Stores
```bash
# Submit iOS build
npx eas submit --platform ios

# Submit Android build
npx eas submit --platform android
```

## Environment-Specific Builds

### Development
- Uses `.env.local` with development Supabase project
- Debug builds with development certificates

### Staging
- Uses staging environment variables
- Internal testing builds
- TestFlight (iOS) / Internal Testing (Android)

### Production
- Uses production environment variables
- Release builds with production certificates
- App Store / Google Play Store

## Monitoring and Analytics

### Crash Reporting
Consider integrating:
- Sentry for error tracking
- Crashlytics for crash reporting

### Analytics
Consider integrating:
- Google Analytics for Firebase
- Mixpanel for user analytics
- Supabase Analytics for backend metrics

## Post-Deployment

### 1. Monitor App Performance
- Check crash reports
- Monitor user feedback
- Track key metrics

### 2. Update Process
- Use over-the-air updates for JavaScript changes
- Submit new builds for native changes
- Maintain backward compatibility

### 3. User Support
- Set up support channels
- Monitor app store reviews
- Prepare FAQ and documentation

## Troubleshooting Common Issues

### iOS Issues
- **Code signing errors**: Check Apple Developer account and certificates
- **Build failures**: Clean build folder and update Xcode
- **App Store rejection**: Review Apple's guidelines carefully

### Android Issues
- **Signing errors**: Verify keystore and passwords
- **Build failures**: Clean project with `./gradlew clean`
- **Play Store rejection**: Review Google Play policies

### General Issues
- **Environment variables**: Ensure all required variables are set
- **API limits**: Check rate limits and quotas
- **Database issues**: Verify Supabase configuration and RLS policies
