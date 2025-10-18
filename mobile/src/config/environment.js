// src/config/environment.js
// Use the hosted backend for both development and production so Expo (dev) can connect.
// If you need to use a local backend instead, edit the DEVELOPMENT_BACKEND_URL constant below.

const DEVELOPMENT_BACKEND_URL = 'https://fleetguard.onrender.com';
const PRODUCTION_BACKEND_URL = 'https://fleetguard.onrender.com';

const ENV = {
  development: {
    BACKEND_URL: DEVELOPMENT_BACKEND_URL,
  },
  production: {
    BACKEND_URL: PRODUCTION_BACKEND_URL,
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
