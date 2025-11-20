const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Waypoint = sequelize.define('Waypoint', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('water_source', 'camp', 'viewpoint', 'danger'),
    allowNull: false
  },
  location: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: '{ latitude, longitude }'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reportedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notificationRadius: {
    type: DataTypes.FLOAT,
    defaultValue: 500,
    comment: 'Notification radius in meters (only for danger waypoints)'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this waypoint is visible to all users'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional data like images, etc.'
  }
}, {
  tableName: 'waypoints',
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['isPublic']
    },
    {
      using: 'gin',
      fields: ['location']
    }
  ]
});

module.exports = Waypoint;
