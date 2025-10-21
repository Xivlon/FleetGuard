const axios = require('axios');
const pino = require('pino');
const { v4: uuidv4 } = require('uuid');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    }
  }
});

const GRAPH_HOPPER_URL = 'https://graphhopper.com/api/1/route';
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 100;
const MAX_BACKOFF_MS = 2000;
const CACHE_TTL_MS = 30000; // 30 seconds
const CACHE_MAX_SIZE = 100;

// Simple LRU cache implementation
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    const entry = this.cache.get(key);
    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key, data) {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
  }
}

const routeCache = new LRUCache(CACHE_MAX_SIZE);

/**
 * Mask API key for logging
 * @param {string} key - API key to mask
 * @returns {string} Masked key showing only first 4 and last 4 characters
 */
function maskApiKey(key) {
  if (!key || key.length < 8) {
    return '****';
  }
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}

/**
 * Generate cache key from route parameters
 */
function getCacheKey(start, end, profile) {
  return `${start.latitude.toFixed(6)},${start.longitude.toFixed(6)}->${end.latitude.toFixed(6)},${end.longitude.toFixed(6)}:${profile}`;
}

/**
 * Calculate exponential backoff with jitter
 */
function getBackoffDelay(attempt) {
  const exponentialDelay = Math.min(BASE_BACKOFF_MS * Math.pow(2, attempt), MAX_BACKOFF_MS);
  const jitter = Math.random() * exponentialDelay * 0.3; // 30% jitter
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Build GraphHopper URL parameters
 */
function buildGraphHopperParams(start, end, apiKey, options = {}) {
  const {
    instructions = true,
    profile = 'car',
    chDisable = false,
    swapCoords = false
  } = options;

  const params = new URLSearchParams();
  
  const startLat = swapCoords ? start.longitude : start.latitude;
  const startLon = swapCoords ? start.latitude : start.longitude;
  const endLat = swapCoords ? end.longitude : end.latitude;
  const endLon = swapCoords ? end.latitude : end.longitude;
  
  params.append('point', `${startLat},${startLon}`);
  params.append('point', `${endLat},${endLon}`);
  params.set('profile', profile);
  params.set('points_encoded', 'false');
  params.set('instructions', instructions ? 'true' : 'false');
  params.set('locale', 'en');
  
  if (chDisable) {
    params.set('ch.disable', 'true');
  }
  
  params.set('key', apiKey);
  return params;
}

/**
 * Nudge coordinates slightly (8-neighborhood, ~50m)
 * Helps snap off water/parking lots
 */
function nudgeOrigin(coords, nudgeIndex) {
  const NUDGE_DEG = 0.00045; // ~50 meters
  const nudges = [
    { lat: 0, lon: 0 },           // 0: no nudge (original)
    { lat: NUDGE_DEG, lon: 0 },    // 1: north
    { lat: 0, lon: NUDGE_DEG },    // 2: east
    { lat: -NUDGE_DEG, lon: 0 },   // 3: south
    { lat: 0, lon: -NUDGE_DEG },   // 4: west
    { lat: NUDGE_DEG, lon: NUDGE_DEG },   // 5: northeast
    { lat: NUDGE_DEG, lon: -NUDGE_DEG },  // 6: northwest
    { lat: -NUDGE_DEG, lon: NUDGE_DEG },  // 7: southeast
    { lat: -NUDGE_DEG, lon: -NUDGE_DEG }, // 8: southwest
  ];
  
  const nudge = nudges[nudgeIndex % nudges.length];
  return {
    latitude: coords.latitude + nudge.lat,
    longitude: coords.longitude + nudge.lon
  };
}

/**
 * Retry chain strategy
 * 0: normal
 * 1: swap lat/lon detection
 * 2: ch.disable=true
 * 3: ch.disable + swap
 * 4+: origin nudge attempts
 */
function getRetryStrategy(attempt) {
  if (attempt === 0) {
    return { swapCoords: false, chDisable: false, nudge: 0 };
  } else if (attempt === 1) {
    return { swapCoords: true, chDisable: false, nudge: 0 };
  } else if (attempt === 2) {
    return { swapCoords: false, chDisable: true, nudge: 0 };
  } else if (attempt === 3) {
    return { swapCoords: true, chDisable: true, nudge: 0 };
  } else {
    // Attempts 4+ do origin nudging
    return { swapCoords: false, chDisable: true, nudge: attempt - 3 };
  }
}

/**
 * Make a single GraphHopper API request
 */
async function makeGraphHopperRequest(start, end, apiKey, requestId, attempt, strategy, profile) {
  const { swapCoords, chDisable, nudge } = strategy;
  
  const adjustedStart = nudge > 0 ? nudgeOrigin(start, nudge) : start;
  const params = buildGraphHopperParams(adjustedStart, end, apiKey, {
    instructions: true,
    profile,
    chDisable,
    swapCoords
  });
  
  const urlWithoutKey = `${GRAPH_HOPPER_URL}?${params.toString().replace(/key=[^&]+/, 'key=***')}`;
  
  logger.info({
    requestId,
    attempt,
    strategy: { swapCoords, chDisable, nudge },
    url: urlWithoutKey,
    maskedKey: maskApiKey(apiKey)
  }, 'GraphHopper request');
  
  const response = await axios.get(`${GRAPH_HOPPER_URL}?${params.toString()}`, {
    timeout: 10000,
    validateStatus: (status) => status < 500 // Don't throw on 4xx
  });
  
  return response;
}

/**
 * Calculate route with retry logic, caching, and structured logging
 * @param {Object} start - {latitude, longitude}
 * @param {Object} end - {latitude, longitude}
 * @param {string} apiKey - GraphHopper API key
 * @param {Object} options - {profile, instructions}
 * @returns {Promise<Object>} Route data from GraphHopper
 */
async function calculateRoute(start, end, apiKey, options = {}) {
  const { profile = 'car' } = options;
  const requestId = uuidv4();
  
  logger.info({
    requestId,
    start: { lat: start.latitude.toFixed(6), lon: start.longitude.toFixed(6) },
    end: { lat: end.latitude.toFixed(6), lon: end.longitude.toFixed(6) },
    profile,
    maskedKey: maskApiKey(apiKey)
  }, 'Route calculation started');
  
  // Check cache
  const cacheKey = getCacheKey(start, end, profile);
  const cached = routeCache.get(cacheKey);
  if (cached) {
    logger.info({ requestId, cacheKey }, 'Cache hit');
    return cached;
  }
  
  let lastError = null;
  let retryAfterMs = 0;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Wait for backoff/retry-after if needed
      if (attempt > 0) {
        const delay = Math.max(retryAfterMs, getBackoffDelay(attempt - 1));
        logger.info({ requestId, attempt, delayMs: delay }, 'Retrying after delay');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const strategy = getRetryStrategy(attempt);
      const response = await makeGraphHopperRequest(start, end, apiKey, requestId, attempt, strategy, profile);
      
      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfterHeader = response.headers['retry-after'];
        retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader) * 1000 : getBackoffDelay(attempt);
        
        logger.warn({
          requestId,
          attempt,
          status: 429,
          retryAfterMs,
          retryAfterHeader
        }, 'Rate limited by GraphHopper');
        
        lastError = new Error(`Rate limited (429). Retry after ${retryAfterMs}ms`);
        continue;
      }
      
      // Handle other 4xx errors
      if (response.status >= 400 && response.status < 500) {
        const errorMsg = response.data?.message || response.data?.error || `HTTP ${response.status}`;
        logger.error({
          requestId,
          attempt,
          status: response.status,
          error: errorMsg,
          strategy
        }, 'GraphHopper client error');
        
        lastError = new Error(`GraphHopper error: ${errorMsg}`);
        
        // Don't retry on 401/403 (bad API key)
        if (response.status === 401 || response.status === 403) {
          throw lastError;
        }
        
        continue;
      }
      
      // Success!
      if (response.status === 200 && response.data?.paths?.[0]) {
        logger.info({
          requestId,
          attempt,
          strategy,
          points: response.data.paths[0].points?.coordinates?.length || 0,
          distance: response.data.paths[0].distance,
          duration: response.data.paths[0].time
        }, 'GraphHopper request successful');
        
        // Cache the result
        routeCache.set(cacheKey, response.data);
        
        return response.data;
      }
      
      // Unexpected response format
      lastError = new Error('Invalid response format from GraphHopper');
      logger.warn({
        requestId,
        attempt,
        status: response.status,
        hasData: !!response.data,
        hasPaths: !!response.data?.paths
      }, 'Unexpected GraphHopper response format');
      
    } catch (error) {
      lastError = error;
      
      // Log the error
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        logger.warn({ requestId, attempt, error: error.message }, 'Request timeout');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        logger.error({ requestId, attempt, error: error.message }, 'Network error');
      } else if (!error.response) {
        logger.error({ requestId, attempt, error: error.message }, 'Request failed');
      }
      
      // Don't retry on auth errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw error;
      }
    }
  }
  
  // All retries exhausted
  logger.error({
    requestId,
    attempts: MAX_RETRIES,
    lastError: lastError?.message
  }, 'All GraphHopper retries exhausted');
  
  throw lastError || new Error('Failed to calculate route after all retries');
}

