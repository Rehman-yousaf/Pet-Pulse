/**
 * Community feed — text-only posts, likes, comments.
 * Firestore: posts/{postId}, posts/{postId}/likes/{userId}, posts/{postId}/comments/{commentId}
 * No Firebase Storage.
 */

import type { DocumentSnapshot } from 'firebase/firestore';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Unsubscribe,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { requireAuth, requireUserId } from './authGuard';
import { createActivity } from './activityService';

const POSTS_COLLECTION = 'posts';
const POST_LIMIT = 20;

export interface Post {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: unknown;
  likesCount: number;
  commentCount: number;
  userEmail?: string;
  content?: string;
  likeCount?: number;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: unknown;
  /** @deprecated */
  userEmail?: string;
}

const postsCollection = () => collection(db, POSTS_COLLECTION);

export async function createPost(
  uid: string,
  username: string,
  text: string
): Promise<string> {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }
  requireUserId(uid);
  if (__DEV__) {
    console.log('createPost auth.currentUser', auth.currentUser?.uid);
  }
  const docRef = await addDoc(postsCollection(), {
    userId: uid,
    username: (username || '').trim() || 'Anonymous',
    text: (text || '').trim(),
    createdAt: serverTimestamp(),
    likesCount: 0,
    commentsCount: 0,
  });
  return docRef.id;
}

export function subscribeToPosts(
  callback: (posts: Post[], lastDoc: DocumentSnapshot | null) => void
): Unsubscribe {
  requireAuth();
  const q = query(
    postsCollection(),
    orderBy('createdAt', 'desc'),
    limit(POST_LIMIT)
  );
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((d) => {
      const data = d.data();
      const username = (data.username ?? data.userEmail ?? '').trim() || 'Anonymous';
      const text = (data.text ?? data.content ?? '').trim();
      const likesCount = data.likesCount ?? data.likeCount ?? 0;
      const commentCount = data.commentCount ?? data.commentsCount ?? 0;
      return {
        id: d.id,
        userId: data.userId ?? '',
        username,
        text,
        createdAt: data.createdAt,
        likesCount,
        commentCount,
        userEmail: username,
        content: text,
        likeCount: likesCount,
      } as Post;
    });
    const last = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    callback(posts, last);
  });
}

export async function toggleLike(postId: string, userId: string): Promise<void> {
  requireUserId(userId);
  const likeRef = doc(db, POSTS_COLLECTION, postId, 'likes', userId);
  const likeSnap = await getDoc(likeRef);
  if (likeSnap.exists()) {
    await unlikePost(postId, userId);
  } else {
    await likePost(postId, userId);
  }
}

export async function likePost(postId: string, uid: string): Promise<void> {
  if (!auth.currentUser) throw new Error('User not authenticated');
  requireUserId(uid);
  const postRef = doc(db, POSTS_COLLECTION, postId);
  const postSnap = await getDoc(postRef);
  const postOwnerId = postSnap.exists() ? (postSnap.data()?.userId as string) : null;

  const likeRef = doc(db, POSTS_COLLECTION, postId, 'likes', uid);
  const likeSnap = await getDoc(likeRef);
  if (likeSnap.exists()) return;
  await setDoc(likeRef, { createdAt: serverTimestamp() });
  await updateDoc(postRef, { likesCount: increment(1) });

  if (postOwnerId && postOwnerId !== uid) {
    const username = (postSnap.data()?.username as string) || 'Someone';
    try {
      await createActivity(postOwnerId, {
        type: 'like',
        title: 'New like',
        description: `${username} liked your post`,
        referenceId: postId,
      });
    } catch (e) {
      if (__DEV__) console.warn('Activity create (like) failed:', e);
    }
  }
}

