/**
 * Medications: users/{uid}/pets/{petId}/medications/{medId}
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
  serverTimestamp,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { requireUserId } from './authGuard';
import { addLog } from './logService';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  reminderTimes: string[];
  createdAt?: unknown;
  lastGivenAt?: unknown;
  isGivenToday?: boolean;
}

export interface MedicationInput {
  name: string;
  dosage: string;
  frequency: string;
  reminderTimes: string[];
}

const col = (userId: string, petId: string) =>
  collection(db, 'users', userId, 'pets', petId, 'medications');

function mapDoc(d: { id: string; data: () => Record<string, unknown> }): Medication {
  const data = d.data();
  return {
    id: d.id,
    name: (data.name as string) ?? '',
    dosage: (data.dosage as string) ?? '',
    frequency: (data.frequency as string) ?? '',
    reminderTimes: Array.isArray(data.reminderTimes) ? data.reminderTimes : [],
    createdAt: data.createdAt,
    lastGivenAt: data.lastGivenAt,
    isGivenToday: data.isGivenToday === true,
  };
}

export function subscribe(
  userId: string,
  petId: string,
  callback: (list: Medication[]) => void
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
  data: MedicationInput
): Promise<string> {
  requireUserId(userId);
  const payload = {
    name: (data.name || '').trim(),
    dosage: (data.dosage || '').trim(),
    frequency: (data.frequency || '').trim(),
    reminderTimes: Array.isArray(data.reminderTimes) ? data.reminderTimes : [],
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(col(userId, petId), payload);
  await addLog(userId, petId, 'medication', payload.name);
  return ref.id;
}

export async function update(
  userId: string,
  petId: string,
  id: string,
  data: Partial<MedicationInput>
): Promise<void> {
  requireUserId(userId);
  await updateDoc(doc(db, 'users', userId, 'pets', petId, 'medications', id), data as Record<string, unknown>);
}

export async function remove(userId: string, petId: string, id: string): Promise<void> {
  requireUserId(userId);
  await deleteDoc(doc(db, 'users', userId, 'pets', petId, 'medications', id));
}

export async function getOne(userId: string, petId: string, medId: string): Promise<Medication | null> {
  requireUserId(userId);
  const snap = await getDoc(doc(db, 'users', userId, 'pets', petId, 'medications', medId));
  if (!snap.exists()) return null;
  return mapDoc(snap);
}

/** Mark medication as given today. Updates document and adds history log. */
export async function markMedicationAsGiven(
  userId: string,
  petId: string,
  medId: string,
  medName: string
): Promise<void> {
  requireUserId(userId);
  const medRef = doc(db, 'users', userId, 'pets', petId, 'medications', medId);
  await updateDoc(medRef, {
    lastGivenAt: serverTimestamp(),
    isGivenToday: true,
  });
  await addLog(userId, petId, 'medication', medName);
}

export const subscribeToMedications = subscribe;
export const addMedication = add;
export const updateMedication = update;
export const deleteMedication = remove;
