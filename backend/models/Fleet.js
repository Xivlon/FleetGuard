const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Fleet = sequelize.define('Fleet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  organizationCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      maxVehicles: 50,
      enableHazardReporting: true,
      enableOfflineMode: true,
      notificationSettings: {
        hazardAlerts: true,
        routeUpdates: true,
        arrivalNotifications: true
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'fleets'
});

module.exports = Fleet;
