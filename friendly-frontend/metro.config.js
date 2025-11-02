const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add resolver configuration for essential Node.js modules only
config.resolver.alias = {
  ...config.resolver.alias,
  'fs': 'react-native-fs',
  'path': 'path-browserify',
  'url': 'react-native-url-polyfill',
};

// Disable problematic Node.js polyfills that conflict with React Native
config.resolver.alias = {
  ...config.resolver.alias,
  'events': false,
  'util': false,
  'stream': false,
  'http2': false,
  'net': false,
  'tls': false,
  'os': false,
  'querystring': false,
  'process': false,
  'buffer': false,
};

// Block googleapis from loading http2 and related modules
config.resolver.alias = {
  ...config.resolver.alias,
  'http2': false,
  'googleapis': false,
};

// Add resolver to block problematic modules
config.resolver.blockList = [
  /node_modules\/http2\/.*/,
  /node_modules\/googleapis\/.*/,
];

// Add node modules that should be polyfilled
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = withNativeWind(config, { input: './global.css' });
