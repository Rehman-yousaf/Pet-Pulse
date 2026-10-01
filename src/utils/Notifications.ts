import * as Device from 'expo-device';
import Constants from 'expo-constants';

import {
  getExpoPushTokenAsync,
  getPermissionsAsync,
  isExpoGo,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  SchedulableTriggerInputTypes,
  setNotificationHandler,
} from '@/src/services/notificationClient';

setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  const { status: existingStatus } = await getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.warn('Notification permissions denied.');
    return null;
  }

  if (Device.isDevice && !isExpoGo()) {
    try {
      const token = await getExpoPushTokenAsync({
        projectId: (Constants.expoConfig?.extra as { eas?: { projectId?: string } })?.eas?.projectId,
      });
      if (__DEV__) console.log('Push token:', token?.data);
      return token?.data ?? null;
    } catch (e) {
      if (__DEV__) console.warn('Push token error:', e);
      return null;
    }
  }
  if (__DEV__) console.log('Remote push is unavailable in Expo Go. Local reminders still run.');
  return null;
}

export async function schedulePetReminder(title: string, body: string) {
  await scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
    },
  });
}

export async function scheduleDailyMedicationReminder(
  petName: string,
  medicationName: string,
  timeStr: string
): Promise<string | null> {
  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = parseInt(hourStr || '8', 10);
  const minute = parseInt(minuteStr || '0', 10);
  const id = await scheduleNotificationAsync({
    content: {
      title: 'Medication reminder',
      body: `${petName}: time for ${medicationName}`,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: isNaN(hour) ? 8 : hour,
      minute: isNaN(minute) ? 0 : minute,
    },
  });
  return id;
}

export async function scheduleDailyMealReminder(
  petName: string,
  mealType: string,
  hour: number,
  minute: number
): Promise<string | null> {
  const id = await scheduleNotificationAsync({
    content: {
      title: 'Meal reminder',
      body: `${petName}: time for ${mealType} meal`,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return id;
}
