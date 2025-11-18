const express = require('express');
const { Op } = require('sequelize');
const { body, query, validationResult } = require('express-validator');
const { Trip, User } = require('../models');
const { authenticate, authorize } = require('../utils/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/trips
 * Start a new trip
 */
router.post('/',
  authenticate,
  [
    body('vehicleId').isUUID(),
    body('startLocation').isObject(),
    body('startLocation.latitude').isFloat({ min: -90, max: 90 }),
    body('startLocation.longitude').isFloat({ min: -180, max: 180 }),
    body('endLocation').isObject(),
    body('endLocation.latitude').isFloat({ min: -90, max: 90 }),
    body('endLocation.longitude').isFloat({ min: -180, max: 180 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const trip = await Trip.create({
        userId: req.userId,
        ...req.body,
        status: 'in_progress',
        startTime: new Date()
      });

      logger.info(`Trip started: ${trip.id} by user ${req.userId}`);

      res.status(201).json({
        message: 'Trip started successfully',
        trip
      });
    } catch (error) {
      logger.error('Error starting trip:', error);
      res.status(500).json({ error: 'Failed to start trip' });
    }
  }
);

/**
 * PUT /api/trips/:id/complete
 * Complete a trip
 */
router.put('/:id/complete',
  authenticate,
  [
    body('actualPath').optional().isArray(),
    body('distance').optional().isFloat(),
    body('metrics').optional().isObject()
  ],
  async (req, res) => {
    try {
      const trip = await Trip.findByPk(req.params.id);

      if (!trip) {
        return res.status(404).json({ error: 'Trip not found' });
      }

      if (trip.userId !== req.userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (trip.status !== 'in_progress') {
        return res.status(400).json({ error: 'Trip is not in progress' });
      }

      const endTime = new Date();
      const duration = Math.floor((endTime - new Date(trip.startTime)) / 1000);

      await trip.update({
        status: 'completed',
        endTime,
        duration,
        ...(req.body.actualPath && { actualPath: req.body.actualPath }),
        ...(req.body.distance && { distance: req.body.distance }),
        ...(req.body.metrics && { metrics: req.body.metrics })
      });

      logger.info(`Trip completed: ${trip.id}`);

      res.json({
        message: 'Trip completed successfully',
        trip
      });
    } catch (error) {
      logger.error('Error completing trip:', error);
      res.status(500).json({ error: 'Failed to complete trip' });
    }
  }
);

/**
 * PUT /api/trips/:id/update
 * Update trip progress (add waypoints, hazards, etc.)
 */
router.put('/:id/update',
  authenticate,
  async (req, res) => {
    try {
      const trip = await Trip.findByPk(req.params.id);

      if (!trip) {
        return res.status(404).json({ error: 'Trip not found' });
      }

      if (trip.userId !== req.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updates = {};

      if (req.body.hazardId) {
        updates.hazardsEncountered = [
          ...(trip.hazardsEncountered || []),
          req.body.hazardId
        ];
      }

      if (req.body.offRoute) {
        updates.offRouteCount = trip.offRouteCount + 1;
      }

      if (req.body.rerouted) {
        updates.rerouteCount = trip.rerouteCount + 1;
      }

      if (req.body.waypoint && trip.actualPath) {
        updates.actualPath = [
          ...(trip.actualPath || []),
          req.body.waypoint
        ];
      }

      await trip.update(updates);

      res.json({ trip });
    } catch (error) {
      logger.error('Error updating trip:', error);
      res.status(500).json({ error: 'Failed to update trip' });
    }
  }
);

/**
 * GET /api/trips
 * Get trips with filters
 */
router.get('/',
  authenticate,
  [
    query('status').optional().isIn(['in_progress', 'completed', 'cancelled']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('userId').optional().isUUID()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const where = {};

      // Filter by user
      if (req.query.userId) {
        if (req.user.role !== 'admin' && req.query.userId !== req.userId) {
          return res.status(403).json({ error: 'Access denied' });
        }
        where.userId = req.query.userId;
      } else if (req.user.role === 'driver') {
        where.userId = req.userId;
      }

      // Filter by status
      if (req.query.status) {
        where.status = req.query.status;
      }

      // Filter by date range
      if (req.query.startDate || req.query.endDate) {
        where.startTime = {};
        if (req.query.startDate) {
          where.startTime[Op.gte] = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
          where.startTime[Op.lte] = new Date(req.query.endDate);
        }
      }

      const trips = await Trip.findAll({
        where,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }],
        order: [['startTime', 'DESC']],
        limit: parseInt(req.query.limit) || 100
      });

      res.json({ trips });
    } catch (error) {
      logger.error('Error fetching trips:', error);
      res.status(500).json({ error: 'Failed to fetch trips' });
    }
  }
);

/**
 * GET /api/trips/:id
 * Get trip by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.userId !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ trip });
  } catch (error) {
    logger.error('Error fetching trip:', error);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

module.exports = router;
