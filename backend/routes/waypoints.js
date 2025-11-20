const express = require('express');
const { Op } = require('sequelize');
const { body, query, validationResult } = require('express-validator');
const { Waypoint, User } = require('../models');
const { authenticate, authorize } = require('../utils/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/waypoints
 * Get all public waypoints
 */
router.get('/',
  authenticate,
  [
    query('type').optional().isIn(['water_source', 'camp', 'viewpoint', 'danger']),
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

      const where = { isPublic: true };

      // Filter by type
      if (req.query.type) {
        where.type = req.query.type;
      }

      // Get waypoints
      let waypoints = await Waypoint.findAll({
        where,
        include: [{
          model: User,
          as: 'reporter',
          attributes: ['id', 'firstName', 'lastName']
        }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(req.query.limit) || 500
      });

      // Filter by location if provided
      if (req.query.latitude && req.query.longitude) {
        const userLat = parseFloat(req.query.latitude);
        const userLon = parseFloat(req.query.longitude);
        const searchRadius = parseFloat(req.query.radius) || 10000; // 10km default

        waypoints = waypoints.filter(waypoint => {
          const distance = calculateDistance(
            { latitude: userLat, longitude: userLon },
            waypoint.location
          );
          return distance <= searchRadius;
        });
      }

      res.json({ waypoints });
    } catch (error) {
      logger.error('Error fetching waypoints:', error);
      res.status(500).json({ error: 'Failed to fetch waypoints' });
    }
  }
);

/**
 * POST /api/waypoints
 * Create a new waypoint
 */
router.post('/',
  authenticate,
  [
    body('type').isIn(['water_source', 'camp', 'viewpoint', 'danger']),
    body('location').isObject(),
    body('location.latitude').isFloat({ min: -90, max: 90 }),
    body('location.longitude').isFloat({ min: -180, max: 180 }),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('notificationRadius').optional().isFloat({ min: 50, max: 5000 }),
    body('isPublic').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const waypoint = await Waypoint.create({
        type: req.body.type,
        location: req.body.location,
        name: req.body.name,
        description: req.body.description,
        notificationRadius: req.body.notificationRadius || 500,
        isPublic: req.body.isPublic !== undefined ? req.body.isPublic : true,
        reportedBy: req.userId,
        metadata: req.body.metadata || {}
      });

      // Include reporter info
      const waypointWithReporter = await Waypoint.findByPk(waypoint.id, {
        include: [{
          model: User,
          as: 'reporter',
          attributes: ['id', 'firstName', 'lastName']
        }]
      });

      logger.info(`Waypoint created: ${waypoint.type} at ${waypoint.location.latitude}, ${waypoint.location.longitude} by user ${req.userId}`);

      // Broadcast to WebSocket clients
      const io = req.app.get('io');
      if (io) {
        io.emit('WAYPOINT_ADDED', waypointWithReporter);
      }

      res.status(201).json({
        message: 'Waypoint created successfully',
        waypoint: waypointWithReporter
      });
    } catch (error) {
      logger.error('Error creating waypoint:', error);
      res.status(500).json({ error: 'Failed to create waypoint' });
    }
  }
);

/**
 * PUT /api/waypoints/:id
 * Update a waypoint (only creator can update)
 */
router.put('/:id',
  authenticate,
  [
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('notificationRadius').optional().isFloat({ min: 50, max: 5000 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const waypoint = await Waypoint.findByPk(req.params.id);

      if (!waypoint) {
        return res.status(404).json({ error: 'Waypoint not found' });
      }

      // Only creator or admin can update
      if (waypoint.reportedBy !== req.userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to update this waypoint' });
      }

      const updates = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.notificationRadius !== undefined) updates.notificationRadius = req.body.notificationRadius;

      await waypoint.update(updates);

      // Include reporter info
      const waypointWithReporter = await Waypoint.findByPk(waypoint.id, {
        include: [{
          model: User,
          as: 'reporter',
          attributes: ['id', 'firstName', 'lastName']
        }]
      });

      logger.info(`Waypoint ${waypoint.id} updated by user ${req.userId}`);

      // Broadcast to WebSocket clients
      const io = req.app.get('io');
      if (io) {
        io.emit('WAYPOINT_UPDATED', waypointWithReporter);
      }

      res.json({
        message: 'Waypoint updated',
        waypoint: waypointWithReporter
      });
    } catch (error) {
      logger.error('Error updating waypoint:', error);
      res.status(500).json({ error: 'Failed to update waypoint' });
    }
  }
);

/**
 * DELETE /api/waypoints/:id
 * Delete waypoint (creator or admin)
 */
router.delete('/:id',
  authenticate,
  async (req, res) => {
    try {
      const waypoint = await Waypoint.findByPk(req.params.id);

      if (!waypoint) {
        return res.status(404).json({ error: 'Waypoint not found' });
      }

      // Only creator or admin can delete
      if (waypoint.reportedBy !== req.userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to delete this waypoint' });
      }

      await waypoint.destroy();

      logger.info(`Waypoint ${req.params.id} deleted by user ${req.userId}`);

      // Broadcast to WebSocket clients
      const io = req.app.get('io');
      if (io) {
        io.emit('WAYPOINT_REMOVED', { id: req.params.id });
      }

      res.json({ message: 'Waypoint deleted successfully' });
    } catch (error) {
      logger.error('Error deleting waypoint:', error);
      res.status(500).json({ error: 'Failed to delete waypoint' });
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
