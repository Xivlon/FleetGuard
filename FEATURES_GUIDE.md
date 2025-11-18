# FleetGuard New Features Guide

## Overview

FleetGuard now includes comprehensive fleet management features including user authentication, analytics, push notifications, and offline support.

## New Features

### 1. User Authentication & Fleet Organizations

#### User Roles
- **Driver**: Standard driver account with navigation and trip tracking
- **Fleet Manager**: Manage fleet operations and view team analytics
- **Admin**: Full system access and user management

#### Features
- Secure JWT-based authentication
- Password hashing with bcrypt
- Profile management
- Fleet organization grouping

#### API Endpoints
```
POST   /api/auth/register      - Create new user account
POST   /api/auth/login         - Login with email/password
GET    /api/auth/me            - Get current user profile
PUT    /api/auth/profile       - Update user profile
```

#### Mobile App
- Login screen with email/password
- Registration screen with validation
- Automatic token management
- Secure token storage

---

### 2. Analytics Dashboard

#### Dashboard Metrics
- Total trips count
- Total distance traveled
- Average trip distance
- Daily trip trends (line chart)
- Trip status breakdown (pie chart)
- Top drivers leaderboard
- Driver performance scores

#### Driver Analytics
- Personal trip history
- Performance score (0-100)
- Off-route event count
- Reroute statistics
- Average trip duration

#### API Endpoints
```
GET    /api/analytics/dashboard           - Fleet-wide analytics
GET    /api/analytics/driver/:userId      - Driver-specific stats
GET    /api/analytics/hazard-heatmap      - Hazard frequency data
```

#### Mobile App
- Analytics screen with charts (LineChart, PieChart, BarChart)
- Date range filtering (7 days, 30 days, all time)
- Performance score visualization
- Driver leaderboard

---

### 3. Trip History & Tracking

#### Features
- Automatic trip recording
- GPS path tracking
- Hazard encounters logging
- Off-route and reroute tracking
- Trip metrics (distance, duration, etc.)

#### Trip Lifecycle
1. **Start Trip**: `POST /api/trips`
2. **Update Progress**: `PUT /api/trips/:id/update`
3. **Complete Trip**: `PUT /api/trips/:id/complete`

#### API Endpoints
```
POST   /api/trips                     - Start new trip
PUT    /api/trips/:id/update          - Update trip progress
PUT    /api/trips/:id/complete        - Complete trip
GET    /api/trips                     - List trips (with filters)
GET    /api/trips/:id                 - Get trip details
```

#### Data Tracked
- Start/end locations and times
- Actual GPS path
- Route polyline
- Distance and duration
- Hazards encountered
- Off-route count
- Reroute count
- Custom metrics (fuel, speed, etc.)

---

### 4. Push Notifications

#### Notification Types
1. **Hazard Alerts**: High-priority alerts for hazards on route
2. **Route Updates**: Notifications when route is recalculated
3. **Arrival Notifications**: Alerts when destination is reached
4. **General**: Custom fleet messages

#### Features
- Expo push notification support
- Per-user push token management
- Notification history tracking
- Read/unread status
- Priority levels (low, medium, high)

#### API Endpoints
```
GET    /api/notifications              - Get user's notifications
PUT    /api/notifications/:id/read    - Mark as read
POST   /api/notifications/test        - Send test notification
```

#### Backend Service
```javascript
// Send hazard alert
await sendHazardAlert(userId, hazardData);

// Send route update
await sendRouteUpdate(userId, 'Route recalculated');

// Send arrival notification
await sendArrivalNotification(userId, 'Main Office');
```

#### Mobile App
- Automatic push token registration
- Notification permission handling
- Local notification support
- Notification tap handling

---

### 5. Offline Mode

#### Features
- Automatic offline detection
- Message queuing when offline
- Automatic sync when back online
- Retry logic with exponential backoff
- Failed message tracking

#### Queued Message Types
- Position updates
- Hazard reports
- Trip updates
- Custom events

#### API
```javascript
// Add to offline queue
const messageId = await addToQueue('hazard_report', hazardData);

// Sync queue when online
await syncQueue();

// Retry failed messages
await retryFailed();

// Get queue status
const pendingCount = getPendingCount();
const failedCount = getFailedCount();
```

#### Mobile App
- OfflineContext for state management
- Automatic queue persistence (AsyncStorage)
- Network state monitoring (NetInfo)
- Visual indicators for offline status

---

### 6. Fleet Management

#### Features
- Fleet organization creation
- User-fleet association
- Fleet settings management
- Multi-fleet support for admins

#### API Endpoints
```
GET    /api/fleets                - List all fleets (admin)
GET    /api/fleets/:id            - Get fleet details
POST   /api/fleets                - Create fleet (admin)
PUT    /api/fleets/:id            - Update fleet
GET    /api/fleets/:id/users      - List fleet users
```

#### Fleet Settings
```json
{
  "maxVehicles": 50,
  "enableHazardReporting": true,
  "enableOfflineMode": true,
  "notificationSettings": {
    "hazardAlerts": true,
    "routeUpdates": true,
    "arrivalNotifications": true
  }
}
```

---

## Usage Examples

### Register New Driver

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@example.com",
    "password": "secure123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "driver",
    "phoneNumber": "+1234567890"
  }'
```

### Start a Trip

```bash
curl -X POST http://localhost:5000/api/trips \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "vehicle-123",
    "startLocation": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "endLocation": {
      "latitude": 37.8044,
      "longitude": -122.2712
    }
  }'
```

### Get Analytics

```bash
curl -X GET "http://localhost:5000/api/analytics/dashboard?startDate=2024-01-01" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Mobile App Integration

### Setup

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

3. Start app:
```bash
npm start
```

### Authentication Flow

```javascript
// Login
const { login } = useAuth();
const result = await login('user@example.com', 'password');

// Access user data
const { user, isAuthenticated } = useAuth();

// Logout
const { logout } = useAuth();
await logout();
```

### Analytics

```javascript
// Navigate to analytics
navigation.navigate('Analytics');
```

### Notifications

```javascript
// Setup in App.js automatically
// Notifications are received and handled automatically
```

### Offline Mode

```javascript
// Use offline context
const { isOnline, addToQueue, syncQueue } = useOffline();

// Queue a message when offline
if (!isOnline) {
  await addToQueue('hazard_report', hazardData);
}
```

---

## Security Considerations

1. **Passwords**: Hashed with bcrypt (10 rounds)
2. **JWT Tokens**: Expire after 7 days (configurable)
3. **API Security**: All endpoints require authentication
4. **Role-based Access**: Endpoints restricted by user role
5. **Input Validation**: All inputs validated with express-validator

---

## Performance

- **Database Pooling**: Max 10 connections
- **WebSocket Throttling**: Max 5 position updates/sec per vehicle
- **Caching**: GraphHopper route caching (30s TTL)
- **Query Optimization**: Indexed columns on frequently queried fields

---

## Next Steps

1. Implement map caching for offline navigation
2. Add geofencing capabilities
3. Voice navigation guidance
4. Advanced analytics (heatmaps, predictive ETA)
5. Multi-language support
6. Dark mode theme
