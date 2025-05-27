const { expect: jestExpect } = require('@jest/globals');
global.expect = jestExpect;

// Mock expo-font
jest.mock('expo-font', () => ({
  useFonts: () => [true],
}));

// Mock expo-splash-screen
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  },
  CameraView: 'CameraView',
}));

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          playAsync: jest.fn(),
          unloadAsync: jest.fn(),
        },
      }),
    },
  },
}));

// Mock react-native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn(obj => obj.ios),
  },
  Dimensions: {
    get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
  },
  BackHandler: {
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
  StyleSheet: {
    create: jest.fn(styles => styles),
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({
    id: '123',
  }),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock console.error to avoid noisy output
console.error = jest.fn();

// Import and set up @testing-library/jest-native
require('@testing-library/jest-native/extend-expect');