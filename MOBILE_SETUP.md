# Fleet Navigation Mobile App - Setup Instructions

## Important: This is a React Native mobile app that needs to run on your computer/phone

Since this is a React Native app built with Expo, it **cannot run in Replit's browser**. This app also uses native modules and **requires a custom development build** - it will not work in Expo Go.

## Prerequisites

1. **Node.js** (v20.x recommended) installed on your computer
2. **EAS CLI** installed globally: `npm install -g eas-cli`
3. **Expo account** - Create free account at expo.dev
4. For iOS builds: Apple Developer account ($99/year)
5. For Android builds: No account needed for testing

## Setup Steps

### Step 1: Download the Project

Download this entire Replit project to your local computer:
- Click "Download as zip" from Replit menu
- Extract the zip file to a folder

### Step 2: Install Dependencies

Open terminal/command prompt and navigate to the mobile folder:

```bash
cd path/to/your/project/mobile
npm install
```

This will install all required dependencies (may take 5-10 minutes).

### Step 3: Update Backend URL

Edit `mobile/src/contexts/WebSocketContext.js` and change:

```javascript
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
```

To your Replit backend URL:

```javascript
const BACKEND_URL = 'https://a80eda13-a54e-4a07-85d4-bde9f84e0168-00-1okal3s3r72f7.riker.replit.dev';
```

### Step 4: Build Development Client

Since the app uses native modules (Maps, Location, Sentry, Notifications), you need to build a custom development client:

#### For Android (Recommended for testing):
```bash
# Login to Expo
eas login

# Initialize project (first time only)
eas project:init

# Build development client
npm run build:development:android

# Wait 10-20 minutes for build to complete
# Download and install the APK on your Android device
```

#### For iOS (Requires Apple Developer account):
```bash
# Build development client
npm run build:development:ios

# Wait 15-25 minutes for build to complete
# Install via TestFlight or direct install
```

### Step 5: Start Development Server

After installing the development build on your device:

```bash
npm run dev
```

This will start the Expo development server. Open the development build app on your device (not Expo Go), and it will automatically connect.

### Step 6: Running on Emulator

If you have Android Studio or Xcode installed:

```bash
# Android emulator
npm run android

# iOS simulator (Mac only)
npm run ios
```

## Backend Server

The backend is already running on Replit at port 5000. Make sure it stays running while you use the mobile app.

## Troubleshooting

**Problem**: "Cannot connect to backend"
- Make sure you updated the BACKEND_URL in WebSocketContext.js
- Ensure your Replit backend is running

**Problem**: QR code not scanning
- Make sure phone and computer are on same network
- Try using the Expo web interface at http://localhost:19006

**Problem**: App crashes on startup
- Run `npm install` again
- Clear cache: `npx expo start -c`

## Features Available

✅ Fleet Dashboard with real-time vehicle tracking
✅ Interactive OpenStreetMap with hazard markers  
✅ Route calculation with turn-by-turn navigation
✅ Hazard reporting system
✅ WebSocket real-time updates
✅ Green/White/Black color scheme

## Need Help?

The backend API is running at: https://a80eda13-a54e-4a07-85d4-bde9f84e0168-00-1okal3s3r72f7.riker.replit.dev/api/health

You can test it by visiting that URL in your browser to see if the backend is responding.
