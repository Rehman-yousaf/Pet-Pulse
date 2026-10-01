/**
 * Vet visits: users/{uid}/pets/{petId}/vetVisits/{visitId}
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { requireUserId } from './authGuard';
import { createActivity } from './activityService';

export type VetVisitStatus = 'upcoming' | 'completed';

export interface VetVisit {
  id: string;
  petId: string;
  vetName: string;
  reason: string;
  date: string;
  status: VetVisitStatus;
  completedAt?: string | null;
  visitNotes?: string | null;
  createdAt?: string;
}

export interface VetVisitInput {
  vetName: string;
  reason: string;
  date: string;
  status?: VetVisitStatus;
  notes?: string | null;
}

const vetVisitsCollection = (userId: string, petId: string) =>
  collection(db, 'users', userId, 'pets', petId, 'vetVisits');

function mapDoc(id: string, petId: string, data: Record<string, unknown>): VetVisit {
  return {
    id,
    petId,
    vetName: (data.vetName as string) ?? '',
    reason: (data.reason as string) ?? (data.note as string) ?? '',
    date: (data.date as string) ?? '',
    status: (data.status as VetVisitStatus) ?? 'upcoming',
    completedAt: (data.completedAt as string) ?? null,
    visitNotes: (data.visitNotes as string) ?? null,
    createdAt: data.createdAt as string | undefined,
  };
}

/** Add a vet visit for a pet. Status defaults to "upcoming". */
export async function addVetVisit(
  uid: string,
  petId: string,
  data: VetVisitInput
): Promise<string> {
  requireUserId(uid);
  const docRef = await addDoc(vetVisitsCollection(uid, petId), {
    vetName: (data.vetName ?? '').trim(),
    reason: (data.reason ?? '').trim(),
    date: data.date,
    status: data.status ?? 'upcoming',
    completedAt: null,
    visitNotes: (data.notes ?? '').trim() || null,
    createdAt: serverTimestamp(),
  });
  try {
    await createActivity(uid, {
      type: 'vet',
      title: 'Vet visit scheduled',
      description: `${(data.vetName ?? '').trim()} – ${(data.reason ?? '').trim()}`,
      referenceId: docRef.id,
    });
  } catch (e) {
    if (__DEV__) console.warn('Activity create (vet) failed:', e);
  }
  return docRef.id;
}

/** Subscribe to vet visits for one pet. Callback receives visits sorted by date ascending. */
export function listenVetVisits(
  uid: string,
  petId: string,
  callback: (visits: VetVisit[]) => void
): Unsubscribe {
  requireUserId(uid);
  const coll = vetVisitsCollection(uid, petId);
  try {
    return onSnapshot(
      coll,
      (snapshot) => {
        const list = snapshot.docs.map((d) =>
          mapDoc(d.id, petId, d.data() as Record<string, unknown>)
        );
        list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        callback(list);
      },
      (err) => {
        console.warn('vetVisitService listen error:', err);
        callback([]);
      }
    );
  } catch (e) {
    console.warn('vetVisitService listen setup error:', e);
    callback([]);
    return () => {};
  }
}

/** Mark visit as completed and set summary. Moves to Past. */
export async function completeVisit(
  uid: string,
  petId: string,
  visitId: string,
  summary: string
): Promise<void> {
  requireUserId(uid);
  const ref = doc(db, 'users', uid, 'pets', petId, 'vetVisits', visitId);
  await updateDoc(ref, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    visitNotes: (summary ?? '').trim() || null,
  });
}

/** Delete a vet visit. */
export async function deleteVisit(
  uid: string,
  petId: string,
  visitId: string
): Promise<void> {
  requireUserId(uid);
  const ref = doc(db, 'users', uid, 'pets', petId, 'vetVisits', visitId);
  await deleteDoc(ref);
}
