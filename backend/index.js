require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const graphhopperClient = require('./graphhopperClient');
const { testConnection, syncDatabase } = require('./models');
const logger = require('./utils/logger');
const { sendHazardAlert, sendRouteUpdate } = require('./services/notificationService');
const { processUserQueue } = require('./services/offlineQueueService');
const { getTrafficForRoute } = require('./services/trafficService');
const obstacleService = require('./services/obstacleService');

// Import routes
const authRoutes = require('./routes/auth');
const fleetRoutes = require('./routes/fleets');
const tripRoutes = require('./routes/trips');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const obstaclesRoutes = require('./routes/obstacles');

// Validate GRAPHHOPPER_API_KEY in production
const NODE_ENV = process.env.NODE_ENV || 'development';
const GRAPHHOPPER_API_KEY = process.env.GRAPHHOPPER_API_KEY;

if (NODE_ENV === 'production' && !GRAPHHOPPER_API_KEY) {
  console.error('FATAL: GRAPHHOPPER_API_KEY environment variable is required in production');
  console.error('Please set GRAPHHOPPER_API_KEY in your Render environment variables');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

app.use(cors({
  origin: [
    "https://fleetguard.onrender.com",
    "http://localhost:3000",
    "exp://your-expo-app",
    "http://172.16.6.175:5000"
  ],
  credentials: true
}));
app.use(express.json());

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/fleets', fleetRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/obstacles', obstaclesRoutes);

const PORT = process.env.PORT || 5000;

// Off-route detection configuration
const OFF_ROUTE_DISTANCE_M = parseFloat(process.env.OFF_ROUTE_DISTANCE_M) || 50;
const OFF_ROUTE_STRIKES = parseInt(process.env.OFF_ROUTE_STRIKES) || 3;

// WebSocket heartbeat configuration
const WS_PING_INTERVAL_MS = parseInt(process.env.WS_PING_INTERVAL_MS) || 20000;
const WS_PING_GRACE_MULTIPLIER = parseInt(process.env.WS_PING_GRACE_MULTIPLIER) || 2;

// Broadcast throttling configuration
const POSITION_BROADCAST_MAX_PER_SEC = parseInt(process.env.POSITION_BROADCAST_MAX_PER_SEC) || 5;

const hazards = new Map();
const vehicles = new Map();
const activeRoutes = new Map();
// Track off-route state per vehicle: { strikes: number, lastCheck: timestamp }
const offRouteState = new Map();
// Track broadcast throttling per vehicle: { timestamps: Array<number> }
const broadcastThrottle = new Map();
// Track presence: connected clients count and per-vehicle last-seen
let connectedClientsCount = 0;
const vehicleLastSeen = new Map();

