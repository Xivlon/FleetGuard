# Testing Connectivity Diagnostics and SDK Guard

This document describes how to test the new connectivity diagnostics and SDK guard features.

## Feature Overview

The mobile app now includes:

1. **Connectivity Banner** - Detects offline/connection issues
2. **Permission Banner** - Shows when location permissions are denied
3. **SDK Version Warning** - Alerts when packages are out of sync
4. **Sentry Telemetry** - Optional crash reporting (when configured)

## Testing Connectivity Banner

### Scenario 1: Backend Offline
**Steps:**
1. Start the mobile app
2. Stop the backend server or disconnect from network
3. Observe the red connectivity banner appearing at the top
4. Click "Retry" to attempt reconnection
5. Click "Dismiss" to hide the banner

**Expected Result:**
- Red banner appears with "🔌 Connection Issue" title
- Message explains connection issue
- Retry and Dismiss buttons are functional

### Scenario 2: VPN/LAN Issues (Multiple Retries)
**Steps:**
1. Start the app with backend unreachable
2. Click "Retry" button 2+ times
3. Observe the updated message suggesting Expo Tunnel mode
4. Click "Tunnel Mode Info" to open documentation

**Expected Result:**
- After 2 retries, message updates to mention VPN/LAN issues
- "Tunnel Mode Info" button appears
- Clicking it opens Expo documentation in browser

## Testing Permission Banner

### Scenario: Location Permission Denied
**Steps:**
1. Start the app
2. Deny location permissions when prompted
3. Observe the orange permission banner at the top
4. Click "Retry" to re-request permissions
5. Click "Open Settings" to navigate to device settings

**Expected Result:**
- Orange banner appears with "📍 Location Permission Required"
- Clear message explaining why permission is needed
- "Retry" re-prompts for permission
- "Open Settings" opens device settings app

## Testing SDK Version Warning

### Scenario: Version Drift Detection
**Steps:**
1. Intentionally install incompatible package version:
   ```bash
   cd mobile
   npm install expo-location@18.0.0 --save
   ```
2. Start the app
3. Observe the orange warning banner at the top
4. Review the list of incompatible packages
5. Click "Dismiss" to hide the banner

**Expected Result:**
- Orange banner appears with "⚠️ SDK Version Warning"
- Lists packages with version conflicts
- Shows installed vs expected versions
- Suggests running `npx expo install --fix`
- Banner can be dismissed

### Scenario: No Version Issues
**Steps:**
1. Ensure all packages match bundled versions:
   ```bash
   cd mobile
   npx expo install --fix
   ```
2. Start the app

**Expected Result:**
- No SDK version warning banner appears
- App starts normally

## Testing Sentry Integration

### Scenario 1: Sentry Not Configured
**Steps:**
1. Ensure `app.json` has `extra.sentryDsn: null`
2. Start the app
3. Check console logs

**Expected Result:**
- Console shows: `[Sentry] No DSN configured, skipping initialization`
- App functions normally without Sentry

### Scenario 2: Sentry Configured
**Steps:**
1. Edit `app.json` and add a test Sentry DSN:
   ```json
   {
     "expo": {
       "extra": {
         "sentryDsn": "https://test@sentry.io/123456"
       }
     }
   }
   ```
2. Start the app
3. Check console logs
4. Trigger a test error:
   ```javascript
   import { captureException } from './src/utils/sentry';
   captureException(new Error('Test error'), { context: 'test' });
   ```

**Expected Result:**
- Console shows: `[Sentry] Initialized in development mode`
- Test errors appear in Sentry dashboard
- No sensitive data is sent (cookies, headers filtered)

## Manual Testing Checklist

- [ ] Connectivity banner shows when offline
- [ ] VPN hint appears after multiple retries
- [ ] Retry button attempts reconnection
- [ ] Tunnel Mode Info opens correct URL
- [ ] Permission banner shows when permission denied
- [ ] Retry re-requests permissions
- [ ] Open Settings navigates to device settings
- [ ] SDK version warning shows for incompatible packages
- [ ] SDK warning can be dismissed
- [ ] Sentry initializes when DSN is configured
- [ ] Sentry doesn't initialize when DSN is null
- [ ] All banners are non-blocking (app still usable)
- [ ] Banners stack properly (don't overlap)
- [ ] Banners auto-hide when issue is resolved

## Banner Behavior

### Priority Order (Top to Bottom):
1. Connectivity Banner (z-index: 1000)
2. Permission Banner (z-index: 999)
3. SDK Version Warning (z-index: 998)

### Auto-Hide Conditions:
- **Connectivity Banner**: Hides when connection is restored or dismissed
- **Permission Banner**: Hides when permission is granted
- **SDK Version Warning**: Only hides when dismissed (persists until fixed or dismissed)

## Integration with Existing Features

The new features integrate seamlessly:
- **LocationContext**: Already had `openSettings` and `requestPermissions` methods
- **WebSocketContext**: `connected` state is used by ConnectivityBanner
- **App.js**: Banners render above NavigationContainer
- All existing screens work unchanged

## Performance Considerations

- SDK version check runs once on startup (minimal overhead)
- Connectivity check uses existing WebSocket state (no new connections)
- Banners only render when needed (conditional rendering)
- Sentry sampling reduces performance impact in production
