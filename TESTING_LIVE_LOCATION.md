# Testing Live Location and Auto-Fill Start Feature

This document describes how to test the live location feature that automatically uses the device's current position as the start point for route calculation.

## Features Implemented

### Mobile App
1. **Automatic Location Permissions**: App requests location permissions on startup
2. **Continuous Location Tracking**: Location is continuously tracked and streamed via WebSocket
3. **Auto-Fill Start Location**: Route calculation uses current location as default start point
4. **Permission Status UI**: Clear indicators showing location status (Active/Denied/Searching/Unavailable)
5. **Retry Flow**: Easy access to retry permissions or open system settings
6. **Manual Override**: Toggle to switch between "Use my location" and manual coordinate entry

### Backend
1. **Fallback to Last Known Position**: `/api/routes/calculate` accepts requests without `start` when `vehicleId` is provided
2. **Last Position Endpoint**: New `GET /api/vehicles/:vehicleId/last-position` endpoint for debugging

## Testing Instructions

### Backend Testing

#### 1. Start the Backend
```bash
cd backend
npm install
npm start
```

The server should start on port 5000 and display:
```
Fleet Navigation Backend running on port 5000
WebSocket server ready for connections
```

#### 2. Test Last Position Endpoint (No Data)
```bash
curl http://localhost:5000/api/vehicles/demo-vehicle/last-position
```

Expected response (404):
```json
{
  "error": "No position found for this vehicle. Vehicle may not have streamed any location data yet."
}
```

#### 3. Create a Vehicle with Location
```bash
curl -X POST http://localhost:5000/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Vehicle",
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  }'
```

Expected response (201):
```json
{
  "id": "uuid-here",
  "name": "Test Vehicle",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "status": "active",
  "heading": 0,
  "speed": 0,
  "lastUpdate": "2025-10-19T..."
}
```

Copy the `id` from the response for the next tests.

#### 4. Test Last Position Endpoint (With Data)
```bash
VEHICLE_ID="<paste-id-here>"
curl http://localhost:5000/api/vehicles/$VEHICLE_ID/last-position
```

Expected response (200):
```json
{
  "vehicleId": "uuid-here",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "timestamp": "2025-10-19T..."
}
```

#### 5. Test Route Calculation Without Start
```bash
VEHICLE_ID="<paste-id-here>"
curl -X POST http://localhost:5000/api/routes/calculate \
  -H "Content-Type: application/json" \
  -d "{
    \"vehicleId\": \"$VEHICLE_ID\",
    \"end\": {
      \"latitude\": 37.7849,
      \"longitude\": -122.4094
    }
  }"
```

Expected response (200):
```json
{
  "vehicleId": "uuid-here",
  "start": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "end": {
    "latitude": 37.7849,
    "longitude": -122.4094
  },
  "distance": 1417.32,
  "duration": 102047.41,
  "coordinates": [...],
  "fallback": true
}
```

Note: The `start` is automatically filled from the vehicle's last known position.

#### 6. Test Route Calculation Without Start and No Position
```bash
curl -X POST http://localhost:5000/api/routes/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "nonexistent-vehicle",
    "end": {
      "latitude": 37.7849,
      "longitude": -122.4094
    }
  }'
```

Expected response (400):
```json
{
  "error": "No start location provided and no last known position found for vehicle. Please ensure the vehicle is streaming its location or provide a start coordinate."
}
```

### Mobile App Testing

#### 1. Initial Setup
```bash
cd mobile
npm install
```

#### 2. Start the App
For iOS Simulator:
```bash
npm run ios
```

For Android Emulator:
```bash
npm run android
```

For Web (for quick testing):
```bash
npm run web
```

#### 3. Permission Flow Testing

**Test Case 1: Grant Permissions**
1. Launch the app
2. Navigate to the Navigation screen
3. You should see a location permission prompt
4. Grant permission
5. Verify the location status bar shows "📍 Location: Searching..." then "📍 Location: Active"
6. Verify the current coordinates appear below the toggle

**Test Case 2: Deny Permissions**
1. Uninstall and reinstall the app
2. Navigate to the Navigation screen
3. Deny location permission
4. Verify the location status bar shows "📍 Location: Denied"
5. Verify two buttons appear: "Settings" and "Retry"
6. Tap "Settings" - it should open system settings
7. Grant permission in settings
8. Return to app and tap "Retry"
9. Verify location status changes to "Active"

#### 4. Auto-Fill Start Location Testing

