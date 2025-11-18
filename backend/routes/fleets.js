const express = require('express');
const { body, validationResult } = require('express-validator');
const { Fleet, User } = require('../models');
const { authenticate, authorize, verifyFleetAccess } = require('../utils/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/fleets
 * Get all fleets (admin only)
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const fleets = await Fleet.findAll({
      include: [{
        model: User,
        as: 'users',
        attributes: ['id', 'email', 'firstName', 'lastName', 'role']
      }]
    });

    res.json({ fleets });
  } catch (error) {
    logger.error('Error fetching fleets:', error);
    res.status(500).json({ error: 'Failed to fetch fleets' });
  }
});

/**
 * GET /api/fleets/:id
 * Get fleet by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const fleet = await Fleet.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'users',
        attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive']
      }]
    });

    if (!fleet) {
      return res.status(404).json({ error: 'Fleet not found' });
    }

    // Check access
    if (req.user.role !== 'admin' && req.user.fleetId !== fleet.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ fleet });
  } catch (error) {
    logger.error('Error fetching fleet:', error);
    res.status(500).json({ error: 'Failed to fetch fleet' });
  }
});

/**
 * POST /api/fleets
 * Create new fleet (admin only)
 */
router.post('/',
  authenticate,
  authorize('admin'),
  [
    body('name').trim().notEmpty(),
    body('organizationCode').trim().notEmpty(),
    body('description').optional().trim(),
    body('contactEmail').optional().isEmail(),
    body('contactPhone').optional().isMobilePhone()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const fleet = await Fleet.create(req.body);

      logger.info(`Fleet created: ${fleet.name}`);

      res.status(201).json({
        message: 'Fleet created successfully',
        fleet
      });
    } catch (error) {
      logger.error('Error creating fleet:', error);
      res.status(500).json({
        error: 'Failed to create fleet',
        message: error.message
      });
    }
  }
);

/**
 * PUT /api/fleets/:id
 * Update fleet
 */
router.put('/:id',
  authenticate,
  authorize('admin', 'fleet_manager'),
  async (req, res) => {
    try {
      const fleet = await Fleet.findByPk(req.params.id);

      if (!fleet) {
        return res.status(404).json({ error: 'Fleet not found' });
      }

      // Check access
      if (req.user.role === 'fleet_manager' && req.user.fleetId !== fleet.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await fleet.update(req.body);

      logger.info(`Fleet updated: ${fleet.name}`);

      res.json({
        message: 'Fleet updated successfully',
        fleet
      });
    } catch (error) {
      logger.error('Error updating fleet:', error);
      res.status(500).json({ error: 'Failed to update fleet' });
    }
  }
);

/**
 * GET /api/fleets/:id/users
 * Get all users in a fleet
 */
router.get('/:id/users', authenticate, verifyFleetAccess, async (req, res) => {
  try {
    const users = await User.findAll({
      where: { fleetId: req.params.id },
      attributes: { exclude: ['password'] }
    });

    res.json({ users });
  } catch (error) {
    logger.error('Error fetching fleet users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;
