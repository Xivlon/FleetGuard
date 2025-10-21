# Fleet Navigation System

A real-time fleet navigation mobile application with OpenStreetMap integration, GraphHopper routing, and crowd-sourced hazard alerts.

## Features

- **Interactive Map Interface**: OpenStreetMap integration with real-time vehicle location display
- **Route Calculation**: Turn-by-turn navigation using GraphHopper routing engine
- **Hazard Alerts**: Real-time crowd-sourced incident reporting system
- **Fleet Dashboard**: View all active vehicles and routes on a single map
- **Route Recalculation**: Automatic route updates when hazards are detected
- **Driver-Friendly UI**: Clean green, white, and black color scheme optimized for mobile

## Project Structure

```
├── backend/               # Express.js backend server
│   ├── server.js         # Main server with WebSocket support
│   └── package.json      # Backend dependencies
├── mobile/               # React Native mobile app
│   ├── App.js           # Main app component
│   ├── src/
│   │   ├── contexts/    # WebSocket context
│   │   └── screens/     # App screens
│   ├── package.json     # Mobile dependencies
│   └── app.json         # Expo configuration
└── README.md
```

## Backend Server

The backend server runs on port 5000 and provides:
- RESTful API for hazards, vehicles, and routes
- WebSocket server for real-time updates
- GraphHopper API integration (optional)
- In-memory data storage

### API Endpoints

- `GET /api/hazards` - Get all hazards (with optional filters)
- `POST /api/hazards` - Report a new hazard
- `DELETE /api/hazards/:id` - Remove a hazard
- `GET /api/vehicles` - Get all vehicles
- `POST /api/vehicles` - Add a new vehicle
- `POST /api/routes/calculate` - Calculate a route
- `GET /api/health` - Server health check

### WebSocket Events

- `INITIAL_DATA` - Initial data when connected
- `VEHICLE_UPDATED` - Vehicle location updated
- `HAZARD_ADDED` - New hazard reported
- `HAZARD_REMOVED` - Hazard removed
- `ROUTE_UPDATED` - Route calculated/updated
- `ROUTE_HAZARD_ALERT` - Hazard detected on route

## React Native Mobile App

The mobile app is built with Expo and React Native, featuring:

### Screens

1. **Fleet Dashboard** - Main screen showing all vehicles and hazards on a map
2. **Navigation Screen** - Route planning and turn-by-turn navigation
3. **Report Hazard Screen** - Form to report road hazards

### Key Features

- Real-time map updates via WebSocket
- Time-based and severity-based hazard filtering
- Route visualization with hazard warnings
- Mobile-optimized touch interface
- Dark theme with green accents for outdoor visibility

## Development Setup

### Prerequisites

- Node.js 20.19.5 (use `.nvmrc` for automatic version selection with nvm)
- npm

### Installing Dependencies

```bash
# Install all dependencies (root, backend, and mobile)
npm install
cd backend && npm install
cd ../mobile && npm install
```

### Development Scripts

**Root workspace:**
- `npm run dev` - Start the backend in development mode
- `npm run lint` - Lint all code
- `npm run lint:fix` - Auto-fix linting issues

**Backend:**
- `npm run dev` - Start the backend server
- `npm run lint` - Lint backend code
- `npm test` - Run backend tests
- `npm run build` - Build backend (currently a placeholder)

**Mobile:**
- `npm start` - Start Expo development server
- `npm run dev` - Start Expo with dev client
- `npm run start:lan` - Start Expo on LAN network
- `npm run start:tunnel` - Start Expo with tunnel
- `npm run lint` - Lint mobile code
- `npm run android` - Run on Android device
- `npm run ios` - Run on iOS device

### Pre-commit Hooks

This project uses Husky and lint-staged to automatically lint code before commits. Linting will run automatically on staged files when you commit.

### Continuous Integration

GitHub Actions workflows automatically run on pull requests and pushes to main:
- **Backend CI**: Runs on Node 18 and 20, performs linting, testing, and build verification
- **Mobile CI**: Runs linting and Expo doctor checks

## Running the Project

### Backend Server

The backend server is configured to run automatically. It listens on port 5000.

```bash
cd backend
npm run dev
```

### Mobile App

To run the React Native app on your device:

1. Install Expo Go app on your mobile device
2. Navigate to the `mobile/` directory
3. Run `npm install` to install dependencies
4. Run `npm start` to start the Expo development server
5. Scan the QR code with your device

## Configuration

### GraphHopper API (Optional)

To use GraphHopper routing instead of fallback routing:

1. Get a free API key from https://www.graphhopper.com/
2. Add the key as an environment secret: `GRAPHHOPPER_API_KEY`
3. Restart the backend server

Without the API key, the app uses simple point-to-point routing.

### Backend URL

The mobile app connects to the backend server. Update the `BACKEND_URL` in `mobile/src/contexts/WebSocketContext.js` if needed.

## Color Scheme

- **Primary Green**: #10B981
- **Secondary Green**: #059669
- **Background Black**: #000000
- **Card Dark Gray**: #1F1F1F
- **Text White**: #FFFFFF

## Hazard Severity Levels

- **Low** (Green): Minor issues, proceed with caution
- **Medium** (Orange): Moderate issues, consider alternative route
- **High** (Red): Severe issues, route recalculation recommended

## Demo Usage

The app includes demo coordinates for San Francisco:
- Default start: 37.7749, -122.4194
- Default end: 37.7849, -122.4094

You can modify these coordinates or use actual GPS location data in production.

## Technologies Used

### Backend
- Express.js
- WebSocket (ws)
- Axios
- GraphHopper API

### Mobile
- React Native
- Expo
- React Navigation
- React Native Maps
- WebSocket client

## Connectivity & Diagnostics Features

### Connectivity Diagnostics

The app includes built-in connectivity diagnostics to help developers and users identify network issues:

- **Offline Detection**: Displays a dismissible banner when the backend connection is lost
- **VPN/LAN Detection**: After multiple failed connection attempts, suggests using Expo Tunnel mode for VPN environments
- **Action Buttons**: Provides "Retry" and "Switch to Tunnel Mode" options directly in the UI

### SDK Version Guard

The app checks installed package versions against Expo's bundled native modules on startup:

- Compares critical packages (expo-location, react-native-maps, etc.) with expected versions
- Shows a non-blocking warning banner if versions are out of range
- Provides guidance to run `npx expo install --fix` to resolve conflicts

### Enhanced Permission UX

Improved location permission handling:

- **Permission Banner**: Shows when location permissions are denied
- **Retry Action**: Allows users to retry permission request
- **Open Settings**: Direct link to device settings to manually grant permissions
- Reuses the existing live-location flow from LocationContext

### Telemetry (Optional)

Sentry integration for crash reporting and error tracking:

- **Configuration**: Sentry DSN is read from `app.json` extra config (no secrets in code)
- **Sampling**: Higher sampling rates in development (100%) vs production (50%)
- **Privacy**: Automatically filters sensitive data (cookies, headers)
- **Manual Capture**: Utility functions for capturing exceptions and messages

See [SENTRY_CONFIGURATION.md](SENTRY_CONFIGURATION.md) for setup instructions.

## Future Enhancements

- Offline map caching
- Background location tracking
- Push notifications
- Driver profiles and trip history
- Multi-stop route optimization
- Voice navigation guidance
- Historical hazard data analytics
