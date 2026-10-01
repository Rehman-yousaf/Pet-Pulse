/**
 * Logs per pet: users/{uid}/pets/{petId}/logs/{logId}
 * type: 'medication' | 'diet' | 'vaccination'
 * itemName: display name for history
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  Unsubscribe,
} from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { requireUserId } from './authGuard';
import { createActivity } from './activityService';
import type { ActivityType } from './activityService';

export interface LogEntry {
  id: string;
  type: string;
  itemName: string;
  createdAt: unknown;
  /** Present when using listLogs (at) or from Timestamp */
  at?: string;
}

const logsCollection = (userId: string, petId: string) =>
  collection(db, 'users', userId, 'pets', petId, 'logs');

const ACTIVITY_TYPES: Record<string, ActivityType> = {
  medication: 'medication',
  diet: 'diet',
  vaccination: 'vaccine',
};

/** Add a log entry (e.g. Mark as Given/Fed). Uses type + itemName + createdAt. */
export async function addLog(
  uid: string,
  petId: string,
  type: string,
  itemName: string
): Promise<string> {
  requireUserId(uid);
  const docRef = await addDoc(logsCollection(uid, petId), {
    type: (type || '').trim(),
    itemName: (itemName || '').trim(),
    createdAt: serverTimestamp(),
  });
  const activityType = ACTIVITY_TYPES[type];
  if (activityType) {
    const titles: Record<ActivityType, string> = {
      medication: 'Medication given',
      diet: 'Diet logged',
      vaccine: 'Vaccination recorded',
      vet: 'Vet visit',
      like: 'Like',
      comment: 'Comment',
    };
    try {
      await createActivity(uid, {
        type: activityType,
        title: titles[activityType],
        description: (itemName || '').trim(),
        referenceId: docRef.id,
      });
    } catch (e) {
      if (__DEV__) console.warn('Activity create (log) failed:', e);
    }
  }
  return docRef.id;
}

/** Real-time listener for logs, ordered by createdAt desc. */
export function listenToLogs(
  uid: string,
  petId: string,
  callback: (entries: LogEntry[]) => void
): Unsubscribe {
  requireUserId(uid);
  const q = query(logsCollection(uid, petId), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(q, (snapshot) => {
    const entries: LogEntry[] = snapshot.docs.map((d) => {
      const data = d.data();
      const createdAt = data.createdAt;
      let at: string | undefined;
      if (createdAt && typeof (createdAt as { toDate?: () => Date }).toDate === 'function') {
        at = (createdAt as { toDate: () => Date }).toDate().toISOString();
      }
      return {
        id: d.id,
        type: (data.type as string) ?? '',
        itemName: (data.itemName as string) ?? (data.title as string) ?? '',
        createdAt,
        at,
      } as LogEntry;
    });
    callback(entries);
  });
}

export async function deleteLog(
  userId: string,
  petId: string,
  logId: string
): Promise<void> {
  requireUserId(userId);
  const docRef = doc(db, 'users', userId, 'pets', petId, 'logs', logId);
  await deleteDoc(docRef);
}

