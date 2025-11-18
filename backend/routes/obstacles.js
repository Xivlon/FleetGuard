const express = require('express');
const { Op } = require('sequelize');
const { body, query, validationResult } = require('express-validator');
const { Obstacle, User } = require('../models');
const { authenticate, authorize } = require('../utils/auth');
const logger = require('../utils/logger');
const { broadcastObstacleAdded, broadcastObstacleUpdated, broadcastObstacleResolved, checkObstacleOnRoutes } = require('../services/obstacleService');

const router = express.Router();

/**
 * GET /api/obstacles
 * Get all active obstacles
 */
router.get('/',
  authenticate,
  [
    query('status').optional().isIn(['active', 'resolved', 'expired']),
    query('type').optional().isString(),
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('radius').optional().isFloat(),
    query('latitude').optional().isFloat(),
    query('longitude').optional().isFloat()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const where = {};

      // Filter by status
      if (req.query.status) {
        where.status = req.query.status;
      } else {
        where.status = 'active';
      }

      // Filter by type
      if (req.query.type) {
        where.type = req.query.type;
      }

      // Filter by severity
      if (req.query.severity) {
        where.severity = req.query.severity;
      }

      // Get obstacles in radius
      let obstacles = await Obstacle.findAll({
        where,
        include: [{
          model: User,
          as: 'reporter',
          attributes: ['id', 'firstName', 'lastName']
        }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(req.query.limit) || 100
      });

      // Filter by location if provided
      if (req.query.latitude && req.query.longitude) {
        const userLat = parseFloat(req.query.latitude);
        const userLon = parseFloat(req.query.longitude);
        const searchRadius = parseFloat(req.query.radius) || 5000; // 5km default

        obstacles = obstacles.filter(obstacle => {
          const distance = calculateDistance(
            { latitude: userLat, longitude: userLon },
            obstacle.location
          );
          return distance <= searchRadius;
        });
      }

      res.json({ obstacles });
    } catch (error) {
      logger.error('Error fetching obstacles:', error);
      res.status(500).json({ error: 'Failed to fetch obstacles' });
    }
  }
);

/**
 * POST /api/obstacles
 * Report a new obstacle
 */
router.post('/',
  authenticate,
  [
    body('type').isIn(['accident', 'construction', 'road_closure', 'debris', 'weather', 'traffic_jam', 'other']),
    body('location').isObject(),
    body('location.latitude').isFloat({ min: -90, max: 90 }),
    body('location.longitude').isFloat({ min: -180, max: 180 }),
    body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('description').optional().isString(),
    body('radius').optional().isFloat({ min: 10, max: 5000 }),
    body('estimatedClearTime').optional().isISO8601(),
    body('trafficDelay').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const obstacle = await Obstacle.create({
        type: req.body.type,
        location: req.body.location,
        severity: req.body.severity || 'medium',
        description: req.body.description,
        radius: req.body.radius || 100,
        reportedBy: req.userId,
        estimatedClearTime: req.body.estimatedClearTime,
        trafficDelay: req.body.trafficDelay || 0,
        status: 'active'
      });

      // Include reporter info
      const obstacleWithReporter = await Obstacle.findByPk(obstacle.id, {
        include: [{
          model: User,
          as: 'reporter',
          attributes: ['id', 'firstName', 'lastName']
        }]
      });

      logger.info(`Obstacle reported: ${obstacle.type} at ${obstacle.location.latitude}, ${obstacle.location.longitude} by user ${req.userId}`);

      // Broadcast to all connected clients
      broadcastObstacleAdded(obstacleWithReporter);

      res.status(201).json({
        message: 'Obstacle reported successfully',
        obstacle: obstacleWithReporter
      });
    } catch (error) {
      logger.error('Error reporting obstacle:', error);
      res.status(500).json({ error: 'Failed to report obstacle' });
    }
  }
);

/**
 * POST /api/obstacles/:id/confirm
 * Confirm an obstacle report
 */
router.post('/:id/confirm',
  authenticate,
  async (req, res) => {
    try {
      const obstacle = await Obstacle.findByPk(req.params.id);

      if (!obstacle) {
        return res.status(404).json({ error: 'Obstacle not found' });
      }

      // Add user to confirmed list if not already there
      if (!obstacle.confirmedBy.includes(req.userId)) {
        await obstacle.update({
          confirmedBy: [...obstacle.confirmedBy, req.userId]
        });

        logger.info(`Obstacle ${obstacle.id} confirmed by user ${req.userId}`);
      }

      res.json({
        message: 'Obstacle confirmed',
        obstacle
      });
    } catch (error) {
      logger.error('Error confirming obstacle:', error);
      res.status(500).json({ error: 'Failed to confirm obstacle' });
    }
  }
);

/**
 * PUT /api/obstacles/:id/resolve
 * Mark obstacle as resolved
 */
router.put('/:id/resolve',
  authenticate,
  async (req, res) => {
    try {
      const obstacle = await Obstacle.findByPk(req.params.id);

      if (!obstacle) {
        return res.status(404).json({ error: 'Obstacle not found' });
      }

      // Only reporter, admins, or users who confirmed can resolve
      const canResolve =
        req.userId === obstacle.reportedBy ||
        req.user.role === 'admin' ||
        obstacle.confirmedBy.includes(req.userId);

      if (!canResolve) {
        return res.status(403).json({ error: 'Not authorized to resolve this obstacle' });
      }

      await obstacle.update({ status: 'resolved' });

      logger.info(`Obstacle ${obstacle.id} resolved by user ${req.userId}`);

      // Broadcast resolution
      broadcastObstacleResolved(obstacle.id);

      res.json({
        message: 'Obstacle resolved',
        obstacle
      });
    } catch (error) {
      logger.error('Error resolving obstacle:', error);
      res.status(500).json({ error: 'Failed to resolve obstacle' });
    }
  }
);

/**
 * DELETE /api/obstacles/:id
 * Delete obstacle (admin only)
 */
router.delete('/:id',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const obstacle = await Obstacle.findByPk(req.params.id);

      if (!obstacle) {
        return res.status(404).json({ error: 'Obstacle not found' });
      }

      await obstacle.destroy();

      logger.info(`Obstacle ${req.params.id} deleted by admin ${req.userId}`);

      res.json({ message: 'Obstacle deleted successfully' });
    } catch (error) {
      logger.error('Error deleting obstacle:', error);
      res.status(500).json({ error: 'Failed to delete obstacle' });
    }
  }
);

/**
 * Helper function to calculate distance between two points
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

module.exports = router;
