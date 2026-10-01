/**
 * Runtime safety: ensure the caller can only access their own resources.
 * Use in service layer; Firestore rules remain the source of truth for server-side enforcement.
 */

import { auth } from './firebaseConfig';

const UNAUTHORIZED_MSG = 'Unauthorized: you can only access your own data.';

export function requireUserId(userId: string): asserts userId is string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('You must be signed in to perform this action.');
  }
  if (uid !== userId) {
    throw new Error(UNAUTHORIZED_MSG);
  }
}

export function requireAuth(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('You must be signed in to perform this action.');
  }
  return uid;
}
