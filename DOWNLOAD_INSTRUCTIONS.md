# 📱 Fleet Navigation Mobile App - Quick Start

## ⚠️ Important Notice

This is a **React Native mobile application** that runs on your phone or emulator. It **cannot run in Replit's browser**.

## 🚀 Quick Start Guide

### 1. Download Project to Your Computer

**Option A: Download from Replit**
- Click the three dots menu (⋮) in Replit
- Select "Download as zip"
- Extract the folder to your computer

**Option B: Clone from Replit**
```bash
git clone YOUR_REPLIT_GIT_URL
```

### 2. Install Node.js (if not installed)
- Download from: https://nodejs.org/
- Install version 16 or higher

### 3. Install Expo Go on Your Phone
- **iOS**: App Store → Search "Expo Go" → Install
- **Android**: Google Play → Search "Expo Go" → Install

### 4. Run the Mobile App

Open terminal/command prompt on your computer:

```bash
# Navigate to the mobile folder
cd path/to/downloaded/project/mobile

# Install dependencies (one time only)
npm install

# Start the app
npm start
```

### 5. Connect Your Phone

1. After running `npm start`, a QR code will appear
2. Open **Expo Go** app on your phone
3. **iOS**: Scan the QR code with Camera app, then tap "Open in Expo Go"
4. **Android**: Open Expo Go app, tap "Scan QR Code", scan it
5. Wait for the app to load (first time may take 1-2 minutes)

## ✅ The App is Working When You See:

- Green and black interface
- Map showing San Francisco area
- Fleet Dashboard screen with map
- Navigation buttons at bottom

## 🔌 Backend Server

The backend server is already running on Replit:
- URL: https://a80eda13-a54e-4a07-85d4-bde9f84e0168-00-1okal3s3r72f7.riker.replit.dev
- API Health: /api/health
- WebSocket: Connected automatically

**Keep the Replit tab open** so the backend stays running while you use the mobile app.

## 📱 App Features

✅ **Fleet Dashboard** - Real-time vehicle tracking on map
✅ **Navigation** - Route calculation with turn-by-turn directions
✅ **Report Hazard** - Submit road hazards with severity levels
✅ **OpenStreetMap** - Interactive map with custom styling
✅ **Real-time Updates** - WebSocket notifications for hazards
✅ **Route Recalculation** - Automatic rerouting when hazards detected

## 🔧 Troubleshooting

**Problem: "Cannot connect to server"**
- Check that Replit backend is still running
- Make sure your phone and computer are on same WiFi network
- Check WebSocketContext.js has correct backend URL

**Problem: QR code won't scan**
- Try the tunnel URL shown in terminal instead
- Use Expo web interface: http://localhost:19006

**Problem: "Module not found"**
- Delete `node_modules` folder
- Run `npm install` again
- Run `npx expo start -c` (clears cache)

**Problem: App shows blank screen**
- Check for errors in Expo Go app
- Shake phone → "Reload"
- Check Replit backend is responding

## 📞 Support

Backend Health Check: 
https://a80eda13-a54e-4a07-85d4-bde9f84e0168-00-1okal3s3r72f7.riker.replit.dev/api/health

Should return: `{"status":"ok","vehicles":0,"hazards":0,"routes":0,...}`

---

## 🎨 App Color Scheme
- Primary: Green (#10B981)
- Background: Black (#000000)  
- Text: White (#FFFFFF)

Enjoy your Fleet Navigation System! 🚗📍