**Test Case 3: Use My Location (Default)**
1. With location permission granted
2. Ensure "Use my location as start" toggle is checked (default)
3. Enter destination coordinates (or use defaults)
4. Tap "Calculate Route"
5. Verify:
   - Route is calculated successfully
   - Route starts from current location (shown on map)
   - No error messages appear

**Test Case 4: Manual Override**
1. Uncheck "Use my location as start"
2. Verify:
   - Start location input fields appear
   - Current location coordinates are hidden
3. Enter custom start coordinates
4. Tap "Calculate Route"
5. Verify route uses the manual coordinates

**Test Case 5: Location Unavailable**
1. Turn off location services in system settings
2. Return to app
3. Ensure "Use my location as start" is checked
4. Tap "Calculate Route"
5. Verify an alert appears:
   - "Location Unavailable"
   - "Waiting for location... Please try again in a moment."
   - Options: "Use Manual Coordinates" or "OK"

#### 5. Location Streaming Testing

**Test Case 6: Verify WebSocket Streaming**
1. With location permission granted
2. Start the app and navigate to Navigation screen
3. Calculate a route
4. On the backend terminal, you should see console logs:
   ```
   Received: vehicle:position
   ```
5. Move around (if on device) or simulate location changes (if on simulator)
6. Verify backend continues to receive position updates

**Test Case 7: Multiple Location Updates**
1. Check backend logs for continuous position updates
2. Use the backend endpoint to verify position is being stored:
   ```bash
   curl http://localhost:5000/api/vehicles/demo-vehicle/last-position
   ```
3. Verify the response shows the latest position and timestamp

#### 6. UI Elements Testing

**Test Case 8: Location Status Indicator**
Verify the status bar shows correct states:
- **Checking...**: Initial state when checking permissions
- **Searching...**: Permission granted but no location fix yet
- **Active**: Location is being tracked
- **Denied**: Permission denied
- **Unavailable**: Location services disabled or unavailable

**Test Case 9: Follow Me Button**
1. Calculate a route
2. Location tracking should start automatically
3. Verify the "📍 Following" button appears
4. Map should follow your location with camera updates
5. Tap the button to toggle off
6. Verify map stops following location

## Expected Behavior Summary

### Mobile App
- ✅ Location permissions requested on navigation to Navigation screen
- ✅ Continuous location tracking when permission granted
- ✅ Position streamed via WebSocket with type 'vehicle:position'
- ✅ "Use my location as start" toggle (default ON)
- ✅ Auto-fill start from current location when calculating route
- ✅ Clear permission status indicator
- ✅ Retry and Settings buttons when permission denied
- ✅ Manual coordinate entry as fallback

### Backend
- ✅ Accepts route requests without `start` when `vehicleId` provided
- ✅ Falls back to last known position from vehicles Map
- ✅ Returns helpful 400 error when no position available
- ✅ New endpoint `GET /api/vehicles/:vehicleId/last-position`
- ✅ Compatible with existing 'vehicle:position' WS messages

## Known Limitations

1. **Location Accuracy**: Depends on device GPS and environment
2. **Indoor Testing**: GPS may not work well indoors
3. **Simulator Testing**: Location simulation on iOS simulator requires Xcode
4. **Web Testing**: Browser location API has different permissions flow
5. **GraphHopper**: Without API key, routes use fallback (straight line)

## Troubleshooting

### Location Not Updating
- Check system location services are enabled
- Verify app has location permission
- Try going outdoors for better GPS signal
- Check backend logs for incoming position messages

### Route Calculation Fails
- Verify backend is running
- Check backend URL in `mobile/src/config/environment.js`
- Ensure vehicle has sent at least one position update
- Check network connectivity

### Permission Denied
- Uninstall and reinstall app to reset permissions
- Check system settings for app permissions
- Use "Retry" button after granting permission in settings

### Backend Not Receiving Positions
- Verify WebSocket connection (check "connected" status)
- Check backend logs for WebSocket connection messages
- Verify vehicleId matches between frontend and backend
- Check firewall/network settings

## Success Criteria

All features work correctly when:
- [x] Location permissions are requested on app start
- [x] Current location is tracked and displayed
- [x] Route calculation uses current location as default
- [x] Permission denial shows clear UI with recovery options
- [x] Backend accepts routes without start when vehicle position is known
- [x] Backend returns helpful error when no position available
- [x] New endpoint returns vehicle's last known position
- [x] All security checks pass (CodeQL: 0 alerts)
