const axios = require('axios');
const { TrafficData } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const TRAFFIC_API_KEY = process.env.TRAFFIC_API_KEY;
const TRAFFIC_API_PROVIDER = process.env.TRAFFIC_API_PROVIDER || 'tomtom'; // tomtom, here, google
const TRAFFIC_CACHE_TTL = parseInt(process.env.TRAFFIC_CACHE_TTL) || 300; // 5 minutes

/**
 * Calculate congestion level based on speed ratio
 */
function calculateCongestionLevel(currentSpeed, speedLimit) {
  if (!speedLimit || speedLimit === 0) {
    return 'free_flow';
  }

  const ratio = currentSpeed / speedLimit;

  if (ratio >= 0.8) return 'free_flow';
  if (ratio >= 0.6) return 'light';
  if (ratio >= 0.4) return 'moderate';
  if (ratio >= 0.2) return 'heavy';
  return 'severe';
}

/**
 * Fetch traffic data from TomTom API
 */
async function fetchTomTomTraffic(coordinates) {
  if (!TRAFFIC_API_KEY) {
    throw new Error('TRAFFIC_API_KEY not configured');
  }

  const promises = [];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];

    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json`;

    promises.push(
      axios.get(url, {
        params: {
          key: TRAFFIC_API_KEY,
          point: `${start.latitude},${start.longitude}`,
          unit: 'KMPH'
        },
        timeout: 5000
      }).then(response => ({
        start,
        end,
        data: response.data
      })).catch(error => {
        logger.warn(`TomTom API error for segment ${i}:`, error.message);
        return null;
      })
    );
  }

  const results = await Promise.all(promises);
  return results.filter(r => r !== null);
}

/**
 * Fetch traffic data from HERE API
 */
async function fetchHERETraffic(coordinates) {
  if (!TRAFFIC_API_KEY) {
    throw new Error('TRAFFIC_API_KEY not configured');
  }

  const url = 'https://traffic.ls.hereapi.com/traffic/6.3/flow.json';

  const promises = coordinates.slice(0, -1).map((start, i) => {
    const end = coordinates[i + 1];

    return axios.get(url, {
      params: {
        apiKey: TRAFFIC_API_KEY,
        prox: `${start.latitude},${start.longitude},100`,
        responseattributes: 'sh,fc'
      },
      timeout: 5000
    }).then(response => ({
      start,
      end,
      data: response.data
    })).catch(error => {
      logger.warn(`HERE API error for segment ${i}:`, error.message);
      return null;
    });
  });

  const results = await Promise.all(promises);
  return results.filter(r => r !== null);
}

/**
 * Get traffic data for route
 */
async function getTrafficForRoute(coordinates) {
  try {
    const trafficData = [];

    // First, check cached data
    const segmentIds = coordinates.slice(0, -1).map((start, i) => {
      const end = coordinates[i + 1];
      return `${start.latitude.toFixed(4)}_${start.longitude.toFixed(4)}_${end.latitude.toFixed(4)}_${end.longitude.toFixed(4)}`;
    });

    const cachedData = await TrafficData.findAll({
      where: {
        segmentId: { [Op.in]: segmentIds },
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    const cachedMap = new Map(cachedData.map(d => [d.segmentId, d]));

    // Return cached data if available for all segments
    if (cachedMap.size === segmentIds.length) {
      logger.info(`Using cached traffic data for ${segmentIds.length} segments`);
      return cachedData.map(d => d.toJSON());
    }

    // Fetch fresh data from API
    let apiResults;

    if (TRAFFIC_API_PROVIDER === 'tomtom' && TRAFFIC_API_KEY) {
      apiResults = await fetchTomTomTraffic(coordinates);
    } else if (TRAFFIC_API_PROVIDER === 'here' && TRAFFIC_API_KEY) {
      apiResults = await fetchHERETraffic(coordinates);
    } else {
      // Use user-generated traffic data
      logger.info('No traffic API configured, using calculated traffic data');
      return calculateTrafficFromUserData(coordinates);
    }

    // Process and cache results
    for (let i = 0; i < apiResults.length; i++) {
      const result = apiResults[i];
      if (!result) continue;

      const segmentId = segmentIds[i];
      const { start, end, data } = result;

      let currentSpeed, speedLimit, congestionLevel;

      if (TRAFFIC_API_PROVIDER === 'tomtom') {
        currentSpeed = data.flowSegmentData?.currentSpeed || 50;
        speedLimit = data.flowSegmentData?.freeFlowSpeed || 60;
        congestionLevel = calculateCongestionLevel(currentSpeed, speedLimit);
      } else if (TRAFFIC_API_PROVIDER === 'here') {
        const flow = data.RWS?.[0]?.RW?.[0]?.FIS?.[0]?.FI?.[0];
        currentSpeed = flow?.CF?.[0]?.SP || 50;
        speedLimit = flow?.CF?.[0]?.FF || 60;
        congestionLevel = calculateCongestionLevel(currentSpeed, speedLimit);
      }

      const trafficRecord = {
        segmentId,
        startLocation: start,
        endLocation: end,
        currentSpeed,
        speedLimit,
        congestionLevel,
        delay: Math.max(0, Math.round((1 / currentSpeed - 1 / speedLimit) * 3600)),
        source: 'api',
        confidence: 0.9,
        sampleSize: 1,
        expiresAt: new Date(Date.now() + TRAFFIC_CACHE_TTL * 1000)
      };

      // Cache in database
      await TrafficData.upsert(trafficRecord);
      trafficData.push(trafficRecord);
    }

    logger.info(`Fetched traffic data for ${trafficData.length} segments from ${TRAFFIC_API_PROVIDER}`);
    return trafficData;

  } catch (error) {
    logger.error('Error fetching traffic data:', error);
    // Fallback to calculated data
    return calculateTrafficFromUserData(coordinates);
  }
}

/**
 * Calculate traffic from user-reported data
 */
async function calculateTrafficFromUserData(coordinates) {
  const trafficData = [];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];
    const segmentId = `${start.latitude.toFixed(4)}_${start.longitude.toFixed(4)}_${end.latitude.toFixed(4)}_${end.longitude.toFixed(4)}`;

    // Check if we have recent data from this segment
    const existing = await TrafficData.findOne({
      where: {
        segmentId,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (existing) {
      trafficData.push(existing.toJSON());
    } else {
      // Default to free flow
      trafficData.push({
        segmentId,
        startLocation: start,
        endLocation: end,
        currentSpeed: 50,
        speedLimit: 60,
        congestionLevel: 'free_flow',
        delay: 0,
        source: 'calculated',
        confidence: 0.3,
        sampleSize: 0,
        expiresAt: new Date(Date.now() + TRAFFIC_CACHE_TTL * 1000)
      });
    }
  }

  return trafficData;
}

/**
 * Update traffic data from user vehicle speed
 */
async function updateTrafficFromVehicle(vehicleId, location, speed) {
  try {
    // This would typically be called when receiving position updates
    // We can aggregate this data to improve traffic estimates
    logger.debug(`Vehicle ${vehicleId} speed: ${speed} km/h at ${location.latitude}, ${location.longitude}`);

    // Implementation would involve:
    // 1. Matching vehicle location to known road segments
    // 2. Updating average speed for that segment
    // 3. Recalculating congestion level

  } catch (error) {
    logger.error('Error updating traffic from vehicle:', error);
  }
}

/**
 * Clean up expired traffic data
 */
async function cleanExpiredTrafficData() {
  try {
    const deleted = await TrafficData.destroy({
      where: {
        expiresAt: { [Op.lt]: new Date() }
      }
    });

    if (deleted > 0) {
      logger.info(`Cleaned ${deleted} expired traffic data records`);
    }
  } catch (error) {
    logger.error('Error cleaning traffic data:', error);
  }
}

// Run cleanup every 10 minutes
setInterval(cleanExpiredTrafficData, 10 * 60 * 1000);

module.exports = {
  getTrafficForRoute,
  updateTrafficFromVehicle,
  calculateCongestionLevel,
  cleanExpiredTrafficData
};
