/**
 * Expo config with env-based extra (API keys).
 * API keys come from EXPO_PUBLIC_* env vars — never hardcode keys here.
 */
const appJson = require('./app.json');

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      GROQ_API_KEY: process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '',
      GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    },
  },
};
