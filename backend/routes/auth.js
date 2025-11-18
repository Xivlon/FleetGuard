const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Fleet } = require('../models');
const { generateToken, authenticate } = require('../utils/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('role').optional().isIn(['driver', 'fleet_manager', 'admin']),
    body('fleetId').optional().isUUID(),
    body('phoneNumber').optional().isMobilePhone()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, role, fleetId, phoneNumber } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          error: 'User with this email already exists'
        });
      }

      // Verify fleet exists if provided
      if (fleetId) {
        const fleet = await Fleet.findByPk(fleetId);
        if (!fleet) {
          return res.status(400).json({
            error: 'Invalid fleet ID'
          });
        }
      }

      // Create user
      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        role: role || 'driver',
        fleetId,
        phoneNumber
      });

      // Generate token
      const token = generateToken(user);

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: user.toSafeObject()
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({
        where: { email },
        include: [{ model: Fleet, as: 'fleet' }]
      });

      if (!user) {
        return res.status(401).json({
          error: 'Invalid email or password'
        });
      }

      // Validate password
      const isValid = await user.validatePassword(password);
      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid email or password'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          error: 'Account is deactivated'
        });
      }

      // Update last login
      await user.update({ lastLogin: new Date() });

      // Generate token
      const token = generateToken(user);

      logger.info(`User logged in: ${email}`);

      res.json({
        message: 'Login successful',
        token,
        user: user.toSafeObject()
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      include: [{ model: Fleet, as: 'fleet' }],
      attributes: { exclude: ['password'] }
    });

    res.json({
      user: user.toSafeObject()
    });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch profile'
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile',
  authenticate,
  [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('phoneNumber').optional().isMobilePhone(),
    body('pushToken').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, phoneNumber, pushToken } = req.body;

      const user = await User.findByPk(req.userId);

      await user.update({
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phoneNumber && { phoneNumber }),
        ...(pushToken && { pushToken })
      });

      logger.info(`User profile updated: ${user.email}`);

      res.json({
        message: 'Profile updated successfully',
        user: user.toSafeObject()
      });
    } catch (error) {
      logger.error('Profile update error:', error);
      res.status(500).json({
        error: 'Failed to update profile'
      });
    }
  }
);

module.exports = router;
