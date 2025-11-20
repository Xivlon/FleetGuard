# Expo Go Migration Guide

This document explains the changes made to make FleetGuard compatible with Expo Go.

## What Changed

### Dependencies
- ✅ Removed `expo-dev-client` - Not needed for Expo Go
- ✅ Removed `react-native-geolocation-service` - Unused (app uses `expo-location`)
- ✅ Updated all package versions to match Expo SDK 54 bundled versions

### Sentry Integration
- ✅ Made Sentry optional - gracefully disabled when running in Expo Go
- ✅ Removed Sentry plugin from `app.json` - not needed for Expo Go
- ✅ Removed Sentry babel plugin - not needed for Expo Go
- ✅ Updated `src/utils/sentry.js` to dynamically import Sentry and skip initialization in Expo Go

### Documentation
- ✅ Updated `README.md` with Expo Go instructions
- ✅ Updated `MOBILE_SETUP.md` to prioritize Expo Go
- ✅ Updated `BUILD_QUICK_START.md` to show Expo Go as primary option

## How to Run

### With Expo Go (Development)
```bash
cd mobile
npm install
npm start
# Scan QR code with Expo Go app on your device
```

### With Development Build (Production-like)
```bash
cd mobile
npm install -g eas-cli
eas login
npm run build:development:android  # or :ios
npm run dev
# Open development build app on your device
```

## What Works in Expo Go

✅ **All Core Features Work:**
- Maps (react-native-maps 1.20.1)
- Location tracking (expo-location)
- Push notifications (expo-notifications)
- Secure storage (expo-secure-store)
- WebSocket connectivity
- Analytics
- Route navigation
- Hazard reporting

❌ **What's Disabled in Expo Go:**
- Sentry crash reporting (automatically disabled, logs to console instead)

## Package Versions

All packages now match Expo SDK 54 bundled versions:
- `react`: 19.1.0
- `react-native`: 0.81.4
- `expo`: ^54.0.13
- `react-native-maps`: 1.20.1
- `expo-location`: ~19.0.7
- `expo-notifications`: ~0.32.12
- `react-native-svg`: 15.12.1
- `react-native-screens`: ~4.16.0

## Benefits

1. **Instant Testing**: No need to wait 15-20 minutes for builds
2. **Fast Refresh**: Code changes reflect immediately
3. **No Build Account Required**: No Apple Developer or EAS account needed for testing
4. **Cross-Platform**: Easy to test on both iOS and Android
5. **Simple Setup**: Just install Expo Go and scan QR code

## When to Use Development Builds

Use custom development builds when you need:
- Full Sentry crash reporting in development
- To test production-like behavior
- To distribute to testers without Expo Go
- To test on devices without Expo Go

## Technical Details

### Sentry Dynamic Import
The app now uses a dynamic require for Sentry:
```javascript
try {
  Sentry = require('@sentry/react-native');
  sentryAvailable = true;
} catch (e) {
  console.log('[Sentry] Native SDK not available (running in Expo Go)');
}
```

This allows the app to gracefully handle when Sentry native SDK is not available.

### Version Alignment
All dependencies now use exact or tilde versions that match Expo's bundled native modules, ensuring compatibility with Expo Go.

## Troubleshooting

### "Network request failed" in Expo Go
- Make sure your device and computer are on the same network
- Try using tunnel mode: `npm start --tunnel`

### "Native module not found"
- Make sure you're using Expo Go, not a custom build
- Verify all packages match the versions in this document
- Run `npm install` again

### Features not working
- Check that you're running the latest version of Expo Go
- Verify the backend server is running
- Check the Expo console for errors

## Future Considerations

If you need full Sentry integration in development:
1. Build a development client: `npm run build:development:android`
2. Install it on your device
3. Run `npm run dev` to start the dev server
4. Open the development build (not Expo Go)

Sentry will automatically initialize when running in a development build.
