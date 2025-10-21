// src/config/environment.js
// Use the hosted backend for both development and production so Expo (dev) connects over wss.

const DEVELOPMENT_BACKEND_URL = 'https://fleetguard.onrender.com';
const PRODUCTION_BACKEND_URL = 'https://fleetguard.onrender.com';

// Sentry DSN can be set via environment variable or app config
// Never hardcode the actual DSN in source code
const SENTRY_DSN = null; // Set this in app.json extra.sentryDsn or via env var

const ENV = {
  development: {
    BACKEND_URL: DEVELOPMENT_BACKEND_URL,
    SENTRY_DSN,
  },
  production: {
    BACKEND_URL: PRODUCTION_BACKEND_URL,
    SENTRY_DSN,
  },
};

const getEnvVars = (env = null) => {
  if (env === 'production') {
    return ENV.production;
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return ENV.development;
  }
  // default to production to ensure a valid BACKEND_URL in all environments
  return ENV.production;
};

export default getEnvVars();
