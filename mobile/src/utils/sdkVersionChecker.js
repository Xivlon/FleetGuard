/**
 * SDK Version Checker
 * Compares installed package versions with Expo's bundledNativeModules.json
 * to detect drift in critical unimodules.
 */

// Critical packages that should be checked
const CRITICAL_PACKAGES = [
  'expo-location',
  'expo-status-bar',
  'react-native-maps',
  'react-native-gesture-handler',
  'react-native-safe-area-context',
  'react-native-screens',
  '@react-navigation/native',
  '@react-navigation/stack',
];

/**
 * Parse semver version and check if installed version is within bundled range
 * @param {string} installed - Installed version (e.g., "19.0.7")
 * @param {string} bundled - Bundled version range (e.g., "~19.0.7", "^19.0.7", "19.0.7")
 * @returns {boolean} - true if versions are compatible
 */
function isVersionCompatible(installed, bundled) {
  if (!installed || !bundled) return true; // Skip if either is missing
  
  // Remove any 'v' prefix
  installed = installed.replace(/^v/, '');
  bundled = bundled.replace(/^v/, '');
  
  // Exact match
  if (installed === bundled) return true;
  
  // Parse version parts
  const parseVersion = (ver) => {
    const match = ver.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
    };
  };
  
  const installedVer = parseVersion(installed);
  const bundledVer = parseVersion(bundled);
  
  if (!installedVer || !bundledVer) return true; // Can't parse, assume compatible
  
  // Check based on range indicator
  if (bundled.startsWith('~')) {
    // Tilde (~) allows patch-level changes
    return installedVer.major === bundledVer.major &&
           installedVer.minor === bundledVer.minor;
  } else if (bundled.startsWith('^')) {
    // Caret (^) allows minor-level changes
    return installedVer.major === bundledVer.major;
  }
  
  // No range indicator, check for exact match or close proximity
  return installedVer.major === bundledVer.major &&
         installedVer.minor === bundledVer.minor;
}

/**
 * Check SDK versions against bundled native modules
 * @returns {Object} - { hasIssues: boolean, incompatiblePackages: Array }
 */
export function checkSDKVersions() {
  try {
    // Import bundled native modules from expo
    const bundledNativeModules = require('expo/bundledNativeModules.json');
    
    // Import installed package versions
    const packageJson = require('../../package.json');
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const incompatiblePackages = [];
    
    // Check each critical package
    CRITICAL_PACKAGES.forEach((packageName) => {
      const installed = dependencies[packageName];
      const bundled = bundledNativeModules[packageName];
      
      if (installed && bundled) {
        const compatible = isVersionCompatible(installed, bundled);
        
        if (!compatible) {
          incompatiblePackages.push({
            name: packageName,
            installed,
            expected: bundled,
          });
        }
      }
    });
    
    return {
      hasIssues: incompatiblePackages.length > 0,
      incompatiblePackages,
    };
  } catch (error) {
    console.error('Error checking SDK versions:', error);
    return {
      hasIssues: false,
      incompatiblePackages: [],
    };
  }
}
