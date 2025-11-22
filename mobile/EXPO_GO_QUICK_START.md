# FleetGuard - Expo Go Quick Start

## 🚀 Get Started in 2 Minutes

### Step 1: Install Expo Go on Your Phone
- **iOS**: Download from [App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: Download from [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Step 2: Install Dependencies and Start
```bash
# From the project root, install all dependencies (first time only)
npm install

# Navigate to mobile directory and start
cd mobile
npm start
```

### Step 3: Open on Your Device
- **iOS**: Open Camera app → Point at QR code → Tap notification
- **Android**: Open Expo Go app → Tap "Scan QR code" → Point at screen

Done! The app loads on your phone in seconds.

## 🎯 What You Get

✅ **All Features Work:**
- Real-time map with vehicle tracking
- Turn-by-turn navigation
- Hazard reporting and alerts
- Push notifications
- Analytics dashboard
- User authentication

✅ **Fast Development:**
- Instant reload on code changes
- Full debugging with React DevTools
- Works on both iOS and Android

⚠️ **What's Different:**
- Sentry crash reporting disabled (uses console.log instead)
- That's it! Everything else works normally

## 🔧 Common Commands

```bash
# Start development server
npm start

# Start with LAN mode (if same WiFi network)
npm run start:lan

# Start with tunnel mode (if VPN or different networks)
npm run start:tunnel

# Run on Android emulator
npm run android

# Run on iOS simulator (Mac only)
npm run ios
```

## 🐛 Troubleshooting

### Can't connect to development server?
1. Ensure phone and computer are on same WiFi network
2. Try tunnel mode: `npm run start:tunnel`
3. Check backend server is running: `cd ../backend && npm run dev`

### App crashes on launch?
1. Clear Expo cache: `npm start --clear`
2. Restart Expo Go app
3. Check console for errors

### Changes not reflecting?
1. Press `r` in terminal to reload
2. Shake device → Reload
3. Clear cache: `npm start --clear`

## 📱 Testing on Both Platforms

You can test on both iOS and Android simultaneously:
1. Start dev server: `npm start`
2. Scan QR with iOS device
3. Scan same QR with Android device
4. Both devices connect to same server!

## 🚢 Ready for Production?

When you're ready to build for app stores:
1. See [BUILD_QUICK_START.md](./BUILD_QUICK_START.md)
2. Or read [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide

## 💡 Tips

- **Hot Reload**: Code changes auto-reload (no need to refresh)
- **Debug Menu**: Shake device to open debug menu
- **Network Inspect**: Use React Native Debugger
- **Fast Iteration**: Make changes → See results instantly

## ❓ Questions?

- [Expo Go Documentation](https://docs.expo.dev/get-started/expo-go/)
- [Full Setup Guide](../MOBILE_SETUP.md)
- [Migration Details](../EXPO_GO_MIGRATION.md)
