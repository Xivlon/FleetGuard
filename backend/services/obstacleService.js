const { Obstacle } = require('../models');
const logger = require('../utils/logger');

let broadcastFunction = null;

/**
 * Set the broadcast function for WebSocket
 */
function setBroadcastFunction(fn) {
  broadcastFunction = fn;
}

/**
 * Broadcast obstacle to all connected clients
 */
function broadcastObstacle(type, obstacle) {
  if (broadcastFunction) {
    broadcastFunction({
      type,
      obstacle: obstacle.toJSON ? obstacle.toJSON() : obstacle
    });
  }
}

/**
 * Broadcast obstacle added event
 */
function broadcastObstacleAdded(obstacle) {
  broadcastObstacle('OBSTACLE_ADDED', obstacle);
  logger.info(`Obstacle added broadcast: ${obstacle.id}`);
}

/**
 * Broadcast obstacle updated event
 */
function broadcastObstacleUpdated(obstacle) {
  broadcastObstacle('OBSTACLE_UPDATED', obstacle);
  logger.info(`Obstacle updated broadcast: ${obstacle.id}`);
}

/**
 * Broadcast obstacle resolved event
 */
function broadcastObstacleResolved(obstacleId) {
  if (broadcastFunction) {
    broadcastFunction({
      type: 'OBSTACLE_RESOLVED',
      obstacleId
    });
  }
  logger.info(`Obstacle resolved broadcast: ${obstacleId}`);
}

/**
 * Check if obstacle is on route and send alerts
 */
async function checkObstacleOnRoutes(obstacle, activeRoutes) {
  const affectedVehicles = [];

  activeRoutes.forEach((route, vehicleId) => {
    if (!route.coordinates) return;

    const isOnRoute = route.coordinates.some(coord => {
      const distance = calculateDistance(coord, obstacle.location);
      return distance <= obstacle.radius;
    });

    if (isOnRoute) {
      affectedVehicles.push(vehicleId);
    }
  });

  if (affectedVehicles.length > 0) {
    // Update obstacle's affected routes count
    await obstacle.update({
      affectedRoutes: affectedVehicles.length
    });

    // Broadcast alert for affected vehicles
    if (broadcastFunction) {
      broadcastFunction({
        type: 'OBSTACLE_ROUTE_ALERT',
        obstacle: obstacle.toJSON(),
        affectedVehicles
      });
    }

    logger.info(`Obstacle ${obstacle.id} affects ${affectedVehicles.length} active routes`);
  }

  return affectedVehicles;
}

/**
 * Calculate distance between two points in meters
 */
function calculateDistance(point1, point2) {
  const R = 6371000; // Earth radius in meters
  const lat1 = point1.latitude * Math.PI / 180;
  const lat2 = point2.latitude * Math.PI / 180;
  const deltaLat = (point2.latitude - point1.latitude) * Math.PI / 180;
  const deltaLon = (point2.longitude - point1.longitude) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Auto-expire old obstacles
 */
async function expireOldObstacles() {
  try {
    const expirationTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

    const expired = await Obstacle.update(
      { status: 'expired' },
      {
        where: {
          status: 'active',
          createdAt: { [require('sequelize').Op.lt]: expirationTime }
        }
      }
    );

    if (expired[0] > 0) {
      logger.info(`Auto-expired ${expired[0]} old obstacles`);
    }
  } catch (error) {
    logger.error('Error expiring old obstacles:', error);
  }
}

// Run expiration check every hour
setInterval(expireOldObstacles, 60 * 60 * 1000);

module.exports = {
  setBroadcastFunction,
  broadcastObstacleAdded,
  broadcastObstacleUpdated,
  broadcastObstacleResolved,
  checkObstacleOnRoutes,
  expireOldObstacles
};
