# Sentry Configuration Guide

This document describes how to configure Sentry telemetry for the FleetNav mobile app.

## Overview

FleetNav supports optional Sentry integration for crash reporting and error tracking. The Sentry DSN (Data Source Name) must be provided via configuration - it should never be hardcoded in the source code.

## Configuration

### Option 1: Using app.json (Recommended for development)

Edit `mobile/app.json` and set the `extra.sentryDsn` field:

```json
{
  "expo": {
    ...
    "extra": {
      "sentryDsn": "https://your-sentry-dsn@sentry.io/your-project-id"
    }
  }
}
```

### Option 2: Using environment variables

Set the `SENTRY_DSN` environment variable before building the app:

```bash
export SENTRY_DSN="https://your-sentry-dsn@sentry.io/your-project-id"
```

## Sentry Features Enabled

When configured, Sentry provides:

- **Crash reporting**: Automatic capture of unhandled exceptions
- **Error tracking**: Manual error reporting with `captureException()`
- **Performance monitoring**: Trace sampling for performance insights
- **Breadcrumbs**: Navigation and user action tracking
- **Development sampling**: Higher sample rates in dev mode (100%) vs production (50%)

## Sample Rates

| Environment | Error Sample Rate | Trace Sample Rate |
|-------------|-------------------|-------------------|
| Development | 100%              | 100%              |
| Production  | 50%               | 20%               |

## Usage

### Automatic Capture

Sentry is initialized automatically on app startup. Unhandled exceptions and crashes are captured automatically.

### Manual Capture

Use the helper functions from `src/utils/sentry.js`:

```javascript
import { captureException, captureMessage } from './src/utils/sentry';

// Capture an exception with context
try {
  // some code
} catch (error) {
  captureException(error, {
    userId: 'user-123',
    action: 'fetch-data',
  });
}

// Capture a message
captureMessage('User completed onboarding', 'info');
```

## Privacy & Security

- **No secrets in code**: The DSN is never hardcoded
- **Data filtering**: Sensitive data (cookies, headers) is automatically removed
- **Local development**: Errors are logged to console in development mode

## Testing Sentry Integration

To test that Sentry is working:

1. Configure a test DSN in `app.json`
2. Start the app: `npm start`
3. Look for the log message: `[Sentry] Initialized in development mode`
4. Trigger a test error and verify it appears in your Sentry dashboard

## Disabling Sentry

To disable Sentry, simply set `extra.sentryDsn` to `null` in `app.json` or remove the environment variable.

```json
{
  "expo": {
    ...
    "extra": {
      "sentryDsn": null
    }
  }
}
```

When disabled, you'll see: `[Sentry] No DSN configured, skipping initialization`
