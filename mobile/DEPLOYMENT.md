# FleetGuard Mobile App Deployment Guide

Complete guide for building and deploying the FleetGuard mobile app for both iOS and Android platforms using Expo and EAS Build.

## Prerequisites

### Required Accounts
1. **Expo Account**: Sign up at https://expo.dev
2. **Apple Developer Account** (for iOS): $99/year - https://developer.apple.com
3. **Google Play Console Account** (for Android): $25 one-time - https://play.google.com/console

### Required Tools
1. **Node.js**: v18 or later
2. **npm** or **yarn**: Latest version
3. **EAS CLI**: Expo Application Services CLI
4. **Expo CLI**: Expo command-line tool

### Install Required Tools

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Install Expo CLI globally (if not already installed)
npm install -g expo-cli

# Login to Expo
eas login
# or
expo login
```

## Initial Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure Project

Before building, update these files:

#### `app.json`
Replace placeholder values:
```json
{
  "expo": {
    "owner": "your-expo-username",
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

Get your project ID by running:
```bash
eas project:init
```

#### `eas.json` (for production builds)
Update Apple and Google Play credentials:
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@apple.id",
        "ascAppId": "your-app-store-connect-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
```

### 3. Create App Assets

Before building, you need to create proper app icons and splash screens. See `assets/README.md` for detailed instructions.

Required assets:
- `assets/icon.png` (1024x1024)
- `assets/adaptive-icon.png` (1024x1024)
- `assets/splash.png` (1284x2778)
- `assets/favicon.png` (48x48)
- `assets/notification-icon.png` (96x96)

## Build Profiles

The app is configured with four build profiles in `eas.json`:

### 1. Development
- **Purpose**: Testing with development tools
- **Platform**: iOS Simulator + Android APK
- **Distribution**: Internal only

### 2. Preview
- **Purpose**: Testing on real devices
- **Platform**: iOS Device + Android APK
- **Distribution**: Internal (Ad-hoc/TestFlight/Internal Testing)

### 3. Testing
- **Purpose**: QA and beta testing
- **Platform**: iOS Device + Android APK
- **Distribution**: Internal testing tracks

### 4. Production
- **Purpose**: App Store and Google Play releases
- **Platform**: iOS App Store + Android AAB
- **Distribution**: Public stores

## Building the App

### Development Builds

Development builds include dev tools and allow live reload:

```bash
# iOS (simulator)
npm run build:development:ios
# or
eas build --profile development --platform ios

# Android (APK)
npm run build:development:android
# or
eas build --profile development --platform android
```

**Installing Development Builds:**
- iOS: Download simulator build and drag to simulator
- Android: Download APK and install on device via `adb install app.apk`

### Preview Builds (Testing)

Preview builds for testing on real devices:

```bash
# iOS
npm run build:preview:ios

# Android
npm run build:preview:android

# Both platforms
npm run build:all:preview
```

**Installing Preview Builds:**
- iOS: Download IPA and install via TestFlight or Apple Configurator
- Android: Download APK and share download link or install via `adb install`

### Production Builds

Production builds for app stores:

```bash
# iOS
npm run build:production:ios

# Android
npm run build:production:android

# Both platforms
npm run build:all:production
```

## iOS-Specific Setup

### 1. Apple Developer Account Setup

1. Join Apple Developer Program ($99/year)
2. Create App ID in Apple Developer Portal:
   - Identifier: `com.fleetguard.app`
   - Enable capabilities: Push Notifications, Background Modes

### 2. App Store Connect Setup

1. Create a new app in App Store Connect
2. Fill in app information:
   - Name: FleetGuard
   - Bundle ID: `com.fleetguard.app`
   - SKU: `fleetguard-001`
   - Primary Language: English

### 3. TestFlight (Beta Testing)

```bash
# Build for TestFlight
eas build --profile preview --platform ios

# After build completes, submit to TestFlight
eas submit --platform ios
```

Users can install via TestFlight app.

### 4. App Store Submission

```bash
# Build for production
eas build --profile production --platform ios

# Submit to App Store
npm run submit:ios
```

### 5. Background Location (Important!)

FleetGuard uses background location. You must:
1. Clearly explain why in App Store review notes
2. Provide test credentials for reviewers
3. Ensure permission prompts are clear and user-friendly

## Android-Specific Setup

### 1. Google Play Console Setup

1. Create a new app in Google Play Console
2. Fill in app details:
   - App name: FleetGuard
   - Default language: English
   - App or game: App
   - Free or paid: Free (or paid)

### 2. Create Keystore (First Time Only)

EAS Build automatically generates and manages keystores for you. If you need to generate one manually:

```bash
eas credentials
```

### 3. Internal Testing Track

```bash
# Build for internal testing
eas build --profile testing --platform android

# Submit to internal testing track
eas submit --platform android
```

Add testers' email addresses in Google Play Console → Internal Testing.

### 4. Production Release

```bash
# Build production AAB
eas build --profile production --platform android

# Submit to production
npm run submit:android
```

### 5. Google Maps API Key (Required!)

The app uses Google Maps. You must:

1. Go to Google Cloud Console
2. Enable Maps SDK for Android
3. Create API key
4. Add to `app.json`:

```json
{
  "android": {
    "config": {
      "googleMaps": {
        "apiKey": "your-google-maps-api-key"
      }
    }
  }
}
```

## Environment Configuration

### Backend URL Configuration

The mobile app connects to your backend. Configure the backend URL:

In `src/contexts/WebSocketContext.js`, update:
```javascript
const [backendUrl, setBackendUrl] = useState('https://your-backend.fly.dev');
```

Or better yet, use environment variables with `app.config.js`:

```javascript
export default {
  expo: {
    // ... other config
    extra: {
      backendUrl: process.env.BACKEND_URL || 'https://fleetguard-backend.fly.dev'
    }
  }
}
```

Then access via:
```javascript
import Constants from 'expo-constants';
const backendUrl = Constants.expoConfig.extra.backendUrl;
```

## Testing Builds

### Using Expo Go (Development Only)

For quick testing without building:

```bash
npm start
```

Scan QR code with:
- iOS: Camera app
- Android: Expo Go app

**Limitations**: Some native modules won't work in Expo Go.

### Internal Distribution

Share builds with your team:

```bash
# Build preview
eas build --profile preview --platform all

# Get shareable link
eas build:list
```

Share the download URL with testers.

## Build Configuration Reference

### Updating Version Numbers

#### iOS
Edit `app.json`:
```json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1"
    }
  }
}
```

Or use auto-increment (in `eas.json`):
```json
{
  "build": {
    "production": {
      "ios": {
        "autoIncrement": "buildNumber"
      }
    }
  }
}
```

#### Android
Edit `app.json`:
```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    }
  }
}
```

Or use auto-increment (in `eas.json`):
```json
{
  "build": {
    "production": {
      "android": {
        "autoIncrement": "versionCode"
      }
    }
  }
}
```

### Build Optimization

For smaller build sizes:

1. **Remove unused dependencies**:
   ```bash
   npm prune --production
   ```

2. **Optimize assets**:
   ```bash
   npx expo-optimize
   ```

3. **Enable Hermes** (faster JS engine):
   Already enabled in Expo SDK 54+

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/build.yml`:

