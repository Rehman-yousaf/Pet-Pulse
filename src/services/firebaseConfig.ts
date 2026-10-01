/**
 * Firebase Configuration for PetPulse
 * Auth + Firestore only. No Firebase Storage (Expo Go compatible).
 */

import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyD6nYayTyyP8_rDyTQnqB_p2jsoqgDPS6w',
  authDomain: 'petpulse-app-cca20.firebaseapp.com',
  projectId: 'petpulse-app-cca20',
  storageBucket: 'petpulse-app-cca20.firebasestorage.app',
  messagingSenderId: '645355271018',
  appId: '1:645355271018:web:19998a9bb9199297282b13',
  measurementId: 'G-JJJD1VF09R',
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  app = getApps()[0] as FirebaseApp;
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };
