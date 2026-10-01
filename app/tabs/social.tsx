import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserAvatar } from '@/src/components/UserAvatar';
import { CommentsModal } from '@/src/components/CommentsModal';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import type { Post } from '@/src/services/communityService';
import { auth } from '@/src/services/firebaseConfig';
import {
  createPost,
  getMorePosts,
  getUserLiked,
  subscribeToPosts,
  toggleLike,
} from '@/src/services/communityService';

function formatPostTime(createdAt: unknown): string {
  if (!createdAt) return '';
  try {
    const d = createdAt as { toDate?: () => Date };
    const date = typeof d.toDate === 'function' ? d.toDate() : new Date(createdAt as string);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

export default function SocialScreen() {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [input, setInput] = useState('');
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<import('firebase/firestore').DocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const unsubRef = useRef<ReturnType<typeof subscribeToPosts> | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setPosts([]);
      setLastDoc(null);
      return;
    }
    unsubRef.current = subscribeToPosts((next, last) => {
      setLastDoc(last);
      setPosts(next);
    });
    return () => {
      unsubRef.current?.();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || posts.length === 0) return;
    const loadLiked = async () => {
      const next: Record<string, boolean> = {};
      await Promise.all(
        posts.map(async (p) => {
          try {
            next[p.id] = await getUserLiked(p.id, user.uid);
          } catch {
            next[p.id] = false;
          }
        })
      );
      setLikedByMe((prev) => ({ ...prev, ...next }));
    };
    loadLiked();
  }, [user?.uid, posts.map((p) => p.id).join(',')]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !lastDoc) return;
    setLoadingMore(true);
    try {
      const { posts: more, lastDoc: nextLast } = await getMorePosts(lastDoc);
      setPosts((prev) => [...prev, ...more]);
      setLastDoc(nextLast);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, loadingMore]);

  const handleCreatePost = useCallback(async () => {
    if (!user) return;
    const content = input.trim();
    if (!content || posting) return;
    if (__DEV__) {
      console.log('before post auth.currentUser', auth.currentUser?.uid);
    }
    setPosting(true);
    setPostError(null);
    setInput('');
    try {
      const userName = profile?.name || profile?.displayName || 'Anonymous';
      await createPost(user.uid, userName, content);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to post. Try again.';
      setPostError(msg);
      setInput(content);
    } finally {
      setPosting(false);
    }
  }, [user, profile, input, posting]);

  const handleLike = useCallback(
    async (post: Post) => {
      if (!user?.uid) return;
      const nextLiked = !likedByMe[post.id];
      setLikedByMe((prev) => ({ ...prev, [post.id]: nextLiked }));
      const likesCount = post.likesCount ?? post.likeCount ?? 0;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, likesCount: likesCount + (nextLiked ? 1 : -1) } : p
        )
      );
      try {
        await toggleLike(post.id, user.uid);
      } catch (e) {
        setLikedByMe((prev) => ({ ...prev, [post.id]: !nextLiked }));
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id ? { ...p, likesCount: likesCount + (nextLiked ? -1 : 1) } : p
          )
        );
      }
    },
    [user?.uid, likedByMe]
  );

  const renderItem = useCallback(
    ({ item }: { item: Post }) => {
      const displayName = item.username || item.userEmail || 'Anonymous';
      const likesCount = item.likesCount ?? item.likeCount ?? 0;
      return (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <UserAvatar name={displayName} size={40} />
            <View style={styles.headerText}>
              <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.time, { color: colors.grey }]}>
                {formatPostTime(item.createdAt)}
              </Text>
            </View>
          </View>
          <Text style={[styles.content, { color: colors.text }]}>
            {item.text || item.content}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleLike(item)}
              hitSlop={12}
            >
              <Ionicons
                name={likedByMe[item.id] ? 'heart' : 'heart-outline'}
                size={22}
                color={likedByMe[item.id] ? colors.error : colors.primary}
              />
              <Text style={[styles.actionCount, { color: colors.grey }]}>{likesCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setCommentPostId(item.id)}
              hitSlop={12}
            >
              <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
              <Text style={[styles.actionCount, { color: colors.grey }]}>{item.commentCount}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [colors, likedByMe, handleLike]
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  const emptyListComponent = (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>No posts yet 🐾</Text>
      <Text style={styles.emptySubtitle}>Be the first to share something about your pet!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {postError ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.error + '20' }]}>
            <Text style={[styles.errorBannerText, { color: colors.error }]}>{postError}</Text>
            <TouchableOpacity onPress={() => setPostError(null)}>
              <Ionicons name="close" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : null}

        {!user?.uid ? (
          <View style={styles.loginPrompt}>
            <Text style={[styles.loginPromptText, { color: colors.grey }]}>
              Sign in to view and post in the community.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.createRow, { backgroundColor: '#fff', borderBottomColor: '#eee' }]}>
              <TextInput
                style={[styles.input, { backgroundColor: '#f5f5f5', color: colors.text, borderColor: '#e0e0e0' }]}
                placeholder="Share something about your pet..."
                placeholderTextColor="#999"
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
                editable={!posting}
              />
              <TouchableOpacity
                style={[styles.postBtn, { backgroundColor: '#FF7A00' }]}
                onPress={handleCreatePost}
                disabled={posting || !input.trim()}
              >
                <Text style={[styles.postBtnText, { color: '#fff' }]}>
                  {posting ? '…' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={posts}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={emptyListComponent}
              ListFooterComponent={
                lastDoc && posts.length > 0 ? (
                  <TouchableOpacity
                    style={[styles.loadMoreBtn, { borderColor: '#FF7A00' }]}
                    onPress={handleLoadMore}
                    disabled={loadingMore}
                  >
                    <Text style={[styles.loadMoreText, { color: '#FF7A00' }]}>
                      {loadingMore ? 'Loading…' : 'Load more'}
                    </Text>
                  </TouchableOpacity>
                ) : null
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#FF7A00"
                />
              }
            />
          </>
        )}

        <CommentsModal
          visible={commentPostId !== null}
          postId={commentPostId}
          onClose={() => setCommentPostId(null)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  keyboard: { flex: 1 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorBannerText: { fontSize: 13, flex: 1 },
  loginPrompt: { padding: 24, alignItems: 'center' },
  loginPromptText: { fontSize: 15 },
  createRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 44,
    maxHeight: 100,
  },
  postBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    justifyContent: 'center',
  },
  postBtnText: { fontWeight: '600', fontSize: 15 },
  listContent: { padding: 12, paddingBottom: 24 },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 40,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FF7A00', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#666', textAlign: 'center' },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  headerText: { flex: 1 },
  username: { fontSize: 15, fontWeight: '600' },
  time: { fontSize: 12, marginTop: 2 },
  content: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 13 },
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 20,
  },
  loadMoreText: { fontSize: 14, fontWeight: '600' },
});