```yaml
name: EAS Build
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx eas-cli build --platform all --non-interactive --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

Get EXPO_TOKEN from: https://expo.dev/accounts/[username]/settings/access-tokens

## Troubleshooting

### Build Failures

```bash
# View build logs
eas build:list

# View specific build
eas build:view [build-id]
```

Common issues:
- **Missing assets**: Ensure all required images exist
- **Native module conflicts**: Check compatibility with Expo SDK
- **Memory errors**: Use EAS Build's cloud builders (automatic)

### iOS Code Signing Issues

```bash
# Clear credentials and reconfigure
eas credentials

# Or let EAS manage automatically (recommended)
eas build --profile production --platform ios --clear-credentials
```

### Android Build Issues

```bash
# Check Gradle configuration
cd android
./gradlew clean

# Clear build cache
eas build --profile production --platform android --clear-cache
```

### App Crashes on Launch

1. Check logs:
   - iOS: Xcode → Devices → View Device Logs
   - Android: `adb logcat`

2. Common causes:
   - Missing permissions in `app.json`
   - Backend URL unreachable
   - Missing API keys

## Performance Monitoring

The app includes Sentry for error tracking. Configure:

1. Create account at https://sentry.io
2. Get DSN from project settings
3. Add to `app.json`:

```json
{
  "expo": {
    "extra": {
      "sentryDsn": "your-sentry-dsn"
    }
  }
}
```

## App Store Optimization (ASO)

### App Store (iOS)

Required materials:
- App name: FleetGuard
- Subtitle: Real-Time Fleet Navigation
- Description: 4000 character limit
- Keywords: Comma-separated, 100 character limit
- Screenshots:
  - 6.7" (iPhone 14 Pro Max): 1290 x 2796
  - 6.5" (iPhone 11 Pro Max): 1242 x 2688
  - 5.5" (iPhone 8 Plus): 1242 x 2208

### Google Play (Android)

Required materials:
- Short description: 80 characters
- Full description: 4000 characters
- Screenshots:
  - Phone: 16:9 or 9:16, 320-3840px
  - At least 2, up to 8
- Feature graphic: 1024 x 500
- App icon: 512 x 512

## Cost Breakdown

### Development & Testing (Free Tier)
- Expo: Free
- EAS Build: Free tier (limited builds/month)
- Firebase/Backend: Varies by usage

### Production
- Apple Developer: $99/year
- Google Play: $25 one-time
- EAS Build Production: $29/month (unlimited builds)
- Backend hosting (Fly.io): ~$5-20/month

### Optional
- Sentry: Free tier available
- TestFlight: Free with Apple Developer account
- Google Internal Testing: Free

## Support & Resources

- [Expo Documentation](https://docs.expo.dev)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [React Native Documentation](https://reactnative.dev)
- [App Store Connect Help](https://developer.apple.com/app-store-connect/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [FleetGuard GitHub Issues](https://github.com/your-repo/issues)
