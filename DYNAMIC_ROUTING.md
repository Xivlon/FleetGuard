# Dynamic Route Following and Automatic Re-routing

This document describes the dynamic route following and automatic re-routing feature implemented in FleetGuard.

## Overview

FleetGuard now supports real-time vehicle position tracking with automatic route recalculation when a vehicle deviates from its planned route. This feature includes:

- Continuous location streaming from the mobile app to the backend
- Server-side off-route detection using geometric distance calculations
- Automatic route recalculation when off-route conditions are met
- Smooth map-follow experience with a "Follow Me" toggle
- Real-time UI updates showing re-routing status

## Architecture

### Backend (backend/index.js)

#### WebSocket Protocol

**Outgoing (Mobile → Backend):**
```json
{
  "type": "vehicle:position",
  "payload": {
    "vehicleId": "string",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "speed": 10,
    "heading": 45,
    "timestamp": 1234567890
  }
}
```

**Incoming (Backend → Mobile):**
```json
{
  "type": "vehicle:position",
  "payload": { /* echoed position data */ }
}
```

```json
{
  "type": "route:update",
  "payload": {
    "vehicleId": "string",
    "route": { /* GraphHopper-normalized route object */ }
  }
}
```

#### Off-Route Detection Algorithm

1. **Geometry Calculation**: `distancePointToPolylineMeters(point, polyline)`
   - Uses equirectangular projection for planar approximation around segment midpoints
   - Projects point onto each route segment and clamps to [0,1]
   - Calculates haversine distance from point to closest point on each segment
   - Returns minimum distance across all segments

2. **Strike System**:
   - Off-route threshold: `OFF_ROUTE_DISTANCE_M` (default: 50 meters)
   - Required consecutive strikes: `OFF_ROUTE_STRIKES` (default: 3)
   - Debounce interval: 2 seconds per vehicle
   - Strike counter increments when distance > threshold
   - Strike counter resets when back on-route
   - Route recalculation triggers after strike threshold reached

3. **Route Recalculation**:
   - Triggered automatically after 3 consecutive off-route positions
   - Uses current vehicle position as new start point
   - Maintains original destination from active route
   - Broadcasts new route via `route:update` message
   - Resets strike counter after recalculation

#### Configuration

Environment variables (with defaults):
```bash
OFF_ROUTE_DISTANCE_M=50       # Distance threshold in meters
OFF_ROUTE_STRIKES=3           # Number of consecutive off-route positions required
DEBUG_OFF_ROUTE=true          # Enable debug logging
```

### Mobile (mobile/src)

#### Location Service (`services/location.js`)

- Wraps `expo-location` for position tracking
- `watchPosition()`: Continuous location updates
  - High accuracy mode
  - 1.5 second time interval
  - 5 meter distance interval
- `calculateHeading()`: Derives heading from two consecutive positions

#### WebSocket Context (`contexts/WebSocketContext.js`)

- `sendVehiclePosition()`: Sends position updates to backend
- Handles `route:update` messages and updates route state
- Echoes position updates from other vehicles

#### Navigation Screen (`screens/NavigationScreen.js`)

**New Features:**

1. **Follow Me Toggle**
   - Position: Bottom-right corner of map
   - States: "📍 Following" / "📍 Follow Me"
   - When active:
     - Camera tracks user location
     - Bearing updates with heading
     - Pitch set to 45° for 3D view
     - Zoom level: 16

2. **User Location Marker**
   - Blue pin showing current GPS position
   - Updates every 1.5 seconds or 5 meters
   - Visible when route is active

3. **Re-routing Indicator**
   - Banner with spinner: "Recalculating route..."
   - Appears during route recalculation
   - Dismisses when new route received

4. **Automatic Camera Adjustment**
   - Fits camera to new route with padding
   - Animates smoothly during route updates
   - Respects Follow Me state

## Testing

### Manual Testing

1. **Start the Backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Run Automated Test:**
   ```bash
   node /tmp/test-off-route.js
   ```
   
   Expected output:
   - Route calculation succeeds
   - On-route positions show 0m distance
   - Off-route positions increment strike counter
   - Route recalculation triggers after 3 strikes
   - New route is broadcast to clients

3. **Mobile Testing:**
   - Calculate a route in the app
   - Enable "Follow Me" toggle
   - Walk or simulate movement along the route
   - Deliberately move 60-100m off the route
   - Observe "Recalculating route..." banner
   - New route should appear within 2-5 seconds

### Expected Behavior

✅ **Normal On-Route Motion:**
- Position updates every 1.5s or 5m
- No recalculation spam
- Strike counter stays at 0
- Map follows smoothly

✅ **Off-Route Detection:**
- Strike counter increments when >50m off-route
- Recalculation triggers after 3 consecutive strikes
- Re-routing indicator appears
- New route displayed within 2-5 seconds

✅ **Back On-Route:**
- Strike counter resets to 0
- No recalculation triggered
- Normal tracking resumes

## Performance Considerations

- **Debouncing**: Off-route checks limited to once per 2 seconds per vehicle
- **Efficient Geometry**: O(n) distance calculation where n = number of route segments
- **WebSocket Efficiency**: Position updates broadcast only, no polling
- **Mobile Battery**: Location updates balanced for accuracy vs. power consumption

## Limitations

- Requires GPS/location permissions on mobile device
- Accuracy depends on device GPS quality
- Indoor/tunnel tracking may be unreliable
- No support for offline route calculation
- Fallback routing used when GraphHopper API unavailable

## Future Enhancements

- [ ] Adjust sensitivity based on road type (highway vs. city streets)
- [ ] Predict off-route conditions before they occur
- [ ] Support waypoints in route recalculation
- [ ] Add traffic-aware re-routing
- [ ] Implement route deviation history/analytics
- [ ] Support multiple routing profiles (car, bike, walking)
