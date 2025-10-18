import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useWebSocket } from '../contexts/WebSocketContext';

const COLORS = {
  primary: '#10B981',
  secondary: '#059669',
  background: '#000000',
  card: '#1F1F1F',
  text: '#FFFFFF',
  border: '#10B981',
};

const HAZARD_TYPES = [
  'Accident',
  'Road Closure',
  'Heavy Traffic',
  'Weather Condition',
  'Road Work',
  'Vehicle Breakdown',
  'Debris',
  'Other',
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: '#10B981' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
];

export default function ReportHazardScreen({ navigation }) {
  const { backendUrl } = useWebSocket();
  const [selectedType, setSelectedType] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [latitude, setLatitude] = useState('37.7749');
  const [longitude, setLongitude] = useState('-122.4194');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select a hazard type');
      return;
    }

    if (!latitude || !longitude) {
      Alert.alert('Error', 'Please enter location coordinates');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${backendUrl}/api/hazards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          location: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          },
          description,
          severity,
          reportedBy: reporterName || 'anonymous',
        }),
      });

      if (response.ok) {
        Alert.alert(
          'Success',
          'Hazard reported successfully. Other drivers will be notified.',
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
        throw new Error('Failed to report hazard');
      }
    } catch (error) {
      console.error('Hazard report error:', error);
      Alert.alert('Error', 'Failed to report hazard. Please try again.');
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
        <Text style={styles.sectionTitle}>Hazard Type</Text>
        <View style={styles.typeGrid}>
          {HAZARD_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                selectedType === type && styles.typeButtonActive,
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  selectedType === type && styles.typeButtonTextActive,
                ]}
              >
                {type}
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

        <Text style={styles.sectionTitle}>Description (Optional)</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Provide additional details about the hazard..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.sectionTitle}>Your Name (Optional)</Text>
        <TextInput
          style={styles.input}
          value={reporterName}
          onChangeText={setReporterName}
          placeholder="Enter your name or leave blank for anonymous"
          placeholderTextColor="#666"
        />

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Report Hazard'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Your report will be shared with all drivers in the fleet and used to
            alert them of potential hazards on their routes.
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    minWidth: '30%',
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
