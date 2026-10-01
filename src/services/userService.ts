/**
 * User profile & notification settings in Firestore.
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const USERS_COLLECTION = 'users';
const NOTIFICATION_SETTINGS_DOC = 'settings';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface UserProfileData {
  displayName?: string;
  email?: string;
  preferences?: {
    theme?: ThemePreference;
  };
}

export interface NotificationSettingsData {
  meds: boolean;
  diet: boolean;
  vaccines: boolean;
  community: boolean;
}

const userDoc = (userId: string) => doc(db, USERS_COLLECTION, userId);
const notificationSettingsRef = (userId: string) =>
  doc(db, USERS_COLLECTION, userId, 'notificationSettings', NOTIFICATION_SETTINGS_DOC);

export async function getUserProfile(userId: string): Promise<UserProfileData | null> {
  const snap = await getDoc(userDoc(userId));
  if (!snap.exists()) return null;
  return snap.data() as UserProfileData;
}

export async function updateUserProfile(
  userId: string,
  data: { displayName?: string; preferences?: { theme?: ThemePreference } }
): Promise<void> {
  const ref = userDoc(userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, data);
  } else {
    await setDoc(ref, data, { merge: true });
  }
}

export async function getNotificationSettings(userId: string): Promise<NotificationSettingsData> {
  const snap = await getDoc(notificationSettingsRef(userId));
  if (!snap.exists()) {
    return { meds: true, diet: true, vaccines: true, community: true };
  }
  const d = snap.data();
  return {
    meds: d.meds ?? true,
    diet: d.diet ?? true,
    vaccines: d.vaccines ?? true,
    community: d.community ?? true,
  };
}

export async function setNotificationSettings(
  userId: string,
  data: NotificationSettingsData
): Promise<void> {
  await setDoc(notificationSettingsRef(userId), data, { merge: true });
}
