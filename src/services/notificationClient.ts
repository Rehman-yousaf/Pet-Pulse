/**
 * Local notification APIs, loaded without the expo-notifications package entry.
 * That entry starts Android push registration, which Expo Go rejects on SDK 53+.
 * Remote push is imported only when the app is not running in Expo Go.
 */
import { isRunningInExpoGo } from 'expo';
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
} from 'expo-notifications/build/NotificationsEmitter';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications/build/NotificationPermissions';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import type { ExpoPushTokenOptions } from 'expo-notifications/build/Tokens.types';

export {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  cancelScheduledNotificationAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  SchedulableTriggerInputTypes,
  setNotificationHandler,
};

export function isExpoGo(): boolean {
  return isRunningInExpoGo();
}

export async function getExpoPushTokenAsync(options?: ExpoPushTokenOptions) {
  if (isRunningInExpoGo()) {
    return null;
  }
  const push = await import('expo-notifications/build/getExpoPushTokenAsync');
  return push.getExpoPushTokenAsync(options);
}
