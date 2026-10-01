import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
  UserCredential,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export const registerWithEmail = async (
  email: string,
  password: string,
  displayName?: string
): Promise<UserCredential> => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName?.trim() && cred.user) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: cred.user.email,
      displayName: displayName.trim(),
      createdAt: new Date().toISOString(),
    });
  }
  return cred;
};

export const loginWithEmail = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = async (): Promise<void> => {
  return signOut(auth);
};

export const resetPassword = async (email: string): Promise<void> => {
  return sendPasswordResetEmail(auth, email);
};

export const getCurrentUser = (): User | null => auth.currentUser;
