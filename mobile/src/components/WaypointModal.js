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
              placeholderTextColor="#666"
            />

            {/* Description input */}
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add details about this waypoint..."
              placeholderTextColor="#666"
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
                  placeholderTextColor="#666"
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end'
  },
  modalContainer: {
    backgroundColor: '#1F1F1F', // Dark background
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 3,
    borderTopColor: '#10B981', // Green border
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
    textAlign: 'center',
    color: '#10B981' // Green text
  },
  locationText: {
    fontSize: 12,
    color: '#10B981', // Green text
    textAlign: 'center',
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#fff' // White text
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
    borderColor: '#333',      // Dark border
    alignItems: 'center',
    backgroundColor: '#000'   // Black background
  },
  typeButtonSelected: {
    borderColor: '#10B981',   // Green border
    backgroundColor: '#1F1F1F' // Dark gray background
  },
  typeIcon: {
    fontSize: 30,
    marginBottom: 5
  },
  typeLabel: {
    fontSize: 12,
    color: '#999'             // Light gray text
  },
  typeLabelSelected: {
    color: '#10B981',         // Green text
    fontWeight: '600'
  },
  input: {
    borderWidth: 1,
    borderColor: '#10B981',   // Green border
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#000',  // Black background
    color: '#fff'             // White text
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  helperText: {
    fontSize: 12,
    color: '#10B981',         // Green text
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
    backgroundColor: '#000',  // Black background
    borderWidth: 2,
    borderColor: '#333'       // Dark border
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999'             // Light gray text
  },
  submitButton: {
    backgroundColor: '#10B981' // Green background
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000'             // Black text for contrast
  }
});
