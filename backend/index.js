require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const {
  routeCalculationSchema,
  vehiclePositionSchema,
  hazardSchema,
  vehicleSchema,
  validateRequest,
  validateWebSocketPayload
} = require('./validation');

const GRAPH_HOPPER_URL = 'https://graphhopper.com/api/1/route';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// Security headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));

// CORS configuration from environment variable
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:19006', 'exp://localhost:19000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    if (corsOrigins.indexOf(origin) !== -1 || corsOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Rate limiting for route calculations
const routeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many route calculation requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Use vehicleId from body if available, fall back to IP
  skip: (req) => false
});

const PORT = process.env.PORT || 5000;
const COMMIT_SHA = process.env.COMMIT_SHA || 'unknown';
const BUILD_TIME = process.env.BUILD_TIME || new Date().toISOString();

// Off-route detection configuration
const OFF_ROUTE_DISTANCE_M = parseFloat(process.env.OFF_ROUTE_DISTANCE_M) || 50;
const OFF_ROUTE_STRIKES = parseInt(process.env.OFF_ROUTE_STRIKES) || 3;

const hazards = new Map();
const vehicles = new Map();
const activeRoutes = new Map();
// Track off-route state per vehicle: { strikes: number, lastCheck: timestamp }
const offRouteState = new Map();

