const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Configure Metro for monorepo structure
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Set the project root explicitly
config.projectRoot = projectRoot;
config.watchFolders = [workspaceRoot];

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
  // Resolve the entry point to the correct location
  resolveRequest: (context, moduleName, platform) => {
    // If trying to import from expo/AppEntry, redirect to our custom entry point
    if (moduleName === 'expo/AppEntry' || moduleName === './node_modules/expo/AppEntry') {
      return {
        filePath: path.resolve(projectRoot, 'index.js'),
        type: 'sourceFile',
      };
    }
    // Use default resolver for all other modules
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Configure Metro for better local development
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Enable CORS for local development
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
