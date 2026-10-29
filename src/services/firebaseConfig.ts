/**
 * Firebase Configuration for PetPulse
 * Auth + Firestore only. No Firebase Storage (Expo Go compatible).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, Persistence, getAuth, initializeAuth } from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Exported by the React Native build of firebase/auth. The public web types omit it.
const getReactNativePersistence = (
  firebaseAuth as typeof firebaseAuth & {
    getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
  }
).getReactNativePersistence;

const firebaseConfig = {
  apiKey: 'AIzaSyD6nYayTyyP8_rDyTQnqB_p2jsoqgDPS6w',
  authDomain: 'petpulse-app-cca20.firebaseapp.com',
  projectId: 'petpulse-app-cca20',
  storageBucket: 'petpulse-app-cca20.firebasestorage.app',
  messagingSenderId: '645355271018',
  appId: '1:645355271018:web:19998a9bb9199297282b13',
  measurementId: 'G-JJJD1VF09R',
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Fast refresh re-runs this module. initializeAuth throws if Auth is already set up.
function createAuth(): Auth {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

const auth = createAuth();
const db: Firestore = getFirestore(app);

export { app, auth, db };
