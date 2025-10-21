import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { checkSDKVersions } from '../utils/sdkVersionChecker';

const COLORS = {
  warning: '#F59E0B',
  background: '#1F1F1F',
  text: '#FFFFFF',
};

/**
 * SDKVersionWarning
 * Non-blocking warning banner for SDK/unimodule version drift
 */
export default function SDKVersionWarning() {
  const [versionCheck, setVersionCheck] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check versions on mount
    const result = checkSDKVersions();
    setVersionCheck(result);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't show if no issues, not yet checked, or dismissed
  if (!versionCheck || !versionCheck.hasIssues || dismissed) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.title}>⚠️ SDK Version Warning</Text>
        <Text style={styles.message}>
          Some packages may be out of sync with your Expo SDK version:
        </Text>
        
        {versionCheck.incompatiblePackages.slice(0, 3).map((pkg, index) => (
          <Text key={index} style={styles.packageInfo}>
            • {pkg.name}: installed {pkg.installed}, expected {pkg.expected}
          </Text>
        ))}
        
        {versionCheck.incompatiblePackages.length > 3 && (
          <Text style={styles.packageInfo}>
            ...and {versionCheck.incompatiblePackages.length - 3} more
          </Text>
        )}
        
        <Text style={styles.hint}>
          Run `npx expo install --fix` to resolve version conflicts.
        </Text>
        
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
        >
          <Text style={styles.buttonText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 998,
    elevation: 998,
  },
  banner: {
    backgroundColor: COLORS.warning,
    padding: 16,
    paddingTop: 50, // Account for status bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  packageInfo: {
    fontSize: 12,
    color: COLORS.text,
    marginLeft: 8,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  hint: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  dismissButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
