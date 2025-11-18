const express = require('express');
const { Op } = require('sequelize');
const { sequelize, Trip, User, Fleet } = require('../models');
const { authenticate, authorize } = require('../utils/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/analytics/dashboard
 * Get dashboard analytics
 */
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, fleetId } = req.query;

    const where = {};

    // Date range filter
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime[Op.gte] = new Date(startDate);
      if (endDate) where.startTime[Op.lte] = new Date(endDate);
    }

    // Fleet filter
    if (fleetId) {
      const users = await User.findAll({
        where: { fleetId },
        attributes: ['id']
      });
      where.userId = { [Op.in]: users.map(u => u.id) };
    } else if (req.user.role === 'driver') {
      where.userId = req.userId;
    } else if (req.user.fleetId && req.user.role !== 'admin') {
      const users = await User.findAll({
        where: { fleetId: req.user.fleetId },
        attributes: ['id']
      });
      where.userId = { [Op.in]: users.map(u => u.id) };
    }

    // Get basic statistics
    const stats = await Trip.findAll({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTrips'],
        [sequelize.fn('SUM', sequelize.col('distance')), 'totalDistance'],
        [sequelize.fn('AVG', sequelize.col('distance')), 'avgDistance'],
        [sequelize.fn('SUM', sequelize.col('duration')), 'totalDuration'],
        [sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration'],
        [sequelize.fn('SUM', sequelize.col('off_route_count')), 'totalOffRoute'],
        [sequelize.fn('SUM', sequelize.col('reroute_count')), 'totalReroutes']
      ],
      raw: true
    });

    // Get trip status breakdown
    const statusBreakdown = await Trip.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Get top drivers by trip count
    const topDrivers = await Trip.findAll({
      where,
      attributes: [
        'userId',
        [sequelize.fn('COUNT', sequelize.col('Trip.id')), 'tripCount'],
        [sequelize.fn('SUM', sequelize.col('distance')), 'totalDistance'],
        [sequelize.fn('AVG', sequelize.col('distance')), 'avgDistance']
      ],
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email']
      }],
      group: ['userId', 'user.id'],
      order: [[sequelize.literal('tripCount'), 'DESC']],
      limit: 10
    });

    // Get daily trip counts for trend
    const dailyTrends = await sequelize.query(`
      SELECT
        DATE(start_time) as date,
        COUNT(*) as trip_count,
        SUM(distance) as total_distance,
        AVG(distance) as avg_distance
      FROM trips
      WHERE ${Object.keys(where).length > 0 ? 'start_time >= :startDate' : '1=1'}
      GROUP BY DATE(start_time)
      ORDER BY date DESC
      LIMIT 30
    `, {
      replacements: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      summary: stats[0],
      statusBreakdown,
      topDrivers,
      dailyTrends
    });
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/driver/:userId
 * Get driver-specific analytics
 */
router.get('/driver/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Check access
    if (req.user.role === 'driver' && req.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const where = { userId };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime[Op.gte] = new Date(startDate);
      if (endDate) where.startTime[Op.lte] = new Date(endDate);
    }

    // Get driver stats
    const stats = await Trip.findAll({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTrips'],
        [sequelize.fn('SUM', sequelize.col('distance')), 'totalDistance'],
        [sequelize.fn('AVG', sequelize.col('distance')), 'avgDistance'],
        [sequelize.fn('SUM', sequelize.col('duration')), 'totalDuration'],
        [sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration'],
        [sequelize.fn('SUM', sequelize.col('off_route_count')), 'totalOffRoute'],
        [sequelize.fn('SUM', sequelize.col('reroute_count')), 'totalReroutes'],
        [sequelize.fn('AVG', sequelize.col('off_route_count')), 'avgOffRoute']
      ],
      raw: true
    });

    // Get recent trips
    const recentTrips = await Trip.findAll({
      where,
      order: [['startTime', 'DESC']],
      limit: 10
    });

    // Calculate performance score
    const performanceScore = calculatePerformanceScore(stats[0]);

    res.json({
      stats: stats[0],
      recentTrips,
      performanceScore
    });
  } catch (error) {
    logger.error('Error fetching driver analytics:', error);
    res.status(500).json({ error: 'Failed to fetch driver analytics' });
  }
});

/**
 * GET /api/analytics/hazard-heatmap
 * Get hazard heatmap data
 */
router.get('/hazard-heatmap', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime[Op.gte] = new Date(startDate);
      if (endDate) where.startTime[Op.lte] = new Date(endDate);
    }

    // Get all trips with hazards
    const trips = await Trip.findAll({
      where: {
        ...where,
        hazardsEncountered: { [Op.ne]: [] }
      },
      attributes: ['id', 'hazardsEncountered', 'startTime']
    });

    // Aggregate hazard data
    const hazardFrequency = {};
    trips.forEach(trip => {
      if (trip.hazardsEncountered) {
        trip.hazardsEncountered.forEach(hazardId => {
          hazardFrequency[hazardId] = (hazardFrequency[hazardId] || 0) + 1;
        });
      }
    });

    res.json({
      hazardFrequency,
      totalTripsWithHazards: trips.length
    });
  } catch (error) {
    logger.error('Error fetching hazard heatmap:', error);
    res.status(500).json({ error: 'Failed to fetch hazard heatmap' });
  }
});

/**
 * Helper function to calculate performance score
 */
function calculatePerformanceScore(stats) {
  if (!stats.totalTrips) return 0;

  const offRouteRate = stats.avgOffRoute || 0;
  const completionRate = stats.totalTrips > 0 ? 1 : 0;

  // Score: 100 - penalties for off-route incidents
  let score = 100;
  score -= offRouteRate * 10; // -10 points per avg off-route incident
  score = Math.max(0, Math.min(100, score)); // Clamp between 0-100

  return Math.round(score);
}

module.exports = router;