export async function unlikePost(postId: string, uid: string): Promise<void> {
  if (!auth.currentUser) throw new Error('User not authenticated');
  requireUserId(uid);
  const likeRef = doc(db, POSTS_COLLECTION, postId, 'likes', uid);
  const likeSnap = await getDoc(likeRef);
  if (!likeSnap.exists()) return;
  await deleteDoc(likeRef);
  const postRef = doc(db, POSTS_COLLECTION, postId);
  await updateDoc(postRef, { likesCount: increment(-1) });
}

export function subscribeToComments(
  postId: string,
  callback: (comments: Comment[]) => void
): Unsubscribe {
  const commentsRef = collection(db, POSTS_COLLECTION, postId, 'comments');
  const q = query(commentsRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map((d) => {
      const data = d.data();
      const username = (data.username ?? data.userEmail ?? '').trim() || 'Anonymous';
      return {
        id: d.id,
        userId: data.userId ?? '',
        username,
        content: (data.content ?? '').trim(),
        createdAt: data.createdAt,
        userEmail: username,
      } as Comment;
    });
    callback(comments);
  });
}

export async function addComment(
  postId: string,
  userId: string,
  username: string,
  text: string
): Promise<void> {
  if (!auth.currentUser) throw new Error('User not authenticated');
  requireUserId(userId);
  const postRef = doc(db, POSTS_COLLECTION, postId);
  const postSnap = await getDoc(postRef);
  const postOwnerId = postSnap.exists() ? (postSnap.data()?.userId as string) : null;

  const commentsRef = collection(db, POSTS_COLLECTION, postId, 'comments');
  const batch = writeBatch(db);
  const commentRef = doc(commentsRef);
  batch.set(commentRef, {
    userId,
    username: (username || '').trim() || 'Anonymous',
    content: (text || '').trim(),
    createdAt: serverTimestamp(),
  });
  batch.update(postRef, { commentsCount: increment(1) });
  await batch.commit();

  if (postOwnerId && postOwnerId !== userId) {
    const displayName = (username || '').trim() || 'Someone';
    const preview = (text || '').trim().slice(0, 60);
    try {
      await createActivity(postOwnerId, {
        type: 'comment',
        title: 'New comment',
        description: `${displayName}: ${preview}${preview.length >= 60 ? '…' : ''}`,
        referenceId: postId,
      });
    } catch (e) {
      if (__DEV__) console.warn('Activity create (comment) failed:', e);
    }
  }
}

/** Load next page of posts (pagination). Pass the last doc from previous page. */
export async function getMorePosts(
  lastDoc: DocumentSnapshot
): Promise<{ posts: Post[]; lastDoc: DocumentSnapshot | null }> {
  requireAuth();
  const q = query(
    postsCollection(),
    orderBy('createdAt', 'desc'),
    limit(POST_LIMIT),
    startAfter(lastDoc)
  );
  const snapshot = await getDocs(q);
  const posts = snapshot.docs.map((d) => {
    const data = d.data();
    const username = (data.username ?? data.userEmail ?? '').trim() || 'Anonymous';
    const text = (data.text ?? data.content ?? '').trim();
    const likesCount = data.likesCount ?? data.likeCount ?? 0;
    return {
      id: d.id,
      userId: data.userId ?? '',
      username,
      text,
      createdAt: data.createdAt,
      likesCount,
      commentCount: data.commentCount ?? data.commentsCount ?? 0,
      userEmail: username,
      content: text,
      likeCount: likesCount,
    } as Post;
  });
  const newLastDoc = snapshot.docs.length === POST_LIMIT ? snapshot.docs[snapshot.docs.length - 1] : null;
  return { posts, lastDoc: newLastDoc };
}

/** Check if current user has liked a post (for optimistic UI we can also track client-side). */
export async function getUserLiked(postId: string, userId: string): Promise<boolean> {
  requireUserId(userId);
  const likeRef = doc(db, POSTS_COLLECTION, postId, 'likes', userId);
  const snap = await getDoc(likeRef);
  return snap.exists();
}
