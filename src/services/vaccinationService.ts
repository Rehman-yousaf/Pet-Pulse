/**
 * Vaccinations: users/{uid}/pets/{petId}/vaccinations/{vaccinationId}
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
import { createActivity } from './activityService';
import { addLog } from './logService';

export interface Vaccination {
  id: string;
  name: string;
  date: string;
  nextDue?: string | null;
  vetName?: string | null;
  createdAt?: unknown;
  lastGivenAt?: unknown;
  isGivenToday?: boolean;
}

export interface VaccinationInput {
  name: string;
  date: string;
  nextDue?: string | null;
  vetName?: string | null;
}

const col = (userId: string, petId: string) =>
  collection(db, 'users', userId, 'pets', petId, 'vaccinations');

function mapDoc(d: { id: string; data: () => Record<string, unknown> }): Vaccination {
  const data = d.data();
  return {
    id: d.id,
    name: (data.name as string) ?? '',
    date: (data.date as string) ?? '',
    nextDue: (data.nextDue as string) ?? null,
    vetName: (data.vetName as string) ?? null,
    createdAt: data.createdAt,
    lastGivenAt: data.lastGivenAt,
    isGivenToday: data.isGivenToday === true,
  };
}

export function subscribe(
  userId: string,
  petId: string,
  callback: (list: Vaccination[]) => void
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
  data: VaccinationInput
): Promise<string> {
  requireUserId(userId);
  const ref = await addDoc(col(userId, petId), {
    name: (data.name || '').trim(),
    date: data.date || new Date().toISOString().slice(0, 10),
    nextDue: (data.nextDue || '').trim() || null,
    vetName: (data.vetName || '').trim() || null,
    createdAt: serverTimestamp(),
  });
  try {
    await createActivity(userId, {
      type: 'vaccine',
      title: 'Vaccination added',
      description: (data.name || '').trim(),
      referenceId: ref.id,
    });
  } catch (e) {
    if (__DEV__) console.warn('Activity create (vaccine) failed:', e);
  }
  return ref.id;
}

export async function update(
  userId: string,
  petId: string,
  id: string,
  data: Partial<VaccinationInput>
): Promise<void> {
  requireUserId(userId);
  await updateDoc(doc(db, 'users', userId, 'pets', petId, 'vaccinations', id), data as Record<string, unknown>);
}

export async function remove(userId: string, petId: string, id: string): Promise<void> {
  requireUserId(userId);
  await deleteDoc(doc(db, 'users', userId, 'pets', petId, 'vaccinations', id));
}

export async function getOne(userId: string, petId: string, vaccinationId: string): Promise<Vaccination | null> {
  requireUserId(userId);
  const snap = await getDoc(doc(db, 'users', userId, 'pets', petId, 'vaccinations', vaccinationId));
  if (!snap.exists()) return null;
  return mapDoc(snap);
}

/** Mark vaccination as given today. Updates document and adds history log. */
export async function markVaccinationAsGiven(
  userId: string,
  petId: string,
  vaccId: string,
  vaccName: string
): Promise<void> {
  requireUserId(userId);
  const vaccRef = doc(db, 'users', userId, 'pets', petId, 'vaccinations', vaccId);
  await updateDoc(vaccRef, {
    lastGivenAt: serverTimestamp(),
    isGivenToday: true,
  });
  await addLog(userId, petId, 'vaccination', vaccName);
}

export const subscribeToVaccinations = subscribe;
export const addVaccination = add;
export const updateVaccination = update;
export const deleteVaccination = remove;
