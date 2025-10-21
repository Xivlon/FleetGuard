# UI Visual Guide - Connectivity Diagnostics

This document provides a visual description of the new UI components.

## Banner Layout

All banners appear at the top of the screen, above the navigation container:

```
┌──────────────────────────────────────┐
│  Status Bar (iOS/Android)            │
├──────────────────────────────────────┤
│  🔌 Connectivity Banner (if offline) │ ← Red (#EF4444)
├──────────────────────────────────────┤
│  📍 Permission Banner (if denied)    │ ← Orange (#F59E0B)
├──────────────────────────────────────┤
│  ⚠️ SDK Warning (if drift detected)  │ ← Orange (#F59E0B)
├──────────────────────────────────────┤
│                                      │
│  Navigation Header                   │
│                                      │
├──────────────────────────────────────┤
│                                      │
│                                      │
│  Main Content Area                   │
│  (Map, Lists, Forms, etc.)           │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

## 1. Connectivity Banner (Offline State)

### Initial State
```
╔══════════════════════════════════════╗
║ 🔌 Connection Issue                  ║
║                                      ║
║ Unable to connect to the backend     ║
║ server. Check your internet          ║
║ connection.                          ║
║                                      ║
║ [  Retry  ] [  Dismiss  ]            ║
╚══════════════════════════════════════╝
```
**Colors:**
- Background: #EF4444 (Red)
- Text: #FFFFFF (White)
- Buttons: Green (#10B981) and Semi-transparent

### After 2+ Retries (VPN Hint)
```
╔══════════════════════════════════════╗
║ 🔌 Connection Issue                  ║
║                                      ║
║ Unable to connect to backend. If     ║
║ you're on a VPN, LAN discovery may   ║
║ be blocked. Consider using Expo      ║
║ Tunnel mode.                         ║
║                                      ║
║ [ Retry ] [ Tunnel Info ] [ Dismiss ]║
╚══════════════════════════════════════╝
```
**Colors:**
- Background: #EF4444 (Red)
- Text: #FFFFFF (White)
- Buttons: Green, Orange, Semi-transparent

## 2. Permission Banner

```
╔══════════════════════════════════════╗
║ 📍 Location Permission Required      ║
║                                      ║
║ FleetNav needs location access to    ║
║ provide navigation and track your    ║
║ vehicle. Please grant location       ║
║ permissions to continue.             ║
║                                      ║
║ [  Retry  ] [ Open Settings ]        ║
╚══════════════════════════════════════╝
```
**Colors:**
- Background: #F59E0B (Orange)
- Text: #FFFFFF (White)
- Buttons: Green (#10B981) and Semi-transparent

## 3. SDK Version Warning Banner

```
╔══════════════════════════════════════╗
║ ⚠️ SDK Version Warning               ║
║                                      ║
║ Some packages may be out of sync     ║
║ with your Expo SDK version:          ║
║                                      ║
║ • expo-location: installed 18.0.0,   ║
║   expected ~19.0.7                   ║
║ • react-native-maps: installed 1.15.0║
║   expected 1.20.1                    ║
║ ...and 2 more                        ║
║                                      ║
║ Run `npx expo install --fix` to      ║
║ resolve version conflicts.           ║
║                                      ║
║ [  Dismiss  ]                        ║
╚══════════════════════════════════════╝
```
**Colors:**
- Background: #F59E0B (Orange)
- Text: #FFFFFF (White)
- Package info: Monospace font
- Button: Semi-transparent

## Banner Behavior

### Stacking
When multiple issues occur simultaneously:
1. Connectivity banner appears first (top-most, highest priority)
2. Permission banner appears below it
3. SDK warning appears below permission banner

They stack vertically without overlapping.

### Auto-Hide
- **Connectivity**: Hides when connection restored OR when dismissed
- **Permission**: Hides when permission granted (not dismissible, forces action)
- **SDK Warning**: Only hides when dismissed (user must acknowledge)

### Animations
- Slide down from top when appearing
- Fade out when hiding
- Smooth transitions (300ms duration)

## Responsive Design

### Phone (Portrait)
- Banners take full width
- Text wraps appropriately
- Buttons stack horizontally with wrapping if needed

### Tablet (Landscape)
- Banners center with max-width
- More horizontal space for buttons
- Same vertical stacking behavior

## Accessibility

### Text Size
- Title: 16px, bold
- Message: 14px, regular
- Package info: 12px, monospace

### Touch Targets
- Buttons: Minimum 44x44pt (iOS) / 48x48dp (Android)
- Adequate spacing between buttons (8px gap)

### Screen Reader Support
- Banners announce when appearing
- Clear button labels
- Semantic HTML structure

## Integration with App Theme

All banners respect the app's dark theme:
- Background colors are prominent for visibility
- White text for maximum contrast
- Green primary buttons match app theme
- Consistent padding and spacing

## Example Scenarios

### Scenario A: Fresh Install
```
User opens app for first time
  ↓
Permission Banner appears (📍)
  ↓
User grants permission
  ↓
Banner disappears
  ↓
Normal app operation
```

### Scenario B: Offline User
```
User loses internet connection
  ↓
Connectivity Banner appears (🔌)
  ↓
User clicks "Retry" multiple times
  ↓
Banner shows VPN hint + Tunnel option
  ↓
User clicks "Tunnel Info"
  ↓
Browser opens with Expo docs
  ↓
User follows tunnel setup
  ↓
Connection restored
  ↓
Banner disappears
```

### Scenario C: Version Drift
```
Developer updates Expo SDK
  ↓
Some packages not updated
  ↓
App starts, SDK check runs
  ↓
Warning Banner appears (⚠️)
  ↓
Developer sees incompatible packages
  ↓
Runs `npx expo install --fix`
  ↓
Restarts app
  ↓
No warning banner
```
