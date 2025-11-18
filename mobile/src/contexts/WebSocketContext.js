import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import Config from '../config/environment';

const WebSocketContext = createContext(null);

// Use environment-aware URLs
const BACKEND_URL = Config.BACKEND_URL;

const toWebSocketUrl = (url) => {
  if (!url) return null;
  let base = url;
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`;
  }
  base = base.replace(/^https:\/\//i, 'wss://').replace(/^http:\/\//i, 'ws://');
  base = base.replace(/\/+$/, '');
  return `${base}/ws`;
};

export const WebSocketProvider = ({ children }) => {
  const [vehicles, setVehicles] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [obstacles, setObstacles] = useState([]);
  const [routes, setRoutes] = useState({});
  const [connected, setConnected] = useState(false);
  const [routeAlerts, setRouteAlerts] = useState([]);
  const [backendUrl, setBackendUrl] = useState(BACKEND_URL);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
  const wsUrl = toWebSocketUrl(backendUrl);
      if (!wsUrl) {
        console.warn('WebSocket URL unavailable; skipping connection attempt');
        return;
      }

      console.log('Connecting to WebSocket URL:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
  console.log('WebSocket connected to:', wsUrl);
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'INITIAL_DATA':
              setVehicles(data.vehicles || []);
              setHazards(data.hazards || []);
              setObstacles(data.obstacles || []);
              setRoutes(data.routes || {});
              break;
              
            case 'VEHICLE_ADDED':
            case 'VEHICLE_UPDATED':
              setVehicles(prev => {
                const index = prev.findIndex(v => v.id === data.vehicle.id);
                if (index >= 0) {
                  const updated = [...prev];
                  updated[index] = data.vehicle;
                  return updated;
                } else {
                  return [...prev, data.vehicle];
                }
              });
              break;
              
            case 'HAZARD_ADDED':
              setHazards(prev => [...prev, data.hazard]);
              break;
              
            case 'HAZARD_REMOVED':
              setHazards(prev => prev.filter(h => h.id !== data.hazardId));
              break;
              
            case 'ROUTE_UPDATED':
              setRoutes(prev => ({
                ...prev,
                [data.route.vehicleId]: data.route
              }));
              break;
              
            case 'ROUTE_HAZARD_ALERT':
              console.log('Hazard detected on route:', data);
              setRouteAlerts(prev => [...prev, {
                vehicleId: data.vehicleId,
                hazard: data.hazard,
                distance: data.distance,
                timestamp: new Date().toISOString()
              }]);
              
              if (data.recalculatedRoute) {
                setRoutes(prev => ({
                  ...prev,
                  [data.vehicleId]: data.recalculatedRoute
                }));
              }
              break;

            case 'vehicle:position':
              // Echo of position updates from other clients
              // Could be used to show other vehicles on the map
              break;

            case 'route:update':
              // New route received (e.g., after re-routing)
              if (data.payload && data.payload.vehicleId && data.payload.route) {
                console.log('Route update received for vehicle:', data.payload.vehicleId);
                setRoutes(prev => ({
                  ...prev,
                  [data.payload.vehicleId]: data.payload.route
                }));
              }
              break;

            case 'OBSTACLE_ADDED':
              console.log('New obstacle reported:', data.obstacle);
              setObstacles(prev => [...prev, data.obstacle]);
              break;

            case 'OBSTACLE_UPDATED':
              console.log('Obstacle updated:', data.obstacle);
              setObstacles(prev => prev.map(o =>
                o.id === data.obstacle.id ? data.obstacle : o
              ));
              break;

            case 'OBSTACLE_RESOLVED':
              console.log('Obstacle resolved:', data.obstacleId);
              setObstacles(prev => prev.filter(o => o.id !== data.obstacleId));
              break;

            case 'OBSTACLE_ROUTE_ALERT':
              console.log('Obstacle detected on route:', data);
              setRouteAlerts(prev => [...prev, {
                vehicleId: data.vehicleId,
                obstacle: data.obstacle,
                distance: data.distance,
                timestamp: new Date().toISOString()
              }]);

              if (data.recalculatedRoute) {
                setRoutes(prev => ({
                  ...prev,
                  [data.vehicleId]: data.recalculatedRoute
                }));
              }
              break;
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  console.log('Attempted URL:', wsUrl);
      };

      ws.onclose = () => {
  console.log('WebSocket disconnected from:', wsUrl);
        setConnected(false);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [backendUrl]);

  const updateVehicleLocation = (vehicleId, location, heading, speed) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'UPDATE_VEHICLE_LOCATION',
        vehicleId,
        location,
        heading,
        speed
      }));
    }
  };

  const sendVehiclePosition = (vehicleId, latitude, longitude, speed, heading) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'vehicle:position',
        payload: {
          vehicleId,
          latitude,
          longitude,
          speed: speed || 0,
          heading: heading || 0,
          timestamp: Date.now()
        }
      }));
    }
  };

  const recalculateRoute = async (vehicleId, start, end) => {
    try {
      const response = await fetch(`${backendUrl}/api/routes/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start,
          end,
          vehicleId,
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Route recalculation error:', error);
      console.log('Attempted backend URL:', backendUrl);
      return null;
    }
  };

  return (
    <WebSocketContext.Provider value={{
      vehicles,
      hazards,
      obstacles,
      routes,
      routeAlerts,
      connected,
      updateVehicleLocation,
      sendVehiclePosition,
      recalculateRoute,
      backendUrl,
      setBackendUrl
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};
