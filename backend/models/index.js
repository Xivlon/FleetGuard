const { sequelize } = require('../config/database');
const User = require('./User');
const Fleet = require('./Fleet');
const Trip = require('./Trip');
const Notification = require('./Notification');
const OfflineQueue = require('./OfflineQueue');

// Define associations
Fleet.hasMany(User, {
  foreignKey: 'fleetId',
  as: 'users'
});

User.belongsTo(Fleet, {
  foreignKey: 'fleetId',
  as: 'fleet'
});

User.hasMany(Trip, {
  foreignKey: 'userId',
  as: 'trips'
});

Trip.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(Notification, {
  foreignKey: 'userId',
  as: 'notifications'
});

Notification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(OfflineQueue, {
  foreignKey: 'userId',
  as: 'offlineQueue'
});

OfflineQueue.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Sync database
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Fleet,
  Trip,
  Notification,
  OfflineQueue,
  syncDatabase
};
