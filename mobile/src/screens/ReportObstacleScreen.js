import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, COLORS } from '../config/constants';

const OBSTACLE_TYPES = [
  { value: 'accident', label: '🚗 Accident', icon: '🚗💥' },
  { value: 'construction', label: '🚧 Construction', icon: '🚧' },
  { value: 'road_closure', label: '🚫 Road Closure', icon: '🚫' },
  { value: 'debris', label: '⚠️ Debris', icon: '⚠️' },
  { value: 'weather', label: '🌧️ Weather', icon: '🌧️' },
  { value: 'traffic_jam', label: '🚦 Traffic Jam', icon: '🚦' },
  { value: 'other', label: '⚠️ Other', icon: '⚠️' }
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: '#FFCC00' },
  { value: 'medium', label: 'Medium', color: '#FF9500' },
  { value: 'high', label: 'High', color: '#FF3B30' },
  { value: 'critical', label: 'Critical', color: '#8B0000' }
];

export default function ReportObstacleScreen({ route, navigation }) {
  const { location } = route.params || {};
  const { token } = useAuth();

  const [obstacleType, setObstacleType] = useState('other');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [radius, setRadius] = useState('100');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!location) {
      Alert.alert('Error', 'Location is required to report an obstacle');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/obstacles`, {
        type: obstacleType,
        location: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        severity,
        description: description.trim(),
        radius: parseInt(radius) || 100
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert(
        'Success',
        'Obstacle reported successfully. Other drivers will be notified.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error reporting obstacle:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to report obstacle'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Report Obstacle</Text>
        <Text style={styles.subtitle}>Help other drivers by reporting road obstacles</Text>

        {/* Obstacle Type */}
        <Text style={styles.label}>Type of Obstacle *</Text>
        <View style={styles.typeGrid}>
          {OBSTACLE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeButton,
                obstacleType === type.value && styles.typeButtonActive
              ]}
              onPress={() => setObstacleType(type.value)}
            >
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <Text style={[
                styles.typeLabel,
                obstacleType === type.value && styles.typeLabelActive
              ]}>
                {type.label.split(' ')[1] || type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Severity */}
        <Text style={styles.label}>Severity *</Text>
        <View style={styles.severityContainer}>
          {SEVERITY_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.severityButton,
                { borderColor: level.color },
                severity === level.value && { backgroundColor: level.color }
              ]}
              onPress={() => setSeverity(level.value)}
            >
              <Text style={[
                styles.severityText,
                severity === level.value && styles.severityTextActive
              ]}>
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe the obstacle..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
        />

        {/* Affected Radius */}
        <Text style={styles.label}>Affected Radius (meters)</Text>
        <TextInput
          style={styles.input}
          placeholder="100"
          value={radius}
          onChangeText={setRadius}
          keyboardType="numeric"
        />

        {/* Location Info */}
        {location && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Location:</Text>
            <Text style={styles.locationText}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Report Obstacle</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  content: {
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 16
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  typeButton: {
    width: '30%',
    aspectRatio: 1,
    margin: '1.5%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8
  },
  typeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}20`
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 4
  },
  typeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center'
  },
  typeLabelActive: {
    color: COLORS.primary,
    fontWeight: '600'
  },
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  severityButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center'
  },
  severityText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text
  },
  severityTextActive: {
    color: '#fff'
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: COLORS.text
  },
  textArea: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top'
  },
  locationInfo: {
    backgroundColor: `${COLORS.info}20`,
    padding: 12,
    borderRadius: 8,
    marginTop: 16
  },
  locationLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: COLORS.text
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
