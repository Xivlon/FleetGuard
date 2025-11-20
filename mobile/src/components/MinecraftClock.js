import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * MinecraftClock component
 * Displays a Minecraft-style clock with day/night cycle (Green/Black Theme)
 * Dawn: 5:00-7:00 (Light green sunrise 🌅)
 * Day: 7:00-17:00 (Green sky with sun ☀️)
 * Dusk: 17:00-19:00 (Dark green sunset 🌇)
 * Night: 19:00-5:00 (Black sky with moon 🌙)
 */
export default function MinecraftClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  const getTimeOfDay = (date) => {
    const hours = date.getHours();

    if (hours >= 5 && hours < 7) {
      return 'dawn';
    } else if (hours >= 7 && hours < 17) {
      return 'day';
    } else if (hours >= 17 && hours < 19) {
      return 'dusk';
    } else {
      return 'night';
    }
  };

  const getTimeInfo = (date) => {
    const timeOfDay = getTimeOfDay(date);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    const configs = {
      dawn: {
        icon: '🌅',
        label: 'Dawn',
        skyColor: '#34D399', // Light green
        textColor: '#000'     // Black text for contrast
      },
      day: {
        icon: '☀️',
        label: 'Day',
        skyColor: '#10B981', // Primary green
        textColor: '#fff'     // White text
      },
      dusk: {
        icon: '🌇',
        label: 'Dusk',
        skyColor: '#059669', // Secondary green
        textColor: '#fff'     // White text
      },
      night: {
        icon: '🌙',
        label: 'Night',
        skyColor: '#000000', // Black
        textColor: '#10B981' // Green text
      }
    };

    return {
      timeString,
      ...configs[timeOfDay]
    };
  };

  const getRotation = (date) => {
    // Calculate rotation based on time (360 degrees over 24 hours)
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const rotation = (totalMinutes / 1440) * 360; // 1440 minutes in a day
    return rotation;
  };

  const timeInfo = getTimeInfo(currentTime);
  const rotation = getRotation(currentTime);

  return (
    <View style={[styles.container, { backgroundColor: timeInfo.skyColor }]}>
      {/* Rotating celestial body */}
      <View
        style={[
          styles.celestialBody,
          { transform: [{ rotate: `${rotation}deg` }] }
        ]}
      >
        <Text style={styles.celestialIcon}>{timeInfo.icon}</Text>
      </View>

      {/* Time display */}
      <View style={styles.timeContainer}>
        <Text style={[styles.timeText, { color: timeInfo.textColor }]}>
          {timeInfo.timeString}
        </Text>
        <Text style={[styles.labelText, { color: timeInfo.textColor }]}>
          {timeInfo.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#10B981', // Green border
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  celestialBody: {
    position: 'absolute',
    top: -10,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center'
  },
  celestialIcon: {
    fontSize: 24
  },
  timeContainer: {
    position: 'absolute',
    bottom: 8,
    alignItems: 'center'
  },
  timeText: {
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  },
  labelText: {
    fontSize: 8,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  }
});
