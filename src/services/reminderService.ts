/**
 * Local notification reminders (expo-notifications only).
 * No Firebase Storage. Schedules/cancels daily medication and diet reminders.
 */

import {
  cancelScheduledNotificationAsync,
  scheduleNotificationAsync,
  SchedulableTriggerInputTypes,
} from '@/src/services/notificationClient';

/**
 * Schedules a daily medication reminder. Returns notification identifier for later cancellation.
 */
export async function scheduleMedicationReminder(
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

/**
 * Schedules a daily diet/meal reminder.
 */
export async function scheduleDietReminder(
  petName: string,
  mealName: string,
  hour: number,
  minute: number
): Promise<string | null> {
  const id = await scheduleNotificationAsync({
    content: {
      title: 'Meal reminder',
      body: `${petName}: time for ${mealName}`,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return id;
}

/**
 * Cancels a scheduled reminder by its identifier.
 */
export async function cancelReminder(identifier: string): Promise<void> {
  await cancelScheduledNotificationAsync(identifier);
}
