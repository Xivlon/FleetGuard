#!/usr/bin/env node

/**
 * Postinstall script to fix metro-config issue
 * 
 * The metro-config package (v0.83.2) has a bug where index.js tries to require
 * './index.flow' but the actual file is named 'index.flow.js'.
 * 
 * This script creates a redirect file to fix the issue.
 */

const fs = require('fs');
const path = require('path');

const metroConfigPath = path.join(__dirname, '..', 'node_modules', 'metro-config', 'src');
const indexFlowPath = path.join(metroConfigPath, 'index.flow');
const indexFlowJsPath = path.join(metroConfigPath, 'index.flow.js');

try {
  // Check if metro-config exists
  if (!fs.existsSync(metroConfigPath)) {
    console.log('metro-config not found, skipping postinstall fix');
    process.exit(0);
  }

  // Check if index.flow already exists and has correct content
  if (fs.existsSync(indexFlowPath)) {
    const existingContent = fs.readFileSync(indexFlowPath, 'utf8');
    const expectedContent = 'module.exports = require("./index.flow.js");';
    if (existingContent.trim() === expectedContent.trim()) {
      console.log('index.flow already fixed, skipping');
      process.exit(0);
    }
    // If content is different, we'll overwrite it
    console.log('index.flow exists but has incorrect content, fixing...');
  }

  // Check if index.flow.js exists
  if (!fs.existsSync(indexFlowJsPath)) {
    console.log('index.flow.js not found, skipping postinstall fix');
    process.exit(0);
  }

  // Create index.flow as a redirect to index.flow.js
  const content = 'module.exports = require("./index.flow.js");';
  fs.writeFileSync(indexFlowPath, content, 'utf8');
  
  console.log('✓ Fixed metro-config: created index.flow redirect');
  process.exit(0);
} catch (error) {
  console.error('⚠ Error in postinstall script:', error.message);
  console.error('If you encounter bundling errors with metro-config, try:');
  console.error('  1. Delete node_modules and package-lock.json');
  console.error('  2. Run: npm install');
  console.error('  3. Run: npx expo start --clear');
  // Don't fail the install if this script fails
  process.exit(0);
}
