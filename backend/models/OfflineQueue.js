const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OfflineQueue = sequelize.define('OfflineQueue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  messageType: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Type of queued message (position_update, hazard_report, etc.)'
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'The actual message data to be sent'
  },
  status: {
    type: DataTypes.ENUM('pending', 'synced', 'failed'),
    defaultValue: 'pending'
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastAttempt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  syncedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'offline_queue'
});

module.exports = OfflineQueue;
