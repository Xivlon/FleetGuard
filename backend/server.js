const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const hazards = new Map();
const vehicles = new Map();
const activeRoutes = new Map();

const broadcastToClients = (data) => {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  
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
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

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
    const { start, end, vehicleId } = req.body;

    if (!start || !end || !start.latitude || !start.longitude || !end.latitude || !end.longitude) {
      return res.status(400).json({ error: 'Invalid start or end coordinates' });
    }

    const graphHopperUrl = 'https://graphhopper.com/api/1/route';
     const apiKey = process.env.GRAPHHOPPER_API_KEY;

    let routeData;
    
    if (apiKey) {
      const response = await axios.get(graphHopperUrl, {
        params: {
          point: [`${start.latitude},${start.longitude}`, `${end.latitude},${end.longitude}`],
          vehicle: 'car',
          locale: 'en',
          key: apiKey,
          points_encoded: false,
          instructions: true
        }
      });
      routeData = response.data;
    } else {
      routeData = generateFallbackRoute(start, end);
    }

    const route = {
      vehicleId: vehicleId || null,
      start,
      end,
      distance: routeData.paths?.[0]?.distance || calculateDistance(start, end),
      duration: routeData.paths?.[0]?.time || estimateDuration(start, end),
      coordinates: routeData.paths?.[0]?.points?.coordinates || generateStraightLine(start, end),
      instructions: routeData.paths?.[0]?.instructions || generateBasicInstructions(start, end),
      timestamp: new Date().toISOString()
    };

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
    const fallbackRoute = generateFallbackRoute(start, end);
    
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
        coordinates: generateStraightLine(start, end)
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

function estimateDuration(start, end) {
  const distance = calculateDistance(start, end);
  const avgSpeed = 50000 / 3600;
  return (distance / avgSpeed) * 1000;
}

function generateStraightLine(start, end) {
  const steps = 10;
  const coordinates = [];
  
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    coordinates.push([
      start.longitude + (end.longitude - start.longitude) * fraction,
      start.latitude + (end.latitude - start.latitude) * fraction
    ]);
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
        const point = { latitude: coord[1], longitude: coord[0] };
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

async function recalculateRouteForVehicle(vehicleId, start, end) {
 const apiKey = process.env.GRAPHHOPPER_API_KEY;
  
  try {
    let routeData;
    
    if (apiKey) {
      const graphHopperUrl = 'https://graphhopper.com/api/1/route';
      const response = await axios.get(graphHopperUrl, {
        params: {
          point: [`${start.latitude},${start.longitude}`, `${end.latitude},${end.longitude}`],
          vehicle: 'car',
          locale: 'en',
          key: apiKey,
          points_encoded: false,
          instructions: true
        }
      });
      routeData = response.data;
    } else {
      routeData = generateFallbackRoute(start, end);
    }

    const route = {
      vehicleId,
      start,
      end,
      distance: routeData.paths?.[0]?.distance || calculateDistance(start, end),
      duration: routeData.paths?.[0]?.time || estimateDuration(start, end),
      coordinates: routeData.paths?.[0]?.points?.coordinates || generateStraightLine(start, end),
      instructions: routeData.paths?.[0]?.instructions || generateBasicInstructions(start, end),
      timestamp: new Date().toISOString(),
      recalculated: true
    };

    activeRoutes.set(vehicleId, route);
    
    broadcastToClients({
      type: 'ROUTE_UPDATED',
      route
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Fleet Navigation Backend running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
  console.log(`GraphHopper API Key: ${process.env.GRAPHHOPPER_API_KEY? 'Configured' : 'Not configured (using fallback routing)'}`);
});
