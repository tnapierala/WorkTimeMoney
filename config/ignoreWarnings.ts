import { LogBox } from 'react-native';

const ignoredPatterns = [
  'SafeAreaView has been deprecated',
  'expo-notifications: Android Push notifications',
  'expo-notifications: DevicePushTokenAutoRegistration',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications:',
];

// Configure LogBox for on-device UI
LogBox.ignoreLogs(ignoredPatterns);

// Helper to check if log arguments contain any ignored pattern
const shouldIgnore = (args: any[]) => {
  try {
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.message + '\n' + (arg.stack || '');
      return String(arg);
    }).join(' ');
    return ignoredPatterns.some(pattern => message.includes(pattern));
  } catch {
    return false;
  }
};

// Monkey-patch console.warn to silence terminal outputs
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (shouldIgnore(args)) {
    return;
  }
  originalWarn(...args);
};

// Monkey-patch console.error to silence terminal outputs
const originalError = console.error;
console.error = (...args: any[]) => {
  if (shouldIgnore(args)) {
    return;
  }
  originalError(...args);
};