/**
 * Test GraphHopper API reachability (for /readyz endpoint)
 */
async function testReachability(apiKey) {
  const requestId = uuidv4();
  
  try {
    logger.info({ requestId, maskedKey: maskApiKey(apiKey) }, 'Testing GraphHopper reachability');
    
    // Use a simple test route
    const testStart = { latitude: 37.7749, longitude: -122.4194 };
    const testEnd = { latitude: 37.7849, longitude: -122.4094 };
    
    const params = buildGraphHopperParams(testStart, testEnd, apiKey, {
      instructions: false,
      profile: 'car'
    });
    
    const response = await axios.get(`${GRAPH_HOPPER_URL}?${params.toString()}`, {
      timeout: 5000,
      validateStatus: (status) => status < 500
    });
    
    const reachable = response.status === 200 && !!response.data?.paths?.[0];
    
    logger.info({
      requestId,
      status: response.status,
      reachable
    }, 'Reachability test complete');
    
    return {
      reachable,
      status: response.status,
      message: reachable ? 'GraphHopper is reachable' : 'GraphHopper returned unexpected response'
    };
  } catch (error) {
    logger.error({
      requestId,
      error: error.message,
      code: error.code
    }, 'Reachability test failed');
    
    return {
      reachable: false,
      status: error.response?.status || 0,
      message: error.message
    };
  }
}

/**
 * Clear the route cache (useful for testing)
 */
function clearCache() {
  routeCache.clear();
  logger.info('Route cache cleared');
}

module.exports = {
  calculateRoute,
  testReachability,
  clearCache,
  maskApiKey
};
