/**
 * Seed script to populate the database with mock danger zone waypoints
 * These waypoints will have a 250-meter notification radius
 */

require('dotenv').config();
const { User, Waypoint, sequelize, testConnection, syncDatabase } = require('../models');
const logger = require('../utils/logger');

// Mock danger zones in different locations (latitude, longitude, description)
const DANGER_ZONES = [
  // San Francisco Bay Area
  { lat: 37.7749, lon: -122.4194, name: 'Golden Gate Bridge Construction', description: 'Ongoing construction work, expect delays' },
  { lat: 37.8044, lon: -122.2712, name: 'Oakland Port Hazard', description: 'Heavy truck traffic and road damage' },
  { lat: 37.3541, lon: -121.9552, name: 'San Jose Industrial Zone', description: 'Industrial hazards and debris on road' },
  { lat: 37.5483, lon: -121.9886, name: 'Fremont Flooding Area', description: 'Seasonal flooding risk' },
  { lat: 37.9577, lon: -122.3477, name: 'Richmond Refinery Zone', description: 'Chemical hazard area' },
  
  // Los Angeles Area
  { lat: 34.0522, lon: -118.2437, name: 'LA Downtown Traffic Zone', description: 'Extreme congestion and road construction' },
  { lat: 33.9425, lon: -118.4081, name: 'LAX Airport Zone', description: 'Heavy traffic and construction' },
  { lat: 34.1478, lon: -118.1445, name: 'Pasadena Wildfire Risk', description: 'Seasonal wildfire danger zone' },
  
  // New York Area
  { lat: 40.7128, lon: -74.0060, name: 'Manhattan Tunnel Work', description: 'Ongoing tunnel repairs' },
  { lat: 40.7580, lon: -73.9855, name: 'Times Square Construction', description: 'Major roadwork and pedestrian hazards' },
  { lat: 40.6782, lon: -73.9442, name: 'Brooklyn Bridge Zone', description: 'Bridge maintenance work' },
  
  // Chicago Area
  { lat: 41.8781, lon: -87.6298, name: 'Chicago Loop Zone', description: 'Heavy traffic and construction' },
  { lat: 41.9742, lon: -87.9073, name: "O'Hare Airport Zone", description: 'Airport construction and traffic' },
  
  // Houston Area
  { lat: 29.7604, lon: -95.3698, name: 'Houston Ship Channel', description: 'Industrial hazards' },
  { lat: 29.7952, lon: -95.3619, name: 'Houston Warehouse District', description: 'Heavy truck traffic' },
  
  // Seattle Area
  { lat: 47.6062, lon: -122.3321, name: 'Seattle Waterfront Construction', description: 'Ongoing waterfront development' },
  { lat: 47.4502, lon: -122.3088, name: 'SeaTac Airport Zone', description: 'Airport construction' },
  
  // Phoenix Area
  { lat: 33.4484, lon: -112.0740, name: 'Phoenix Downtown Heat Zone', description: 'Extreme heat risk area' },
  { lat: 33.4255, lon: -111.9400, name: 'Tempe Construction Zone', description: 'Major highway construction' },
  
  // Miami Area
  { lat: 25.7617, lon: -80.1918, name: 'Miami Beach Flooding', description: 'Flood prone area during high tide' },
  { lat: 25.7907, lon: -80.1300, name: 'Miami Port Zone', description: 'Heavy container truck traffic' },
  
  // Interstate Highway Danger Zones
  { lat: 39.7392, lon: -104.9903, name: 'Denver I-70 Mountain Pass', description: 'Steep grades and winter hazards' },
  { lat: 36.1699, lon: -115.1398, name: 'Las Vegas Desert Route', description: 'Extreme heat and desert conditions' },
  { lat: 35.2271, lon: -80.8431, name: 'Charlotte I-85 Construction', description: 'Major interstate construction' },
  { lat: 32.7767, lon: -96.7970, name: 'Dallas I-35 Zone', description: 'Heavy traffic and frequent accidents' },
  { lat: 30.2672, lon: -97.7431, name: 'Austin I-35 Expansion', description: 'Major highway expansion work' },
];

// Create a default system user for seeding if not exists
async function getOrCreateSystemUser() {
  try {
    let systemUser = await User.findOne({ where: { email: 'system@fleetguard.internal' } });
    
    if (!systemUser) {
      logger.info('Creating system user for seeding...');
      systemUser = await User.create({
        email: 'system@fleetguard.internal',
        password: 'system_password_' + Math.random().toString(36),
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        isActive: true
      });
      logger.info('System user created');
    }
    
    return systemUser;
  } catch (error) {
    logger.error('Error creating system user:', error);
    throw error;
  }
}

// Seed danger zone waypoints
async function seedDangerZones() {
  try {
    logger.info('Starting danger zone seeding...');
    
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      logger.error('Failed to connect to database');
      process.exit(1);
    }
    
    // Sync database (create tables if they don't exist)
    await syncDatabase({ alter: true });
    
    // Get or create system user
    const systemUser = await getOrCreateSystemUser();
    
    // Delete existing danger zone waypoints to avoid duplicates
    const deletedCount = await Waypoint.destroy({
      where: { type: 'danger' }
    });
    logger.info(`Deleted ${deletedCount} existing danger zone waypoints`);
    
    // Create new danger zone waypoints
    const waypoints = [];
    for (const zone of DANGER_ZONES) {
      const waypoint = await Waypoint.create({
        type: 'danger',
        location: {
          latitude: zone.lat,
          longitude: zone.lon
        },
        name: zone.name,
        description: zone.description,
        reportedBy: systemUser.id,
        notificationRadius: 250, // 250 meters as specified
        isPublic: true,
        metadata: {
          seedDate: new Date().toISOString(),
          source: 'seed_script'
        }
      });
      waypoints.push(waypoint);
    }
    
    logger.info(`Successfully created ${waypoints.length} danger zone waypoints`);
    logger.info('Danger zone seeding completed!');
    
    // Display summary
    console.log('\n=== Danger Zone Waypoints Summary ===');
    console.log(`Total waypoints created: ${waypoints.length}`);
    console.log(`Notification radius: 250 meters`);
    console.log(`System user ID: ${systemUser.id}`);
    console.log('\nSample waypoints:');
    waypoints.slice(0, 5).forEach((wp, idx) => {
      console.log(`  ${idx + 1}. ${wp.name} (${wp.location.latitude}, ${wp.location.longitude})`);
    });
    console.log('=====================================\n');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding danger zones:', error);
    process.exit(1);
  }
}

// Run the seed script
seedDangerZones();
