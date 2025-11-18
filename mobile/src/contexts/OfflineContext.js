import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config/constants';
import { useAuth } from './AuthContext';

const OfflineContext = createContext({});

const QUEUE_STORAGE_KEY = 'offline_message_queue';

export const OfflineProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { token } = useAuth();
  const syncTimeoutRef = useRef(null);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);
      setIsOnline(connected);

      if (connected && queue.length > 0) {
        // Debounce sync to avoid rapid syncs
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        syncTimeoutRef.current = setTimeout(() => {
          syncQueue();
        }, 1000);
      }
    });

    return () => unsubscribe();
  }, [queue.length]);

  // Load queue from storage on mount
  useEffect(() => {
    loadQueue();
  }, []);

  // Save queue to storage whenever it changes
  useEffect(() => {
    saveQueue();
  }, [queue]);

  const loadQueue = async () => {
    try {
      const storedQueue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (storedQueue) {
        setQueue(JSON.parse(storedQueue));
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  };

  const saveQueue = async () => {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  };

  const addToQueue = async (messageType, payload) => {
    const message = {
      id: Date.now().toString(),
      messageType,
      payload,
      timestamp: new Date().toISOString(),
      attempts: 0,
      status: 'pending'
    };

    setQueue(prev => [...prev, message]);

    // Try to sync immediately if online
    if (isOnline && token) {
      setTimeout(() => syncQueue(), 500);
    }

    return message.id;
  };

  const syncQueue = async () => {
    if (isSyncing || !isOnline || !token || queue.length === 0) {
      return;
    }

    setIsSyncing(true);

    const pendingMessages = queue.filter(m => m.status === 'pending' && m.attempts < 3);

    for (const message of pendingMessages) {
      try {
        await processMessage(message);

        // Remove successfully synced message
        setQueue(prev => prev.filter(m => m.id !== message.id));
      } catch (error) {
        console.error('Error syncing message:', error);

        // Increment attempt count
        setQueue(prev => prev.map(m =>
          m.id === message.id
            ? { ...m, attempts: m.attempts + 1, status: m.attempts >= 2 ? 'failed' : 'pending' }
            : m
        ));
      }
    }

    setIsSyncing(false);
  };

  const processMessage = async (message) => {
    switch (message.messageType) {
      case 'position_update':
        // WebSocket position updates are handled by WebSocket context
        break;

      case 'hazard_report':
        await axios.post(`${API_URL}/api/hazards`, message.payload);
        break;

      case 'trip_update':
        await axios.put(`${API_URL}/api/trips/${message.payload.tripId}/update`, message.payload.data);
        break;

      default:
        console.warn('Unknown message type:', message.messageType);
    }
  };

  const clearQueue = async () => {
    setQueue([]);
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
  };

  const retryFailed = async () => {
    setQueue(prev => prev.map(m =>
      m.status === 'failed'
        ? { ...m, status: 'pending', attempts: 0 }
        : m
    ));

    if (isOnline && token) {
      await syncQueue();
    }
  };

  const getPendingCount = () => {
    return queue.filter(m => m.status === 'pending').length;
  };

  const getFailedCount = () => {
    return queue.filter(m => m.status === 'failed').length;
  };

  return (
    <OfflineContext.Provider
      value={{
        isConnected,
        isOnline,
        queue,
        isSyncing,
        addToQueue,
        syncQueue,
        clearQueue,
        retryFailed,
        getPendingCount,
        getFailedCount
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export default OfflineContext;
