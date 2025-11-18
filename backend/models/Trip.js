const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Trip = sequelize.define('Trip', {
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
  vehicleId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  startLocation: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: '{ latitude, longitude, address }'
  },
  endLocation: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: '{ latitude, longitude, address }'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('in_progress', 'completed', 'cancelled'),
    defaultValue: 'in_progress'
  },
  distance: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Distance in kilometers'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in seconds'
  },
  route: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Stored route polyline and waypoints'
  },
  actualPath: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array of actual GPS coordinates during trip'
  },
  hazardsEncountered: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of hazard IDs encountered during trip'
  },
  offRouteCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of times driver went off route'
  },
  rerouteCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of times route was recalculated'
  },
  metrics: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional metrics like fuel consumption, speed violations, etc.'
  }
}, {
  tableName: 'trips'
});

module.exports = Trip;
