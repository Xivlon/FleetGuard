const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TrafficData = sequelize.define('TrafficData', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  segmentId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Unique identifier for road segment'
  },
  startLocation: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: '{ latitude, longitude }'
  },
  endLocation: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: '{ latitude, longitude }'
  },
  speedLimit: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Speed limit in km/h'
  },
  currentSpeed: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: 'Current average speed in km/h'
  },
  congestionLevel: {
    type: DataTypes.ENUM('free_flow', 'light', 'moderate', 'heavy', 'severe'),
    allowNull: false,
    defaultValue: 'free_flow'
  },
  delay: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Estimated delay in seconds'
  },
  source: {
    type: DataTypes.ENUM('user_reported', 'api', 'calculated'),
    defaultValue: 'calculated'
  },
  confidence: {
    type: DataTypes.FLOAT,
    defaultValue: 0.5,
    comment: 'Confidence score 0-1'
  },
  sampleSize: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of data points used'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'When this data becomes stale'
  }
}, {
  tableName: 'traffic_data',
  indexes: [
    {
      fields: ['segmentId']
    },
    {
      fields: ['congestionLevel']
    },
    {
      fields: ['expiresAt']
    }
  ]
});

module.exports = TrafficData;
