module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Sentry plugin for source maps and error tracking
      '@sentry/react-native/dist/js/tools/sentryBabelPlugin',
    ],
  };
};
