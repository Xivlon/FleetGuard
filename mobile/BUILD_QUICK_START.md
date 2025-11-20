# FleetGuard Mobile - Quick Start Build Guide

Fast track guide to build and test FleetGuard mobile app on iOS and Android.

## 🚀 Quick Setup (5 minutes)

### 1. Install Tools

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo (create account at expo.dev if needed)
eas login
```

### 2. Install Dependencies

```bash
cd mobile
npm install
```

### 3. Initialize EAS Project

```bash
# This creates your project ID
eas project:init

# Follow prompts to create new project
```

### 4. Update Configuration

The command above will update `app.json` with your project ID. Also update:

```json
{
  "expo": {
    "owner": "your-expo-username"
  }
}
```

## 📱 Build for Testing (Choose One)

### Option A: Quick Test with Expo Go (Recommended for Development)

**Pros**: Instant, no waiting for builds, fast refresh
**Cons**: Sentry crash reporting disabled

```bash
npm start

# Scan QR code with:
# - iOS: Camera app → opens in Expo Go
# - Android: Expo Go app → scan QR
```

**Note:** Most features work in Expo Go. Sentry crash reporting is automatically disabled but all other features (Maps, Location, Notifications) work normally.

### Option B: Development Build (For Full Features)

**Pros**: All features including Sentry, identical to production
**Cons**: 10-20 min initial build time

#### For Android (Easier - No Apple account needed):

```bash
# Install EAS CLI first
npm install -g eas-cli
eas login

# Build development client
npm run build:development:android

# Wait for build (~15 minutes)
# Download APK and install on device

# Start dev server
npm run dev
```

#### For iOS (Requires Apple Developer Account):

```bash
# Build development client
npm run build:development:ios

# Wait for build (~20 minutes)
# Install via TestFlight or direct install

# Start dev server
npm run dev
```

### Option C: Preview Build (For Testing/Sharing)

**Pros**: All features work, sharable with team
**Cons**: 10-20 min build time

#### For Android (Easier - No Apple account needed):

```bash
# Build APK for Android
npm run build:preview:android

# Wait for build (~15 minutes)
# Download APK from link provided
# Install on Android device or emulator
```

#### For iOS (Requires Apple Developer Account):

```bash
# Build for iOS
npm run build:preview:ios

# Wait for build (~20 minutes)
# Install via TestFlight or Apple Configurator
```

## 🎨 App Assets (Important!)

Before building, create proper app icons. Current assets are placeholders.

### Quick Asset Generation

If you have ImageMagick installed:

```bash
cd assets

# Create basic icon (1024x1024)
convert -size 1024x1024 xc:#10B981 -gravity center \
  -pointsize 72 -fill white -annotate +0+0 "FG" \
  icon.png

# Create adaptive icon for Android
convert -size 1024x1024 xc:transparent -gravity center \
  -fill #10B981 -draw "circle 512,512 512,200" \
  -pointsize 200 -fill white -annotate +0+0 "FG" \
  adaptive-icon.png

# Create splash screen
convert -size 1284x2778 xc:#000000 -gravity center \
  -pointsize 100 -fill #10B981 -annotate +0-200 "FleetGuard" \
  -pointsize 40 -fill white -annotate +0+200 "Real-Time Fleet Navigation" \
  splash.png

# Create favicon
convert icon.png -resize 48x48 favicon.png

# Create notification icon
convert -size 96x96 xc:transparent -gravity center \
  -fill white -draw "circle 48,48 48,20" \
  notification-icon.png
```

See `assets/README.md` for detailed design guidelines.

## 🔧 Configuration Checklist

Before building for production:

- [ ] Update `app.json` with your Expo username
- [ ] Set up project ID via `eas project:init`
- [ ] Create app assets (icon, splash, etc.)
- [ ] Configure backend URL in app
- [ ] Set up Google Maps API key (Android)
- [ ] Test on both iOS and Android

## 📦 Build Commands Reference

```bash
# Development (with dev tools)
npm run build:development:android
npm run build:development:ios

# Preview (for testing)
npm run build:preview:android
npm run build:preview:ios

# Production (for app stores)
npm run build:production:android
npm run build:production:ios

# Build both platforms at once
npm run build:all:preview
npm run build:all:production
```

## 🎯 Platform-Specific Requirements

### Android
- ✅ No paid account needed for testing
- ✅ Can build and test immediately
- ⚠️ Google Play release: $25 one-time fee
- ⚠️ Requires Google Maps API key

### iOS
- ⚠️ Requires Apple Developer account ($99/year)
- ⚠️ TestFlight for beta testing
- ✅ More streamlined review process
- ✅ Better app store discoverability

## 🐛 Common Issues

### "No development builds available"
**Solution**: Run Expo Go for quick testing, or build a development client:
```bash
npm run build:development:android
```

### "Build failed: Invalid bundle identifier"
**Solution**: The bundle identifier in `app.json` must be unique. Change:
```json
{
  "ios": {
    "bundleIdentifier": "com.yourcompany.fleetguard"
  },
  "android": {
    "package": "com.yourcompany.fleetguard"
  }
}
```

### "Missing API key"
**Solution**: Add Google Maps API key to `app.json`:
```json
{
  "android": {
    "config": {
      "googleMaps": {
        "apiKey": "your-api-key-here"
      }
    }
  }
}
```

### Build stuck/taking too long
**Solution**: Check build status:
```bash
eas build:list
eas build:view [build-id]
```

## 🔍 Viewing Builds

```bash
# List all builds
eas build:list

# View specific build details
eas build:view [build-id]

# View in browser
eas build:view --json | jq -r '.artifacts.buildUrl'
```

## 📲 Installing Builds

### Android APK
1. Download APK from build page
2. Transfer to device
3. Enable "Install from unknown sources"
4. Tap APK to install

### iOS IPA
1. Download from build page
2. Use TestFlight (easier) or Apple Configurator (advanced)

TestFlight:
```bash
# Submit to TestFlight
eas submit --platform ios
```

## 🚢 Deploying to App Stores

### Google Play (Android)

1. Create app in Google Play Console
2. Build production AAB:
   ```bash
   npm run build:production:android
   ```
3. Submit:
   ```bash
   npm run submit:android
   ```

### App Store (iOS)

1. Create app in App Store Connect
2. Build production:
   ```bash
   npm run build:production:ios
   ```
3. Submit:
   ```bash
   npm run submit:ios
   ```

## 💰 Pricing

### Free Testing
- Expo account: Free
- Development builds: Free
- Expo Go: Free
- Internal testing: Free

### Paid (Production)
- Apple Developer: $99/year
- Google Play: $25 one-time
- EAS Build Pro: $29/month (optional, for unlimited builds)

## 📚 Next Steps

1. **Read full guide**: See `DEPLOYMENT.md` for comprehensive instructions
2. **Configure backend**: Update backend URL in app
3. **Create assets**: Design professional icons and splash screens
4. **Test thoroughly**: Test on real devices before store submission
5. **Set up CI/CD**: Automate builds with GitHub Actions

## 🆘 Need Help?

- [Full Deployment Guide](./DEPLOYMENT.md)
- [Asset Creation Guide](./assets/README.md)
- [Expo Documentation](https://docs.expo.dev)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [GitHub Issues](https://github.com/your-repo/issues)

## ⚡ Pro Tips

1. **Use preview builds** for testing - faster than production builds
2. **Enable auto-increment** for version numbers in `eas.json`
3. **Use EAS Update** for OTA updates between releases
4. **Test on real devices** - simulators don't catch everything
5. **Start with Android** - easier to test without paid account
