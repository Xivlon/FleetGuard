import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';

const WAYPOINT_TYPES = [
  { type: 'water_source', label: 'Water Source', icon: '💧' },
  { type: 'camp', label: 'Camp', icon: '⛺' },
  { type: 'viewpoint', label: 'Viewpoint', icon: '🔭' },
  { type: 'danger', label: 'Danger', icon: '💀' }
];

/**
 * WaypointModal component
 * Modal for creating new waypoints with name, type, and description
 */
export default function WaypointModal({ visible, location, onClose, onSubmit }) {
  const [selectedType, setSelectedType] = useState('water_source');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notificationRadius, setNotificationRadius] = useState('500');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType) {
      alert('Please select a waypoint type');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        type: selectedType,
        location,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        notificationRadius: selectedType === 'danger' ? parseInt(notificationRadius) || 500 : 500
      });

      // Reset form
      setSelectedType('water_source');
      setName('');
      setDescription('');
      setNotificationRadius('500');
      onClose();
    } catch (error) {
      console.error('Error creating waypoint:', error);
      alert('Failed to create waypoint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedType('water_source');
    setName('');
    setDescription('');
    setNotificationRadius('500');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.scrollView}>
            <Text style={styles.title}>Create Waypoint</Text>

            {location && (
              <Text style={styles.locationText}>
                📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Text>
            )}

            {/* Type selector */}
            <Text style={styles.label}>Type *</Text>
            <View style={styles.typeContainer}>
              {WAYPOINT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.type}
                  style={[
                    styles.typeButton,
                    selectedType === type.type && styles.typeButtonSelected
                  ]}
                  onPress={() => setSelectedType(type.type)}
                >
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                  <Text style={[
                    styles.typeLabel,
                    selectedType === type.type && styles.typeLabelSelected
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name input */}
            <Text style={styles.label}>Name (optional)</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Hidden Spring, Base Camp"
              placeholderTextColor="#999"
            />

            {/* Description input */}
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add details about this waypoint..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />

            {/* Notification radius for danger waypoints */}
            {selectedType === 'danger' && (
              <>
                <Text style={styles.label}>Alert Radius (meters)</Text>
                <TextInput
                  style={styles.input}
                  value={notificationRadius}
                  onChangeText={setNotificationRadius}
                  placeholder="500"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                <Text style={styles.helperText}>
                  You'll be alerted when within this distance
                </Text>
              </>
            )}

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%'
  },
  scrollView: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#f9f9f9'
  },
  typeButtonSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#E3F2FD'
  },
  typeIcon: {
    fontSize: 30,
    marginBottom: 5
  },
  typeLabel: {
    fontSize: 12,
    color: '#666'
  },
  typeLabelSelected: {
    color: '#4A90E2',
    fontWeight: '600'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic'
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 20
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  submitButton: {
    backgroundColor: '#4A90E2'
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});
