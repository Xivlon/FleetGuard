const { OfflineQueue } = require('../models');
const logger = require('../utils/logger');

/**
 * Add message to offline queue
 */
async function queueMessage(userId, messageType, payload) {
  try {
    const queueItem = await OfflineQueue.create({
      userId,
      messageType,
      payload,
      status: 'pending'
    });

    logger.info(`Message queued for user ${userId}: ${messageType}`);
    return queueItem;
  } catch (error) {
    logger.error('Error queuing message:', error);
    throw error;
  }
}

/**
 * Get pending messages for a user
 */
async function getPendingMessages(userId) {
  try {
    return await OfflineQueue.findAll({
      where: {
        userId,
        status: 'pending'
      },
      order: [['createdAt', 'ASC']]
    });
  } catch (error) {
    logger.error('Error fetching pending messages:', error);
    throw error;
  }
}

/**
 * Mark message as synced
 */
async function markAsSynced(messageId) {
  try {
    const message = await OfflineQueue.findByPk(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    await message.update({
      status: 'synced',
      syncedAt: new Date()
    });

    logger.info(`Message ${messageId} marked as synced`);
    return message;
  } catch (error) {
    logger.error('Error marking message as synced:', error);
    throw error;
  }
}

/**
 * Mark message as failed
 */
async function markAsFailed(messageId, errorMessage) {
  try {
    const message = await OfflineQueue.findByPk(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    await message.update({
      status: 'failed',
      attempts: message.attempts + 1,
      lastAttempt: new Date(),
      error: errorMessage
    });

    logger.warn(`Message ${messageId} marked as failed: ${errorMessage}`);
    return message;
  } catch (error) {
    logger.error('Error marking message as failed:', error);
    throw error;
  }
}

/**
 * Retry failed messages
 */
async function retryFailedMessages(userId, maxAttempts = 3) {
  try {
    const failedMessages = await OfflineQueue.findAll({
      where: {
        userId,
        status: 'failed',
        attempts: { [require('sequelize').Op.lt]: maxAttempts }
      }
    });

    const results = [];

    for (const message of failedMessages) {
      try {
        // Reset status to pending for retry
        await message.update({
          status: 'pending',
          error: null
        });

        results.push({ id: message.id, success: true });
      } catch (error) {
        results.push({ id: message.id, success: false, error: error.message });
      }
    }

    logger.info(`Retry attempted for ${results.length} messages`);
    return results;
  } catch (error) {
    logger.error('Error retrying failed messages:', error);
    throw error;
  }
}

/**
 * Clear old synced messages
 */
async function clearSyncedMessages(daysOld = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deleted = await OfflineQueue.destroy({
      where: {
        status: 'synced',
        syncedAt: { [require('sequelize').Op.lt]: cutoffDate }
      }
    });

    logger.info(`Cleared ${deleted} old synced messages`);
    return deleted;
  } catch (error) {
    logger.error('Error clearing synced messages:', error);
    throw error;
  }
}

/**
 * Process pending queue for a user
 */
async function processUserQueue(userId, processFn) {
  try {
    const pendingMessages = await getPendingMessages(userId);

    const results = [];

    for (const message of pendingMessages) {
      try {
        // Call the processing function (e.g., send WebSocket message)
        await processFn(message.messageType, message.payload);

        // Mark as synced
        await markAsSynced(message.id);
        results.push({ id: message.id, success: true });
      } catch (error) {
        // Mark as failed
        await markAsFailed(message.id, error.message);
        results.push({ id: message.id, success: false, error: error.message });
      }
    }

    return results;
  } catch (error) {
    logger.error('Error processing user queue:', error);
    throw error;
  }
}

module.exports = {
  queueMessage,
  getPendingMessages,
  markAsSynced,
  markAsFailed,
  retryFailedMessages,
  clearSyncedMessages,
  processUserQueue
};
