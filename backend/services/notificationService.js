const { Expo } = require('expo-server-sdk');
const { Notification, User } = require('../models');
const logger = require('../utils/logger');

const expo = new Expo();

/**
 * Send push notification to user
 */
async function sendPushNotification(userId, notification) {
  try {
    const user = await User.findByPk(userId);

    if (!user || !user.pushToken) {
      logger.warn(`No push token for user ${userId}`);
      return null;
    }

    // Check if the push token is valid
    if (!Expo.isExpoPushToken(user.pushToken)) {
      logger.error(`Invalid push token for user ${userId}: ${user.pushToken}`);
      return null;
    }

    // Create notification record
    const notificationRecord = await Notification.create({
      userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      priority: notification.priority || 'medium'
    });

    // Construct the message
    const message = {
      to: user.pushToken,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      priority: notification.priority === 'high' ? 'high' : 'default',
      channelId: notification.type
    };

    // Send the notification
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        logger.error('Error sending push notification chunk:', error);
      }
    }

    // Update notification record
    await notificationRecord.update({
      isSent: true,
      sentAt: new Date()
    });

    logger.info(`Push notification sent to user ${userId}: ${notification.title}`);

    return tickets;
  } catch (error) {
    logger.error('Error in sendPushNotification:', error);
    throw error;
  }
}

/**
 * Send hazard alert notification
 */
async function sendHazardAlert(userId, hazard) {
  return sendPushNotification(userId, {
    type: 'hazard_alert',
    title: `${hazard.severity} Hazard Alert`,
    body: `${hazard.type} detected on your route`,
    data: {
      hazardId: hazard.id,
      location: hazard.location,
      severity: hazard.severity
    },
    priority: hazard.severity === 'high' ? 'high' : 'medium'
  });
}

/**
 * Send route update notification
 */
async function sendRouteUpdate(userId, message) {
  return sendPushNotification(userId, {
    type: 'route_update',
    title: 'Route Updated',
    body: message,
    data: {},
    priority: 'medium'
  });
}

/**
 * Send arrival notification
 */
async function sendArrivalNotification(userId, destination) {
  return sendPushNotification(userId, {
    type: 'arrival',
    title: 'Destination Reached',
    body: `You have arrived at ${destination}`,
    data: {},
    priority: 'low'
  });
}

/**
 * Batch send notifications to multiple users
 */
async function batchSendNotifications(userIds, notification) {
  const results = [];

  for (const userId of userIds) {
    try {
      const result = await sendPushNotification(userId, notification);
      results.push({ userId, success: true, result });
    } catch (error) {
      logger.error(`Failed to send notification to user ${userId}:`, error);
      results.push({ userId, success: false, error: error.message });
    }
  }

  return results;
}

/**
 * Get user notifications
 */
async function getUserNotifications(userId, limit = 50) {
  return await Notification.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit
  });
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId, userId) {
  const notification = await Notification.findByPk(notificationId);

  if (!notification || notification.userId !== userId) {
    throw new Error('Notification not found');
  }

  await notification.update({ isRead: true });
  return notification;
}

module.exports = {
  sendPushNotification,
  sendHazardAlert,
  sendRouteUpdate,
  sendArrivalNotification,
  batchSendNotifications,
  getUserNotifications,
  markAsRead
};
