import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, COLORS } from '../config/constants';

// Combined types for both hazards and obstacles
const REPORT_TYPES = [
  { value: 'accident', label: '🚗 Accident', icon: '🚗💥' },
  { value: 'road_closure', label: '🚫 Road Closure', icon: '🚫' },
  { value: 'traffic_jam', label: '🚦 Heavy Traffic', icon: '🚦' },
  { value: 'weather', label: '🌧️ Weather', icon: '🌧️' },
  { value: 'construction', label: '🚧 Road Work', icon: '🚧' },
  { value: 'debris', label: '⚠️ Debris', icon: '⚠️' },
  { value: 'other', label: '❓ Other', icon: '❓' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: '#10B981' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
  { value: 'critical', label: 'Critical', color: '#8B0000' },
];

export default function ReportHazardScreen({ route, navigation }) {
  const { backendUrl } = useWebSocket();
  const { token } = useAuth();
  const { location } = route?.params || {};
  
  const [selectedType, setSelectedType] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [latitude, setLatitude] = useState(location?.latitude?.toString() || '37.7749');
  const [longitude, setLongitude] = useState(location?.longitude?.toString() || '-122.4194');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [radius, setRadius] = useState('100');
  const [submitting, setSubmitting] = useState(false);
  const [reportAsObstacle, setReportAsObstacle] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select a report type');
      return;
    }

    if (!latitude || !longitude) {
      Alert.alert('Error', 'Please enter location coordinates');
      return;
    }

    if (reportAsObstacle && !description.trim()) {
      Alert.alert('Error', 'Please provide a description for obstacle reports');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = reportAsObstacle ? '/api/obstacles' : '/api/hazards';
      const url = reportAsObstacle ? `${API_URL}${endpoint}` : `${backendUrl}${endpoint}`;
      
      const payload = {
        type: selectedType,
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
        description: description.trim(),
        severity,
      };

      // Add obstacle-specific fields
      if (reportAsObstacle) {
        payload.radius = parseInt(radius) || 100;
      } else {
        // Add hazard-specific fields
        payload.reportedBy = reporterName || 'anonymous';
      }

      let response;
      if (reportAsObstacle && token) {
        // Use axios for obstacles (requires auth)
        const axios = require('axios');
        response = await axios.post(url, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Use fetch for hazards
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const success = reportAsObstacle ? true : response.ok;
      
      if (success) {
        const reportType = reportAsObstacle ? 'Obstacle' : 'Hazard';
        Alert.alert(
          'Success',
          `${reportType} reported successfully. Other drivers will be notified.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedType('');
                setDescription('');
                setReporterName('');
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        throw new Error(`Failed to report ${reportAsObstacle ? 'obstacle' : 'hazard'}`);
      }
    } catch (error) {
      console.error('Report error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const useCurrentLocation = () => {
    Alert.alert(
      'Demo Mode',
      'In production, this would use GPS. Using default location for demo.'
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Report as Obstacle (detailed tracking)</Text>
          <Switch
            value={reportAsObstacle}
            onValueChange={setReportAsObstacle}
            trackColor={{ false: '#767577', true: COLORS.primary }}
            thumbColor={reportAsObstacle ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        <Text style={styles.sectionTitle}>
          {reportAsObstacle ? 'Obstacle' : 'Hazard'} Type
        </Text>
        <View style={styles.typeGrid}>
          {REPORT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeButton,
                selectedType === type.value && styles.typeButtonActive,
              ]}
              onPress={() => setSelectedType(type.value)}
            >
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <Text
                style={[
                  styles.typeButtonText,
                  selectedType === type.value && styles.typeButtonTextActive,
                ]}
              >
                {type.label.split(' ').slice(1).join(' ') || type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Severity</Text>
        <View style={styles.severityContainer}>
          {SEVERITY_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.severityButton,
                severity === level.value && { borderColor: level.color, borderWidth: 3 },
              ]}
              onPress={() => setSeverity(level.value)}
            >
              <View
                style={[
                  styles.severityIndicator,
                  { backgroundColor: level.color },
                ]}
              />
              <Text style={styles.severityButtonText}>{level.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.locationContainer}>
          <View style={styles.coordRow}>
            <TextInput
              style={styles.input}
              value={latitude}
              onChangeText={setLatitude}
              placeholder="Latitude"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              value={longitude}
              onChangeText={setLongitude}
              placeholder="Longitude"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
          </View>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={useCurrentLocation}
          >
            <Text style={styles.locationButtonText}>
              📍 Use Current Location
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          Description {reportAsObstacle ? '*' : '(Optional)'}
        </Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder={`Provide additional details about the ${reportAsObstacle ? 'obstacle' : 'hazard'}...`}
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
        />

        {reportAsObstacle && (
          <>
            <Text style={styles.sectionTitle}>Affected Radius (meters)</Text>
            <TextInput
              style={styles.input}
              value={radius}
              onChangeText={setRadius}
              placeholder="100"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
          </>
        )}

        {!reportAsObstacle && (
          <>
            <Text style={styles.sectionTitle}>Your Name (Optional)</Text>
            <TextInput
              style={styles.input}
              value={reporterName}
              onChangeText={setReporterName}
              placeholder="Enter your name or leave blank for anonymous"
              placeholderTextColor="#666"
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              Report {reportAsObstacle ? 'Obstacle' : 'Hazard'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {reportAsObstacle 
              ? 'Obstacle reports include detailed tracking with affected radius and are stored in the database for analysis.'
              : 'Your report will be shared with all drivers in the fleet and used to alert them of potential hazards on their routes.'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  form: {
    padding: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  toggleLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    minWidth: '30%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  typeButtonText: {
    color: COLORS.text,
    fontSize: 14,
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  severityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  severityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
  },
  severityIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  severityButtonText: {
    color: COLORS.text,
    fontSize: 14,
  },
  locationContainer: {
    marginBottom: 8,
  },
  coordRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    fontSize: 14,
  },
  locationButton: {
    backgroundColor: COLORS.secondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  locationButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  textArea: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
  },
});