const broadcastToClients = (data) => {
  // Apply throttling for vehicle:position messages
  if (data.type === 'vehicle:position' && data.payload && data.payload.vehicleId) {
    const vehicleId = data.payload.vehicleId;
    const now = Date.now();
    
    // Get or initialize throttle state for this vehicle
    if (!broadcastThrottle.has(vehicleId)) {
      broadcastThrottle.set(vehicleId, { timestamps: [] });
    }
    
    const throttleState = broadcastThrottle.get(vehicleId);
    
    // Remove timestamps older than 1 second
    throttleState.timestamps = throttleState.timestamps.filter(t => now - t < 1000);
    
    // Check if we've exceeded the rate limit
    if (throttleState.timestamps.length >= POSITION_BROADCAST_MAX_PER_SEC) {
      // Drop this broadcast to prevent backpressure
      return;
    }
    
    // Record this broadcast
    throttleState.timestamps.push(now);
  }
  
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`New WebSocket client connected from ${clientIp} via /ws`);
  
  // Track connected clients
  connectedClientsCount++;
  console.log(`Connected clients: ${connectedClientsCount}`);
  
  // Initialize keepalive flag
  ws.isAlive = true;
  ws.lastPingTime = Date.now();
  
  // Handle pong responses
  ws.on('pong', () => {
    ws.isAlive = true;
    ws.lastPingTime = Date.now();
  });
  
  // Fetch active obstacles from database
  const sendInitialData = async () => {
    try {
      const { Obstacle } = require('./models');
      const activeObstacles = await Obstacle.findAll({
        where: { status: 'active' },
        include: [{ model: require('./models').User, as: 'reporter', attributes: ['id', 'firstName', 'lastName'] }]
      });

      ws.send(JSON.stringify({
        type: 'INITIAL_DATA',
        hazards: Array.from(hazards.values()),
        vehicles: Array.from(vehicles.values()),
        routes: Array.from(activeRoutes.values()),
        obstacles: activeObstacles.map(o => o.toJSON())
      }));
    } catch (error) {
      logger.error('Error sending initial data:', error);
      // Send without obstacles if there's an error
      ws.send(JSON.stringify({
        type: 'INITIAL_DATA',
        hazards: Array.from(hazards.values()),
        vehicles: Array.from(vehicles.values()),
        routes: Array.from(activeRoutes.values()),
        obstacles: []
      }));
    }
  };

  sendInitialData();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data.type);

      if (data.type === 'UPDATE_VEHICLE_LOCATION') {
        const vehicle = vehicles.get(data.vehicleId) || {
          id: data.vehicleId,
          name: data.name || `Vehicle ${data.vehicleId.slice(0, 6)}`,
          status: 'active'
        };
        
        vehicle.location = data.location;
        vehicle.heading = data.heading || 0;
        vehicle.speed = data.speed || 0;
        vehicle.lastUpdate = new Date().toISOString();
        
        vehicles.set(data.vehicleId, vehicle);
        
        broadcastToClients({
          type: 'VEHICLE_UPDATED',
          vehicle
        });
      }
      
      // Handle new vehicle:position message format
      if (data.type === 'vehicle:position') {
        const { vehicleId, latitude, longitude, speed, heading } = data.payload;
        
        // Update vehicle state
        const vehicle = vehicles.get(vehicleId) || {
          id: vehicleId,
          name: `Vehicle ${vehicleId.slice(0, 6)}`,
          status: 'active'
        };
        
        vehicle.location = { latitude, longitude };
        vehicle.heading = heading || 0;
        vehicle.speed = speed || 0;
        vehicle.lastUpdate = new Date().toISOString();
        
        vehicles.set(vehicleId, vehicle);
        
        // Track last-seen for presence/diagnostics
        vehicleLastSeen.set(vehicleId, Date.now());
        
        // Broadcast position to all clients (with throttling applied in broadcastToClients)
        broadcastToClients({
          type: 'vehicle:position',
          payload: data.payload
        });
        
        // Check for off-route condition
        checkOffRoute(vehicleId, { latitude, longitude });
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected from ${clientIp}`);
    connectedClientsCount--;
    console.log(`Connected clients: ${connectedClientsCount}`);
  });
});

// Set broadcast function for obstacle service
obstacleService.setBroadcastFunction(broadcastToClients);

// Ping/pong keepalive with configurable interval
const keepaliveInterval = setInterval(() => {
  const now = Date.now();
  const graceMs = WS_PING_INTERVAL_MS * WS_PING_GRACE_MULTIPLIER;
  
  wss.clients.forEach((ws) => {
    // Check if client hasn't responded within grace period
    if (ws.isAlive === false || (now - ws.lastPingTime) > graceMs) {
      console.log('Terminating unresponsive WebSocket connection (stale socket)');
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, WS_PING_INTERVAL_MS);

console.log('GraphHopper API Key configured:', !!GRAPHHOPPER_API_KEY);
if (GRAPHHOPPER_API_KEY) {
  // Security: API key is masked via graphhopperClient.maskApiKey() before logging
  console.log('GraphHopper API Key (masked):', graphhopperClient.maskApiKey(GRAPHHOPPER_API_KEY));
}

/**
 * Get last known position for a vehicle
 * @param {string} vehicleId 
 * @returns {Object|null} - { latitude, longitude } or null if not found
 */
function getLastVehiclePosition(vehicleId) {
  const vehicle = vehicles.get(vehicleId);
  if (vehicle && vehicle.location) {
    return {
      latitude: vehicle.location.latitude,
      longitude: vehicle.location.longitude
    };
  }
  return null;
}

app.get('/api/hazards', (req, res) => {
  const { severity, timeFilter } = req.query;
  let filteredHazards = Array.from(hazards.values());

  if (severity) {
    filteredHazards = filteredHazards.filter(h => h.severity === severity);
  }

  if (timeFilter) {
    const now = new Date();
    const hours = parseInt(timeFilter);
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
    filteredHazards = filteredHazards.filter(h => new Date(h.timestamp) > cutoff);
  }

  res.json(filteredHazards);
});

app.post('/api/hazards', (req, res) => {
  const { type, location, description, severity, reportedBy } = req.body;

  if (!type || !location || !location.latitude || !location.longitude) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const hazard = {
    id: uuidv4(),
    type,
    location,
    description: description || '',
    severity: severity || 'medium',
    reportedBy: reportedBy || 'anonymous',
    timestamp: new Date().toISOString(),
    status: 'active'
  };

  hazards.set(hazard.id, hazard);

  broadcastToClients({
    type: 'HAZARD_ADDED',
    hazard
  });

  checkRoutesForHazards(hazard);

  res.status(201).json(hazard);
});

app.delete('/api/hazards/:id', (req, res) => {
  const { id } = req.params;
  
  if (hazards.has(id)) {
    hazards.delete(id);
    broadcastToClients({
      type: 'HAZARD_REMOVED',
      hazardId: id
    });
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Hazard not found' });
  }
});

app.get('/api/vehicles', (req, res) => {
  res.json(Array.from(vehicles.values()));
});

app.get('/api/vehicles/:vehicleId/last-position', (req, res) => {
  const { vehicleId } = req.params;
  const position = getLastVehiclePosition(vehicleId);
  
  if (!position) {
    return res.status(404).json({ 
      error: 'No position found for this vehicle. Vehicle may not have streamed any location data yet.' 
    });
  }
  
  const vehicle = vehicles.get(vehicleId);
  res.json({
    vehicleId,
    latitude: position.latitude,
    longitude: position.longitude,
    timestamp: vehicle.lastUpdate || new Date().toISOString()
  });
});

app.post('/api/vehicles', (req, res) => {
  const { name, location } = req.body;
  
  const vehicle = {
    id: uuidv4(),
    name: name || `Vehicle ${Date.now()}`,
    location: location || { latitude: 37.7749, longitude: -122.4194 },
    status: 'active',
    heading: 0,
    speed: 0,
    lastUpdate: new Date().toISOString()
  };

  vehicles.set(vehicle.id, vehicle);

  broadcastToClients({
    type: 'VEHICLE_ADDED',
    vehicle
  });

  res.status(201).json(vehicle);
});

app.get('/api/routes/:vehicleId', (req, res) => {
  const route = activeRoutes.get(req.params.vehicleId);
  if (route) {
    res.json(route);
  } else {
    res.status(404).json({ error: 'Route not found' });
  }
});

app.post('/api/routes/calculate', async (req, res) => {
  try {
    let { start, end, vehicleId } = req.body;

    // Allow start to be omitted if vehicleId is provided
    if (!start && vehicleId) {
      start = getLastVehiclePosition(vehicleId);
      if (!start) {
        return res.status(400).json({ 
          error: 'No start location provided and no last known position found for vehicle. Please ensure the vehicle is streaming its location or provide a start coordinate.' 
        });
      }
      console.log('Using last known position for vehicle:', vehicleId, 'at coordinates:', start.latitude.toFixed(4), start.longitude.toFixed(4));
    }

    if (!start || !end || !start.latitude || !start.longitude || !end.latitude || !end.longitude) {
      return res.status(400).json({ error: 'Invalid start or end coordinates' });
    }

    let routeData;
    let usingFallback = false;
    
    if (GRAPHHOPPER_API_KEY) {
      try {
        // Use the new GraphHopper client with retry logic
        routeData = await graphhopperClient.calculateRoute(start, end, GRAPHHOPPER_API_KEY, {
          profile: 'car',
          instructions: true
        });
        console.log('GraphHopper API Success - Using real routing');
        console.log('Route points received:', routeData.paths?.[0]?.points?.coordinates?.length || 0);
      } catch (apiError) {
        console.log('GraphHopper API failed after retries, using fallback:', apiError.message);
        routeData = generateFallbackRoute(start, end);
        usingFallback = true;
      }
    } else {
      console.log('No API key, using fallback');
      routeData = generateFallbackRoute(start, end);
      usingFallback = true;
    }

    // FIXED: React Native Maps Polyline expects {latitude, longitude} objects, not arrays
    let coordinates = [];
    if (routeData.paths?.[0]?.points?.coordinates && !usingFallback) {
      // Convert from [lng, lat] arrays to {latitude, longitude} objects
      coordinates = routeData.paths[0].points.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
      console.log('Processed coordinates for React Native Maps Polyline:', coordinates.length);
    } else {
      // Fallback coordinates in correct object format
      coordinates = generateStraightLine(start, end);
    }

    // Get traffic data for route
    let trafficData = [];
    let trafficDelay = 0;
    try {
      if (req.query.includeTraffic !== 'false' && coordinates.length > 1) {
        trafficData = await getTrafficForRoute(coordinates);
        trafficDelay = trafficData.reduce((sum, segment) => sum + (segment.delay || 0), 0);
        logger.info(`Traffic data fetched: ${trafficData.length} segments, ${trafficDelay}s total delay`);
      }
    } catch (error) {
      logger.warn('Failed to fetch traffic data:', error.message);
    }

    // Check for obstacles on route
    const { Obstacle } = require('./models');
    let obstaclesOnRoute = [];
    try {
      const activeObstacles = await Obstacle.findAll({
        where: { status: 'active' }
      });

      obstaclesOnRoute = activeObstacles.filter(obstacle => {
        return coordinates.some(coord => {
          const distance = calculateDistance(coord, obstacle.location);
          return distance <= obstacle.radius;
        });
      });

      if (obstaclesOnRoute.length > 0) {
        logger.info(`Found ${obstaclesOnRoute.length} obstacles on route`);
      }
    } catch (error) {
      logger.warn('Failed to check obstacles:', error.message);
    }

    const route = {
      vehicleId: vehicleId || null,
      start,
      end,
      distance: routeData.paths?.[0]?.distance,
      duration: (routeData.paths?.[0]?.time || 0) + (trafficDelay * 1000),
      baseTime: routeData.paths?.[0]?.time,
      trafficDelay: trafficDelay * 1000,
      coordinates: coordinates, // This should now be [{latitude, longitude}, {latitude, longitude}, ...]
      instructions: routeData.paths?.[0]?.instructions,
      trafficData: trafficData.map(t => ({
        segmentId: t.segmentId,
        congestionLevel: t.congestionLevel,
        currentSpeed: t.currentSpeed,
        delay: t.delay
      })),
      obstacles: obstaclesOnRoute.map(o => ({
        id: o.id,
        type: o.type,
        location: o.location,
        severity: o.severity,
        radius: o.radius,
        description: o.description
      })),
      timestamp: new Date().toISOString(),
      fallback: usingFallback
    };

    console.log('Route details:', {
      fallback: route.fallback,
      coordinateCount: route.coordinates.length,
      hasInstructions: !!route.instructions,
      firstCoordinate: route.coordinates[0],
      coordinateFormat: typeof route.coordinates[0]
    });

    if (vehicleId) {
      activeRoutes.set(vehicleId, route);
      broadcastToClients({
        type: 'ROUTE_UPDATED',
        route
      });
    }

    res.json(route);
  } catch (error) {
    console.error('Route calculation error:', error.message);
    
    const { start, end, vehicleId } = req.body;
    
    const route = {
      vehicleId: vehicleId || null,
      start,
      end,
      distance: calculateDistance(start, end),
      duration: estimateDuration(start, end),
      coordinates: generateStraightLine(start, end),
      instructions: generateBasicInstructions(start, end),
      timestamp: new Date().toISOString(),
      fallback: true
    };

    if (vehicleId) {
      activeRoutes.set(vehicleId, route);
    }

    res.json(route);
  }
});

function generateFallbackRoute(start, end) {
  return {
    paths: [{
      distance: calculateDistance(start, end),
      time: estimateDuration(start, end),
      points: {
        coordinates: generateStraightLine(start, end).map(coord => [coord.longitude, coord.latitude])
      },
      instructions: generateBasicInstructions(start, end)
    }]
  };
}

function calculateDistance(start, end) {
  const R = 6371000;
  const lat1 = start.latitude * Math.PI / 180;
  const lat2 = end.latitude * Math.PI / 180;
  const deltaLat = (end.latitude - start.latitude) * Math.PI / 180;
  const deltaLon = (end.longitude - start.longitude) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate minimum distance from a point to a polyline in meters
 * Uses equirectangular projection for short segments and haversine for final distance
 * @param {Object} point - {latitude, longitude}
 * @param {Array} polyline - Array of {latitude, longitude} objects
 * @returns {number} - Distance in meters
 */
function distancePointToPolylineMeters(point, polyline) {
  if (!polyline || polyline.length === 0) return Infinity;
  if (polyline.length === 1) return calculateDistance(point, polyline[0]);

  let minDistance = Infinity;

  for (let i = 0; i < polyline.length - 1; i++) {
    const A = polyline[i];
    const B = polyline[i + 1];
    
    // Convert to radians
    const latP = point.latitude * Math.PI / 180;
    const lonP = point.longitude * Math.PI / 180;
    const latA = A.latitude * Math.PI / 180;
    const lonA = A.longitude * Math.PI / 180;
    const latB = B.latitude * Math.PI / 180;
    const lonB = B.longitude * Math.PI / 180;
    
    // Use equirectangular projection around segment midpoint
    const midLat = (latA + latB) / 2;
    const R = 6371000; // Earth radius in meters
    
    // Convert to planar coordinates (meters)
    const xP = R * lonP * Math.cos(midLat);
    const yP = R * latP;
    const xA = R * lonA * Math.cos(midLat);
    const yA = R * latA;
    const xB = R * lonB * Math.cos(midLat);
    const yB = R * latB;
    
    // Vector from A to B
    const dx = xB - xA;
    const dy = yB - yA;
    const lengthSquared = dx * dx + dy * dy;
    
    let closestPoint;
    
    if (lengthSquared === 0) {
      // A and B are the same point
      closestPoint = A;
    } else {
      // Project point P onto line AB
      let t = ((xP - xA) * dx + (yP - yA) * dy) / lengthSquared;
      t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]
      
      // Calculate closest point
      const closestLat = (A.latitude + t * (B.latitude - A.latitude));
      const closestLon = (A.longitude + t * (B.longitude - A.longitude));
      closestPoint = { latitude: closestLat, longitude: closestLon };
    }
    
    // Calculate haversine distance from point to closest point on segment
    const distance = calculateDistance(point, closestPoint);
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

function estimateDuration(start, end) {
  const distance = calculateDistance(start, end);
  const avgSpeed = 50000 / 3600;
  return (distance / avgSpeed) * 1000;
}

function generateStraightLine(start, end) {
  const steps = 50;
  const coordinates = [];
  
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    coordinates.push({
      latitude: start.latitude + (end.latitude - start.latitude) * fraction,
      longitude: start.longitude + (end.longitude - start.longitude) * fraction
    });
  }
  
  return coordinates;
}

function generateBasicInstructions(start, end) {
  const distance = calculateDistance(start, end);
  const bearing = calculateBearing(start, end);
  const direction = getDirection(bearing);
  
  return [
    {
      text: `Head ${direction}`,
      distance: distance / 2,
      time: estimateDuration(start, end) / 2
    },
    {
      text: 'Continue straight',
      distance: distance / 2,
      time: estimateDuration(start, end) / 2
    },
    {
      text: 'Arrive at destination',
      distance: 0,
      time: 0
    }
  ];
}

function calculateBearing(start, end) {
  const lat1 = start.latitude * Math.PI / 180;
  const lat2 = end.latitude * Math.PI / 180;
  const deltaLon = (end.longitude - start.longitude) * Math.PI / 180;

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

function getDirection(bearing) {
  const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

async function checkRoutesForHazards(newHazard) {
  const HAZARD_PROXIMITY_METERS = 1000;
  const { User } = require('./models');

  activeRoutes.forEach(async (route, vehicleId) => {
    if (route.coordinates) {
      for (const coord of route.coordinates) {
        const point = {
          latitude: coord.latitude,
          longitude: coord.longitude
        };
        const distance = calculateDistance(point, newHazard.location);

        if (distance <= HAZARD_PROXIMITY_METERS) {
          logger.info(`Hazard detected on route for vehicle ${vehicleId}, recalculating...`);

          try {
            const recalculatedRoute = await recalculateRouteForVehicle(vehicleId, route.start, route.end);

            broadcastToClients({
              type: 'ROUTE_HAZARD_ALERT',
              vehicleId,
              hazard: newHazard,
              distance,
              recalculatedRoute
            });

            // Send push notification to driver
            const user = await User.findOne({ where: { id: vehicleId } });
            if (user && user.pushToken) {
              try {
                await sendHazardAlert(user.id, newHazard);
              } catch (error) {
                logger.error('Failed to send hazard alert notification:', error);
              }
            }
          } catch (error) {
            logger.error('Route recalculation failed:', error);
            broadcastToClients({
              type: 'ROUTE_HAZARD_ALERT',
              vehicleId,
              hazard: newHazard,
              distance
            });
          }
          break;
        }
      }
    }
  });
}

/**
 * Check if vehicle is off-route and trigger recalculation if needed
 * @param {string} vehicleId 
 * @param {Object} position - {latitude, longitude}
 */
function checkOffRoute(vehicleId, position) {
  const route = activeRoutes.get(vehicleId);
  if (!route || !route.coordinates || route.coordinates.length === 0) {
    return;
  }

  // Debounce: don't check more than once per 2 seconds per vehicle
  const state = offRouteState.get(vehicleId) || { strikes: 0, lastCheck: 0 };
  const now = Date.now();
  if (now - state.lastCheck < 2000) {
    return;
  }
  state.lastCheck = now;

  // Calculate distance from position to route polyline
  const distance = distancePointToPolylineMeters(position, route.coordinates);
  
  if (process.env.DEBUG_OFF_ROUTE === 'true') {
    console.log(`[${vehicleId}] Distance to route: ${distance.toFixed(2)}m, Threshold: ${OFF_ROUTE_DISTANCE_M}m, Strikes: ${state.strikes}/${OFF_ROUTE_STRIKES}`);
  }

  if (distance > OFF_ROUTE_DISTANCE_M) {
    // Off-route: increment strike counter
    state.strikes = (state.strikes || 0) + 1;
    offRouteState.set(vehicleId, state);
    
    if (state.strikes >= OFF_ROUTE_STRIKES) {
      console.log(`Vehicle ${vehicleId} is off-route (${distance.toFixed(2)}m away). Recalculating route...`);
      
      // Reset strikes
      state.strikes = 0;
      offRouteState.set(vehicleId, state);
      
      // Trigger route recalculation from current position to destination
      const destination = route.end;
      recalculateRouteForVehicle(vehicleId, position, destination).catch(error => {
        console.error('Failed to recalculate route for vehicle:', vehicleId, error);
      });
    }
  } else {
    // On-route: reset strike counter
    if (state.strikes > 0) {
      console.log(`Vehicle ${vehicleId} back on route. Resetting strikes.`);
      state.strikes = 0;
      offRouteState.set(vehicleId, state);
    }
  }
}

async function recalculateRouteForVehicle(vehicleId, start, end) {
  let routeData;
  let usingFallback = false;
  
  try {
    if (GRAPHHOPPER_API_KEY) {
      try {
        // Use the new GraphHopper client with retry logic
        routeData = await graphhopperClient.calculateRoute(start, end, GRAPHHOPPER_API_KEY, {
          profile: 'car',
          instructions: true
        });
      } catch (apiError) {
        console.log('GraphHopper API failed during recalculation, using fallback:', apiError.message);
        routeData = generateFallbackRoute(start, end);
        usingFallback = true;
      }
    } else {
      routeData = generateFallbackRoute(start, end);
      usingFallback = true;
    }

    // FIXED: React Native Maps Polyline expects {latitude, longitude} objects
    let coordinates = [];
    if (routeData.paths?.[0]?.points?.coordinates && !usingFallback) {
      coordinates = routeData.paths[0].points.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
    } else {
      coordinates = generateStraightLine(start, end);
    }

    const route = {
      vehicleId,
      start,
      end,
      distance: routeData.paths?.[0]?.distance || calculateDistance(start, end),
      duration: routeData.paths?.[0]?.time || estimateDuration(start, end),
      coordinates: coordinates,
      instructions: routeData.paths?.[0]?.instructions || generateBasicInstructions(start, end),
      timestamp: new Date().toISOString(),
      recalculated: true,
      fallback: usingFallback
    };

    activeRoutes.set(vehicleId, route);
    
    // Broadcast both old and new message formats for compatibility
    broadcastToClients({
      type: 'ROUTE_UPDATED',
      route
    });
    
    broadcastToClients({
      type: 'route:update',
      payload: {
        vehicleId,
        route
      }
    });

    return route;
  } catch (error) {
    console.error('Route recalculation error:', error);
    const fallbackRoute = {
      vehicleId,
      start,
      end,
      distance: calculateDistance(start, end),
      duration: estimateDuration(start, end),
      coordinates: generateStraightLine(start, end),
      instructions: generateBasicInstructions(start, end),
      timestamp: new Date().toISOString(),
      recalculated: true,
      fallback: true
    };
    
    activeRoutes.set(vehicleId, fallbackRoute);
    return fallbackRoute;
  }
}

setInterval(() => {
  const now = new Date();
  const OLD_HAZARD_HOURS = 24;
  
  hazards.forEach((hazard, id) => {
    const age = now - new Date(hazard.timestamp);
    if (age > OLD_HAZARD_HOURS * 60 * 60 * 1000) {
      hazards.delete(id);
      broadcastToClients({
        type: 'HAZARD_REMOVED',
        hazardId: id
      });
    }
  });
}, 60 * 60 * 1000);

app.get('/api/health', (req, res) => {
  // Build per-vehicle last-seen data
  const vehiclePresence = {};
  vehicleLastSeen.forEach((timestamp, vehicleId) => {
    vehiclePresence[vehicleId] = {
      lastSeen: new Date(timestamp).toISOString(),
      ageMs: Date.now() - timestamp
    };
  });
  
  res.json({
    status: 'ok',
    vehicles: vehicles.size,
    hazards: hazards.size,
    routes: activeRoutes.size,
    connectedClients: connectedClientsCount,
    vehiclePresence,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/routing-status', async (req, res) => {
  const configured = !!GRAPHHOPPER_API_KEY;
  if (!configured) {
    return res.json({ configured: false, provider: 'graphhopper', reachable: false, message: 'No GRAPHHOPPER_API_KEY configured' });
  }

  try {
    const result = await graphhopperClient.testReachability(GRAPHHOPPER_API_KEY);
    return res.json({ configured: true, provider: 'graphhopper', ...result });
  } catch (error) {
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
    return res.json({ configured: true, provider: 'graphhopper', reachable: false, error: errorDetails });
  }
});

app.get('/readyz', async (req, res) => {
  // Basic health check
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString()
  };
  
  // Check GraphHopper reachability if API key is configured
  if (GRAPHHOPPER_API_KEY) {
    try {
      const result = await graphhopperClient.testReachability(GRAPHHOPPER_API_KEY);
      if (result.reachable) {
        health.graphhopper = 'ready';
        return res.status(200).json(health);
      } else {
        health.graphhopper = 'unreachable';
        health.graphhopperMessage = result.message;
        return res.status(503).json(health);
      }
    } catch (error) {
      health.graphhopper = 'error';
      health.graphhopperMessage = error.message;
      return res.status(503).json(health);
    }
  } else {
    // In non-production without API key, still return ready (will use fallback)
    if (NODE_ENV !== 'production') {
      health.graphhopper = 'not_configured';
      health.message = 'Running in fallback mode';
      return res.status(200).json(health);
    }
    // In production, this should never happen due to startup check
    health.graphhopper = 'missing_key';
    return res.status(503).json(health);
  }
});

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();

    if (dbConnected) {
      // Sync database (create tables if they don't exist)
      logger.info('Synchronizing database...');
      await syncDatabase({ alter: NODE_ENV === 'development' });
      logger.info('Database synchronized successfully');
    } else {
      logger.warn('Database not available, running in memory-only mode');
    }

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Fleet Navigation Backend running on port ${PORT}`);
      logger.info(`WebSocket server ready for connections`);
      logger.info(`Environment: ${NODE_ENV}`);
      logger.info(`GraphHopper API Key: ${GRAPHHOPPER_API_KEY ? `Configured (${graphhopperClient.maskApiKey(GRAPHHOPPER_API_KEY)})` : 'Not configured (using fallback routing)'}`);
      logger.info(`WebSocket ping interval: ${WS_PING_INTERVAL_MS}ms (grace: ${WS_PING_GRACE_MULTIPLIER}x = ${WS_PING_INTERVAL_MS * WS_PING_GRACE_MULTIPLIER}ms)`);
      logger.info(`Position broadcast throttle: ${POSITION_BROADCAST_MAX_PER_SEC} messages/sec per vehicle`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Cleanup keepalive on server shutdown
wss.on('close', () => {
  clearInterval(keepaliveInterval);
});