# Fleet Navigation Mobile App - Setup Instructions

## Important: This is a React Native mobile app that needs to run on your computer/phone

Since this is a React Native app built with Expo, it **cannot run in Replit's browser**. Follow these steps to run it on your device using Expo Go:

## Prerequisites

1. **Node.js** (v16 or higher) installed on your computer
2. **Expo Go app** installed on your phone:
   - iOS: Download from App Store
   - Android: Download from Google Play Store

## Setup Steps

### Step 1: Download the Project

Download this entire Replit project to your local computer:
- Click "Download as zip" from Replit menu
- Extract the zip file to a folder

### Step 2: Install Dependencies

Open terminal/command prompt and navigate to the project root:

```bash
cd path/to/your/project
npm install
```

This will install all required dependencies for the entire project including the mobile app (may take 5-10 minutes). The project uses npm workspaces to manage dependencies.

### Step 3: Update Backend URL

Edit `mobile/src/contexts/WebSocketContext.js` and change:

```javascript
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
```

To your Replit backend URL:

```javascript
const BACKEND_URL = 'https://a80eda13-a54e-4a07-85d4-bde9f84e0168-00-1okal3s3r72f7.riker.replit.dev';
```

### Step 4: Start the App

Navigate to the mobile directory and start:

```bash
cd mobile
npm start
```

This will:
- Start the Expo development server
- Show a QR code in your terminal

### Step 5: Run on Your Phone

1. Open **Expo Go** app on your phone
2. Scan the QR code shown in the terminal
3. The app will load on your phone!

## Alternative: Run on Emulator

### iOS (Mac only):
```bash
npm run ios
```

### Android:
```bash
npm run android
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
