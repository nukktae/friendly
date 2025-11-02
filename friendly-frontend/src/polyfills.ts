// Essential polyfills for React Native
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Minimal polyfills - only add what's absolutely necessary
if (typeof global !== 'undefined') {
  // Only polyfill process if it's completely missing and needed
  if (typeof (global as any).process === 'undefined') {
    try {
      (global as any).process = require('process');
    } catch (e) {
      // If process polyfill fails, create a minimal one
      (global as any).process = { 
        env: {},
        nextTick: (fn: Function) => setTimeout(fn, 0),
        version: 'v16.0.0'
      };
    }
  }
}
