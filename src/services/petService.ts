/**
 * Pet Service - Firestore CRUD for pets under users/{userId}/pets/{petId}
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { requireUserId } from './authGuard';

export interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  status?: string;
  createdAt?: string;
}

export interface PetInput {
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  status?: string;
}

const petsCollection = (userId: string) => collection(db, 'users', userId, 'pets');

function sortPets(pets: Pet[]): Pet[] {
  return [...pets].sort((a, b) => {
    const aTime = a.createdAt || '';
    const bTime = b.createdAt || '';
    return bTime.localeCompare(aTime);
  });
}

export async function getPets(userId: string): Promise<Pet[]> {
  requireUserId(userId);
  const snapshot = await getDocs(petsCollection(userId));
  const pets = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Pet));
  return sortPets(pets);
}

export async function addPet(userId: string, data: PetInput): Promise<string> {
  requireUserId(userId);
  const docRef = await addDoc(petsCollection(userId), {
    name: (data.name || '').trim(),
    type: data.type || 'other',
    breed: (data.breed || '').trim(),
    age: Math.floor(Number(data.age)) || 0,
    weight: Number(parseFloat(String(data.weight))) || 0,
    status: data.status || 'Active',
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

export async function updatePet(
  userId: string,
  petId: string,
  data: Partial<PetInput>
): Promise<void> {
  requireUserId(userId);
  const docRef = doc(db, 'users', userId, 'pets', petId);
  const payload: Record<string, unknown> = { ...data };
  if (typeof data.age === 'number') payload.age = Math.floor(data.age) || 0;
  if (typeof data.weight === 'number')
    payload.weight = Number(parseFloat(String(data.weight))) || 0;
  await updateDoc(docRef, payload);
}

export async function deletePet(userId: string, petId: string): Promise<void> {
  requireUserId(userId);
  const docRef = doc(db, 'users', userId, 'pets', petId);
  await deleteDoc(docRef);
}

export function subscribeToPets(
  userId: string,
  callback: (pets: Pet[]) => void
): Unsubscribe {
  requireUserId(userId);
  return onSnapshot(petsCollection(userId), (snapshot) => {
    const pets = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Pet));
    callback(sortPets(pets));
  });
}

export async function getPet(userId: string, petId: string): Promise<Pet | null> {
  requireUserId(userId);
  const docRef = doc(db, 'users', userId, 'pets', petId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Pet;
}

// Aliases for consistent API
export const createPet = addPet;
export const listPetsByUser = getPets;
