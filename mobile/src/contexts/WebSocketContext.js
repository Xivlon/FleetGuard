import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import Config from '../config/environment'; // ← Add this import

const WebSocketContext = createContext(null);

// Use the config instead of hardcoded values
const BACKEND_URL = 'http://172.16.6.175:5000';
const WS_URL = BACKEND_URL.replace('http', 'ws');

export const WebSocketProvider = ({ children }) => {
  const [vehicles, setVehicles] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [routes, setRoutes] = useState({});
  const [connected, setConnected] = useState(false);
  const [routeAlerts, setRouteAlerts] = useState([]);
  const [backendUrl, setBackendUrl] = useState(BACKEND_URL); // ← Add state for dynamic URL
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = () => {
    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('WebSocket connected to:', WS_URL);
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'INITIAL_DATA':
              setVehicles(data.vehicles || []);
              setHazards(data.hazards || []);
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
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.log('Attempted URL:', WS_URL);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected from:', WS_URL);
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
  }, []);

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
      routes,
      routeAlerts,
      connected,
      updateVehicleLocation,
      recalculateRoute,
      backendUrl: backendUrl // ← Use the state variable
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
