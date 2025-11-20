/**
 * Geocoding service using Nominatim (OpenStreetMap)
 * Free geocoding API that doesn't require an API key
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Convert a location name/address to coordinates
 * @param {string} locationName - Location name or address to search for
 * @returns {Promise<{latitude: number, longitude: number, displayName: string}>}
 */
export async function geocodeLocation(locationName) {
  if (!locationName || locationName.trim() === '') {
    throw new Error('Location name is required');
  }

  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`,
      {
        headers: {
          'User-Agent': 'FleetGuard Mobile App', // Nominatim requires a User-Agent
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error('Location not found. Please try a different search term.');
    }

    const result = data[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

/**
 * Convert coordinates to a location name (reverse geocoding)
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<string>}
 */
export async function reverseGeocode(latitude, longitude) {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'User-Agent': 'FleetGuard Mobile App',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.display_name) {
      throw new Error('Unable to determine location name');
    }

    return data.display_name;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
}
