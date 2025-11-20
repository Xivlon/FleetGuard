/**
 * Sentry Configuration
 * Initializes Sentry with DSN from app config (extra field)
 * No secrets should be hardcoded here
 * 
 * Note: Sentry native SDK requires a custom development build.
 * When running in Expo Go, Sentry will be disabled.
 */

import Constants from 'expo-constants';

// Dynamically import Sentry only if available (not in Expo Go)
let Sentry = null;
let sentryAvailable = false;

try {
  Sentry = require('@sentry/react-native');
  sentryAvailable = true;
} catch (e) {
  console.log('[Sentry] Native SDK not available (running in Expo Go). Sentry is disabled.');
}

/**
 * Validate Sentry DSN format
 * @param {string} dsn - The DSN to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidDsn(dsn) {
  if (!dsn || typeof dsn !== 'string') {
    return false;
  }
  
  // Check if DSN has the required protocol (https:// or http://)
  if (!dsn.startsWith('https://') && !dsn.startsWith('http://')) {
    return false;
  }
  
  // Basic format validation: protocol://public_key@domain/project_id
  const dsnPattern = /^https?:\/\/[^@]+@[^/]+\/\d+$/;
  return dsnPattern.test(dsn);
}

/**
 * Initialize Sentry if DSN is provided in app config and native SDK is available
 */
export function initSentry() {
  try {
    // Skip if Sentry is not available (Expo Go)
    if (!sentryAvailable || !Sentry) {
      console.log('[Sentry] Skipping initialization - native SDK not available');
      return;
    }

    // Get Sentry DSN from app.json extra config
    const sentryDsn = Constants.expoConfig?.extra?.sentryDsn;
    
    // Validate DSN is provided and not null
    if (!sentryDsn || sentryDsn === null) {
      console.log('[Sentry] No DSN configured, skipping initialization');
      return;
    }
    
    // Validate DSN format
    if (!isValidDsn(sentryDsn)) {
      console.log('[Sentry] Invalid DSN format, skipping initialization. DSN must start with https:// or http://');
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
  
  // Skip if Sentry is not available
  if (!sentryAvailable || !Sentry) {
    return;
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
  
  // Skip if Sentry is not available
  if (!sentryAvailable || !Sentry) {
    return;
  }
  
  try {
    Sentry.captureMessage(message, level);
  } catch (e) {
    console.error('[Sentry] Failed to capture message:', e);
  }
}
