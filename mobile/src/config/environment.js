// src/config/environment.js

// Replace YOUR_LOCAL_IP with your computer's actual local IP address
// Examples: '192.168.1.100', '10.0.0.5', etc.

const ENV = {
  development: {
    BACKEND_URL: 'http://172.16.6.175:5000', // ← REPLACE WITH YOUR IP
  },
  production: {
    BACKEND_URL: 'https://your-production-url.com',
  }
};

const getEnvVars = (env = null) => {
  if (__DEV__) {
    return ENV.development;
  }
  return ENV.production;
};

export default getEnvVars();
