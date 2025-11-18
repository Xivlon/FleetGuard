const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../utils/auth');
const {
  sendPushNotification,
  getUserNotifications,
  markAsRead
} = require('../services/notificationService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const notifications = await getUserNotifications(req.userId, limit);

    res.json({ notifications });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await markAsRead(req.params.id, req.userId);

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notifications/test
 * Send test notification (for testing only)
 */
router.post('/test',
  authenticate,
  [
    body('title').notEmpty(),
    body('body').notEmpty(),
    body('type').optional().isIn(['hazard_alert', 'route_update', 'arrival', 'general'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await sendPushNotification(req.userId, {
        type: req.body.type || 'general',
        title: req.body.title,
        body: req.body.body,
        data: req.body.data || {}
      });

      res.json({
        message: 'Test notification sent',
        result
      });
    } catch (error) {
      logger.error('Error sending test notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  }
);

module.exports = router;
