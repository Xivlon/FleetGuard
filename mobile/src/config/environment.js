// src/config/environment.js

// Replace YOUR_LOCAL_IP with your computer's actual local IP address
// Examples: '192.168.1.100', '10.0.0.5', etc.

const ENV = {
  production: {
    BACKEND_URL: 'https://fleetguard.onrender.com',
  }
};

const getEnvVars = (env = null) => {
  if (__DEV__) {
    return ENV.development;
  }
  return ENV.production;
};

export default getEnvVars();