const broadcastToClients = (data) => {
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
  
  // Initialize keepalive flag
  ws.isAlive = true;
  
  // Handle pong responses
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  ws.send(JSON.stringify({
    type: 'INITIAL_DATA',
    hazards: Array.from(hazards.values()),
    vehicles: Array.from(vehicles.values()),
    routes: Array.from(activeRoutes.values())
  }));

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
      
      // Handle new vehicle:position message format with validation
      if (data.type === 'vehicle:position') {
        const validation = validateWebSocketPayload(vehiclePositionSchema, data.payload);
        
        if (!validation.valid) {
          console.error('Invalid vehicle:position payload:', validation.error);
          ws.send(JSON.stringify({
            type: 'error',
            message: `Validation failed: ${validation.error}`
          }));
          return;
        }
        
        const { vehicleId, latitude, longitude, speed, heading } = validation.data;
        
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
        
        // Broadcast position to all clients
        broadcastToClients({
          type: 'vehicle:position',
          payload: validation.data
        });
        
        // Check for off-route condition
        checkOffRoute(vehicleId, { latitude, longitude });
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected from ${clientIp}`);
  });
});

// Ping/pong keepalive every 30 seconds
const keepaliveInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Terminating unresponsive WebSocket connection');
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

console.log('GraphHopper API Key configured:', !!process.env.GRAPHHOPPER_API_KEY);

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

function buildGraphHopperParams(start, end, apiKey, { instructions = true, profile = 'car' } = {}) {
  const params = new URLSearchParams();
  params.append('point', `${start.latitude},${start.longitude}`);
  params.append('point', `${end.latitude},${end.longitude}`);
  params.set('profile', profile);
  params.set('points_encoded', 'false');
  params.set('instructions', instructions ? 'true' : 'false');
  params.set('locale', 'en');
  params.set('key', apiKey);
  return params;
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

app.post('/api/hazards', validateRequest(hazardSchema), (req, res) => {
  const { type, location, description, severity, reportedBy } = req.validatedBody;

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

app.post('/api/vehicles', validateRequest(vehicleSchema), (req, res) => {
  const { name, location } = req.validatedBody;
  
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

app.post('/api/routes/calculate', routeRateLimiter, validateRequest(routeCalculationSchema), async (req, res) => {
  try {
    let { start, end, vehicleId } = req.validatedBody;

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

    const apiKey = process.env.GRAPHHOPPER_API_KEY;
    
    console.log('GraphHopper API Key configured:', !!apiKey);

    let routeData;
    let usingFallback = false;
    
    if (apiKey) {
      try {
        const params = buildGraphHopperParams(start, end, apiKey, { instructions: true, profile: 'car' });
        const response = await axios.get(`${GRAPH_HOPPER_URL}?${params.toString()}`, { timeout: 10000 });
        routeData = response.data;
        console.log('GraphHopper API Success - Using real routing');
        console.log('Route points received:', routeData.paths?.[0]?.points?.coordinates?.length || 0);
      } catch (apiError) {
        console.log('GraphHopper API failed, using fallback:', apiError.message);
        console.log('Status:', apiError.response?.status, 'Response:', apiError.response?.data);
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

    const route = {
      vehicleId: vehicleId || null,
      start,
      end,
      distance: routeData.paths?.[0]?.distance,
      duration: routeData.paths?.[0]?.time,
      coordinates: coordinates, // This should now be [{latitude, longitude}, {latitude, longitude}, ...]
      instructions: routeData.paths?.[0]?.instructions,
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
    
    const { start, end, vehicleId } = req.validatedBody;
    
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
  
  activeRoutes.forEach(async (route, vehicleId) => {
    if (route.coordinates) {
      for (const coord of route.coordinates) {
        const point = { 
          latitude: coord.latitude,
          longitude: coord.longitude
        };
        const distance = calculateDistance(point, newHazard.location);
        
        if (distance <= HAZARD_PROXIMITY_METERS) {
          console.log(`Hazard detected on route for vehicle ${vehicleId}, recalculating...`);
          
          try {
            const recalculatedRoute = await recalculateRouteForVehicle(vehicleId, route.start, route.end);
            
            broadcastToClients({
              type: 'ROUTE_HAZARD_ALERT',
              vehicleId,
              hazard: newHazard,
              distance,
              recalculatedRoute
            });
          } catch (error) {
            console.error('Route recalculation failed:', error);
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
  const apiKey = process.env.GRAPHHOPPER_API_KEY;
  let routeData;
  let usingFallback = false;
  
  try {
    if (apiKey) {
      try {
        const params = buildGraphHopperParams(start, end, apiKey, { instructions: true, profile: 'car' });
        const response = await axios.get(`${GRAPH_HOPPER_URL}?${params.toString()}`, { timeout: 10000 });
        routeData = response.data;
      } catch (apiError) {
        console.log('GraphHopper API failed during recalculation, using fallback:', apiError.message);
        console.log('Status:', apiError.response?.status, 'Response:', apiError.response?.data);
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
  res.json({
    status: 'ok',
    vehicles: vehicles.size,
    hazards: hazards.size,
    routes: activeRoutes.size,
    timestamp: new Date().toISOString()
  });
});

// Fast health check (no dependencies)
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Readiness check (includes dependency checks)
app.get('/readyz', async (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      server: 'ok',
      websocket: wss.clients.size >= 0 ? 'ok' : 'degraded',
      graphhopper: 'unknown'
    }
  };

  // Check GraphHopper availability if API key is configured
  if (process.env.GRAPHHOPPER_API_KEY) {
    try {
      const sampleStart = { latitude: 37.7749, longitude: -122.4194 };
      const sampleEnd = { latitude: 37.7849, longitude: -122.4094 };
      const params = buildGraphHopperParams(sampleStart, sampleEnd, process.env.GRAPHHOPPER_API_KEY, { 
        instructions: false, 
        profile: 'car' 
      });
      
      await axios.get(`${GRAPH_HOPPER_URL}?${params.toString()}`, { timeout: 5000 });
      checks.checks.graphhopper = 'ok';
    } catch (error) {
      checks.checks.graphhopper = 'degraded';
      checks.status = 'degraded';
      checks.graphhopperError = error.message;
    }
  } else {
    checks.checks.graphhopper = 'not_configured';
  }

  const statusCode = checks.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(checks);
});

// Version endpoint
app.get('/version', (req, res) => {
  res.json({
    version: '1.0.0',
    commitSha: COMMIT_SHA,
    buildTime: BUILD_TIME,
    nodeVersion: process.version
  });
});

app.get('/api/routing-status', async (req, res) => {
  const configured = !!process.env.GRAPHHOPPER_API_KEY;
  if (!configured) {
    return res.json({ configured: false, provider: 'graphhopper', reachable: false, message: 'No GRAPHHOPPER_API_KEY configured' });
  }

  try {
    // lightweight test: calculate a tiny route between two close points
    const sampleStart = { latitude: 37.7749, longitude: -122.4194 };
    const sampleEnd = { latitude: 37.7849, longitude: -122.4094 };

    const params = buildGraphHopperParams(sampleStart, sampleEnd, process.env.GRAPHHOPPER_API_KEY, { instructions: false, profile: 'car' });
    const response = await axios.get(`${GRAPH_HOPPER_URL}?${params.toString()}`, { timeout: 5000 });

    const pointCount = response.data.paths?.[0]?.points?.coordinates?.length || 0;
    return res.json({ configured: true, provider: 'graphhopper', reachable: true, points: pointCount });
  } catch (error) {
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
    return res.json({ configured: true, provider: 'graphhopper', reachable: false, error: errorDetails });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Fleet Navigation Backend running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
  console.log(`GraphHopper API Key: ${process.env.GRAPHHOPPER_API_KEY ? 'Configured' : 'Not configured (using fallback routing)'}`);
});

// Cleanup keepalive on server shutdown
wss.on('close', () => {
  clearInterval(keepaliveInterval);
});