# Fleet Navigation System - Replit Project

## Overview

A React Native fleet navigation mobile application with Express.js backend, featuring OpenStreetMap integration, GraphHopper routing, and real-time crowd-sourced hazard alerts.

**Status**: MVP Complete
**Created**: October 17, 2025
**Color Scheme**: Green (#10B981), White (#FFFFFF), Black (#000000)

## Project Architecture

### Backend (`/backend`)
- **Framework**: Express.js on Node.js 20
- **Port**: 5000 (configured for Replit)
- **Real-time**: WebSocket server for live updates
- **Routing**: GraphHopper API integration (with fallback)
- **Storage**: In-memory (Map-based) for hazards, vehicles, routes

### Mobile App (`/mobile`)
- **Framework**: React Native with Expo
- **Navigation**: React Navigation (Stack Navigator)
- **Maps**: React Native Maps with OpenStreetMap
- **State**: Context API with WebSocket integration
- **Theme**: Dark theme with green accent colors

## Recent Changes

### October 17, 2025 - Initial Implementation
- Created Express.js backend server with WebSocket support
- Implemented GraphHopper routing API integration with fallback routing
- Built hazard management system with CRUD operations
- Created React Native app with three main screens
- Implemented real-time fleet tracking via WebSocket
- Added hazard reporting and filtering system
- Set up dark theme with green/white/black color scheme
- Configured project structure for React Native compatibility

## Key Features Implemented

1. ✅ Interactive OpenStreetMap interface with vehicle markers
2. ✅ GraphHopper route calculation with turn-by-turn instructions
3. ✅ Crowd-sourced hazard reporting system
4. ✅ Fleet dashboard with real-time vehicle tracking
5. ✅ Hazard severity levels (low/medium/high) with color coding
6. ✅ Time-based and severity-based hazard filtering
7. ✅ Route recalculation alerts when hazards detected
8. ✅ Driver-optimized mobile interface
9. ✅ WebSocket real-time updates
10. ✅ Fallback routing when GraphHopper API not configured

## Tech Stack

**Backend**:
- express (^4.18.2)
- cors (^2.8.5)
- ws (^8.14.2)
- axios (^1.6.0)
- uuid (^9.0.1)

**Mobile** (React Native):
- react (18.2.0)
- react-native (0.72.6)
- expo (~49.0.15)
- react-native-maps (1.7.1)
- @react-navigation/native (^6.1.9)
- @react-navigation/stack (^6.3.20)

## API Endpoints

### Hazards
- `GET /api/hazards` - Get hazards (optional: ?severity=low&timeFilter=24)
- `POST /api/hazards` - Report new hazard
- `DELETE /api/hazards/:id` - Remove hazard

### Vehicles
- `GET /api/vehicles` - Get all vehicles
- `POST /api/vehicles` - Add new vehicle
- `GET /api/routes/:vehicleId` - Get vehicle route

### Routes
- `POST /api/routes/calculate` - Calculate route (GraphHopper or fallback)

### Health
- `GET /api/health` - Server status and stats

## Environment Configuration

### Optional Secrets
- `GRAPHHOPPER_API_KEY` - For production routing (free tier available at graphhopper.com)

Without GraphHopper API key, the app uses fallback straight-line routing with basic turn-by-turn instructions.

## Running the Application

### Backend
- Automatically runs via workflow on port 5000
- WebSocket available at ws://[domain]:5000

### Mobile App
To run on a physical device:
1. Install Expo Go app on mobile device
2. `cd mobile && npm install`
3. `npm start`
4. Scan QR code with device

## Mobile App Screens

1. **Fleet Dashboard** - Main map view with all vehicles and hazards
2. **Navigation Screen** - Route planning with turn-by-turn directions
3. **Report Hazard Screen** - Form to report incidents

## Data Models

### Hazard
```javascript
{
  id: uuid,
  type: string,
  location: { latitude, longitude },
  description: string,
  severity: 'low' | 'medium' | 'high',
  reportedBy: string,
  timestamp: ISO string,
  status: 'active'
}
```

### Vehicle
```javascript
{
  id: uuid,
  name: string,
  location: { latitude, longitude },
  status: 'active',
  heading: number,
  speed: number,
  lastUpdate: ISO string
}
```

### Route
```javascript
{
  vehicleId: string,
  start: { latitude, longitude },
  end: { latitude, longitude },
  distance: meters,
  duration: milliseconds,
  coordinates: [[lon, lat], ...],
  instructions: [{ text, distance, time }, ...],
  timestamp: ISO string
}
```

## WebSocket Protocol

### Client → Server
- `UPDATE_VEHICLE_LOCATION` - Send vehicle position update

### Server → Client
- `INITIAL_DATA` - Full state on connect
- `VEHICLE_ADDED` / `VEHICLE_UPDATED` - Vehicle changes
- `HAZARD_ADDED` / `HAZARD_REMOVED` - Hazard changes
- `ROUTE_UPDATED` - New route calculated
- `ROUTE_HAZARD_ALERT` - Hazard detected on active route

## Color Palette

- **Primary**: #10B981 (Green)
- **Secondary**: #059669 (Dark Green)
- **Background**: #000000 (Black)
- **Card**: #1F1F1F (Dark Gray)
- **Text**: #FFFFFF (White)
- **High Severity**: #EF4444 (Red)
- **Medium Severity**: #F59E0B (Orange)
- **Low Severity**: #10B981 (Green)

## Notes

- App is React Native compatible and designed for mobile deployment
- Backend runs on Replit with port 5000 exposed
- Uses dark theme for better outdoor visibility
- Large touch targets for driver safety
- Automatic cleanup of hazards older than 24 hours
- Route hazard detection within 1000m proximity
