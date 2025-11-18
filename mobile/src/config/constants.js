export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:5000/ws';

export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#C6C6C8',
  disabled: '#D1D1D6'
};

export const HAZARD_COLORS = {
  low: '#34C759',
  medium: '#FF9500',
  high: '#FF3B30'
};
