/**
 * Activity feed: activities/{userId}/items/{activityId}
 * Types: medication | diet | vaccine | vet | like | comment
 */

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { requireUserId } from './authGuard';

export type ActivityType = 'medication' | 'diet' | 'vaccine' | 'vet' | 'like' | 'comment';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  referenceId: string | null;
  createdAt: unknown;
  read: boolean;
}

export interface CreateActivityData {
  type: ActivityType;
  title: string;
  description: string;
  referenceId?: string | null;
}

const itemsCollection = (userId: string) =>
  collection(db, 'activities', userId, 'items');

function mapDoc(id: string, data: Record<string, unknown>): ActivityItem {
  return {
    id,
    type: (data.type as ActivityType) ?? 'medication',
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    referenceId: (data.referenceId as string) ?? null,
    createdAt: data.createdAt,
    read: (data.read as boolean) ?? false,
  };
}

/** Create an activity for a user. */
export async function createActivity(
  userId: string,
  data: CreateActivityData
): Promise<string> {
  requireUserId(userId);
  const ref = await addDoc(itemsCollection(userId), {
    type: data.type,
    title: (data.title ?? '').trim(),
    description: (data.description ?? '').trim(),
    referenceId: data.referenceId ?? null,
    createdAt: serverTimestamp(),
    read: false,
  });
  return ref.id;
}

/** Subscribe to activities for a user, ordered by createdAt desc. */
export function subscribeToActivities(
  userId: string,
  callback: (items: ActivityItem[]) => void
): Unsubscribe {
  requireUserId(userId);
  const q = query(itemsCollection(userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>));
    callback(items);
  });
}

/** Mark a single activity as read. */
export async function markActivityRead(
  userId: string,
  activityId: string
): Promise<void> {
  requireUserId(userId);
  const ref = doc(db, 'activities', userId, 'items', activityId);
  await updateDoc(ref, { read: true });
}
