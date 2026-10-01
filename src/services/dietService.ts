/**
 * Diet plans: users/{uid}/pets/{petId}/dietPlans/{dietId}
 * subscribe (onSnapshot orderBy createdAt desc), add, update, remove.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { requireUserId } from './authGuard';
import { addLog } from './logService';

export interface DietPlanItem {
  label: string;
  amount?: string | null;
  time?: string | null;
}

export interface DietPlan {
  id: string;
  title: string;
  notes?: string | null;
  time?: string | null;
  items?: DietPlanItem[];
  createdAt?: unknown;
  lastGivenAt?: unknown;
  isGivenToday?: boolean;
}

export interface DietPlanInput {
  title: string;
  notes?: string | null;
  time?: string | null;
}

const col = (userId: string, petId: string) =>
  collection(db, 'users', userId, 'pets', petId, 'dietPlans');

function mapDoc(d: { id: string; data: () => Record<string, unknown> }): DietPlan {
  const data = d.data() || {};
  let items: DietPlanItem[] = [];
  if (Array.isArray(data.items)) {
    items = data.items.map((x: { label?: string; amount?: string; time?: string }) => ({
      label: x?.label ?? '',
      amount: x?.amount ?? null,
      time: x?.time ?? null,
    }));
  }
  return {
    id: d.id,
    title: (data.title as string) ?? '',
    notes: (data.notes as string) ?? null,
    time: (data.time as string) ?? null,
    items,
    createdAt: data.createdAt,
    lastGivenAt: data.lastGivenAt,
    isGivenToday: data.isGivenToday === true,
  };
}

export function subscribe(
  userId: string,
  petId: string,
  callback: (list: DietPlan[]) => void
): Unsubscribe {
  requireUserId(userId);
  const q = query(col(userId, petId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => mapDoc(d)));
  });
}

export async function add(
  userId: string,
  petId: string,
  data: DietPlanInput
): Promise<string> {
  requireUserId(userId);
  const ref = await addDoc(col(userId, petId), {
    title: (data.title || '').trim(),
    notes: (data.notes || '').trim() || null,
    time: (data.time || '').trim() || null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function update(
  userId: string,
  petId: string,
  id: string,
  data: Partial<DietPlanInput>
): Promise<void> {
  requireUserId(userId);
  await updateDoc(doc(db, 'users', userId, 'pets', petId, 'dietPlans', id), data as Record<string, unknown>);
}

export async function remove(userId: string, petId: string, id: string): Promise<void> {
  requireUserId(userId);
  await deleteDoc(doc(db, 'users', userId, 'pets', petId, 'dietPlans', id));
}

export async function getOne(userId: string, petId: string, dietId: string): Promise<DietPlan | null> {
  requireUserId(userId);
  const snap = await getDoc(doc(db, 'users', userId, 'pets', petId, 'dietPlans', dietId));
  if (!snap.exists()) return null;
  return mapDoc(snap);
}

/** Mark diet plan as fed today. Updates document and adds history log. */
export async function markDietPlanAsFed(
  userId: string,
  petId: string,
  planId: string,
  planTitle: string
): Promise<void> {
  requireUserId(userId);
  const planRef = doc(db, 'users', userId, 'pets', petId, 'dietPlans', planId);
  await updateDoc(planRef, {
    lastGivenAt: serverTimestamp(),
    isGivenToday: true,
  });
  await addLog(userId, petId, 'diet', planTitle);
}

export const subscribeToDietPlans = subscribe;
export const addDietPlan = add;
export const updateDietPlan = update;
export const deleteDietPlan = remove;
