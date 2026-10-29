/**
 * Expo config with env-based extra (API keys).
 * API keys come from EXPO_PUBLIC_* env vars — never hardcode keys here.
 */
const appJson = require('./app.json');

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

module.exports = {
  expo: {
    ...appJson.expo,
    ios: {
      ...appJson.expo.ios,
      config: {
        googleMapsApiKey,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'PetPulse uses your location to show nearby veterinary clinics.',
      },
    },
    android: {
      ...appJson.expo.android,
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    },
    plugins: [
      ...(appJson.expo.plugins ?? []),
      '@react-native-community/datetimepicker',
      'expo-font',
      'expo-image',
      'expo-status-bar',
      'expo-web-browser',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'PetPulse uses your location to show nearby veterinary clinics.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'PetPulse uses the camera to scan food barcodes for Safe Snacker.',
        },
      ],
    ],
    extra: {
      GROQ_API_KEY: process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '',
      GOOGLE_MAPS_API_KEY: googleMapsApiKey,
    },
  },
};
