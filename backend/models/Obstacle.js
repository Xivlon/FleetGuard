const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Obstacle = sequelize.define('Obstacle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('accident', 'construction', 'road_closure', 'debris', 'weather', 'traffic_jam', 'other'),
    allowNull: false,
    defaultValue: 'other'
  },
  location: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: '{ latitude, longitude }'
  },
  radius: {
    type: DataTypes.FLOAT,
    defaultValue: 100,
    comment: 'Affected radius in meters'
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
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
  confirmedBy: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    comment: 'User IDs who confirmed this obstacle'
  },
  status: {
    type: DataTypes.ENUM('active', 'resolved', 'expired'),
    defaultValue: 'active'
  },
  estimatedClearTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  affectedRoutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of routes affected by this obstacle'
  },
  trafficDelay: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Estimated delay in seconds'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional data like images, videos, etc.'
  }
}, {
  tableName: 'obstacles',
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      using: 'gin',
      fields: ['location']
    }
  ]
});

module.exports = Obstacle;
