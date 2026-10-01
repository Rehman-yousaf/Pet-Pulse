# PetPulseClean — Production Readiness Checklist

Use this before EAS build or store submission.

## EAS Build
- [ ] Run `eas build:configure` if not done
- [ ] Set `EXPO_PUBLIC_GROQ_API_KEY` and `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in EAS Secrets or env
- [ ] Test production build locally: `eas build --profile preview`

## Android
- [ ] `app.json` / `app.config.js`: Android permissions (location, notifications) declared
- [ ] Google Maps: ensure API key has Android app restriction if needed
- [ ] Notification channels configured for Android (expo-notifications)

## iOS
- [ ] Location usage description in app.json / Info.plist
- [ ] Notification permissions usage description
- [ ] Google Maps: ensure API key has iOS app restriction if needed
- [ ] Capabilities: Push Notifications if using remote push

## Notifications (Production)
- [ ] expo-notifications: local notifications work in standalone build
- [ ] If using push: configure FCM (Android) / APNs (iOS) and credentials in EAS
- [ ] Test notification tap → opens app / deep link

## Google Maps & Billing
- [ ] Google Cloud: Maps SDK for Android enabled
- [ ] Google Cloud: Maps SDK for iOS enabled
- [ ] Google Cloud: Places API enabled
- [ ] Billing enabled on project (required for Places / Maps usage)
- [ ] API key restricted by app package name / bundle ID

## Firestore
- [ ] Deploy Firestore security rules: `firebase deploy --only firestore`
- [ ] Indexes: create any composite indexes suggested by Firestore errors (e.g. posts `createdAt` desc; comments `createdAt` asc)
- [ ] Test rules in Firebase Console Rules Playground

## Environment & Security
- [ ] No API keys hardcoded; all use `process.env.EXPO_PUBLIC_*` or EAS Secrets
- [ ] `.env` in `.gitignore`; keys only in EAS or CI env

## Runtime
- [ ] ErrorBoundary wraps app (handles Firebase, network, Groq, Maps errors)
- [ ] All Firestore subscriptions unsubscribe on unmount
- [ ] Notification listeners removed on unmount
