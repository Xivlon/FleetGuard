/**
 * Sentry Configuration
 * Initializes Sentry with DSN from app config (extra field)
 * No secrets should be hardcoded here
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

/**
 * Initialize Sentry if DSN is provided in app config
 */
export function initSentry() {
  try {
    // Get Sentry DSN from app.json extra config
    const sentryDsn = Constants.expoConfig?.extra?.sentryDsn;
    
    if (!sentryDsn) {
      console.log('[Sentry] No DSN configured, skipping initialization');
      return;
    }
    
    // Determine if we're in development
    const isDevelopment = __DEV__;
    
    Sentry.init({
      dsn: sentryDsn,
      enableInExpoDevelopment: true, // Enable in Expo dev mode
      debug: isDevelopment, // Enable debug logging in dev
      environment: isDevelopment ? 'development' : 'production',
      
      // Sample rate - use higher sampling in dev for testing
      sampleRate: isDevelopment ? 1.0 : 0.5,
      
      // Trace sample rate for performance monitoring
      tracesSampleRate: isDevelopment ? 1.0 : 0.2,
      
      // Attach stack traces to all messages
      attachStacktrace: true,
      
      // Auto-instrument navigation
      enableAutoSessionTracking: true,
      
      // Breadcrumbs for debugging
      maxBreadcrumbs: 50,
      
      // Filter sensitive data
      beforeSend(event) {
        // Remove any potential sensitive data from events
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        if (event.request?.headers) {
          delete event.request.headers;
        }
        return event;
      },
    });
    
    console.log(`[Sentry] Initialized in ${isDevelopment ? 'development' : 'production'} mode`);
  } catch (error) {
    console.error('[Sentry] Initialization failed:', error);
  }
}

/**
 * Helper to manually capture exceptions
 * @param {Error} error - The error to capture
 * @param {Object} context - Additional context
 */
export function captureException(error, context = {}) {
  if (__DEV__) {
    console.error('[Error]', error, context);
  }
  
  try {
    Sentry.withScope((scope) => {
      Object.keys(context).forEach((key) => {
        scope.setExtra(key, context[key]);
      });
      Sentry.captureException(error);
    });
  } catch (e) {
    console.error('[Sentry] Failed to capture exception:', e);
  }
}

/**
 * Helper to capture messages/events
 * @param {string} message - The message to capture
 * @param {string} level - Severity level (info, warning, error)
 */
export function captureMessage(message, level = 'info') {
  if (__DEV__) {
    console.log(`[${level.toUpperCase()}]`, message);
  }
  
  try {
    Sentry.captureMessage(message, level);
  } catch (e) {
    console.error('[Sentry] Failed to capture message:', e);
  }
}
