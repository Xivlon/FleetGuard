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

## Running the Project

### Backend Server

The backend server is configured to run automatically. It listens on port 5000.

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

## Future Enhancements

- Offline map caching
- Background location tracking
- Push notifications
- Driver profiles and trip history
- Multi-stop route optimization
- Voice navigation guidance
- Historical hazard data analytics
