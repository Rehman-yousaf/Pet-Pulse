import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { UserAvatar } from '@/src/components/UserAvatar';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import type { Comment } from '@/src/services/communityService';
import { addComment, subscribeToComments } from '@/src/services/communityService';

function formatCommentTime(createdAt: unknown): string {
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
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

interface CommentsModalProps {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
}

export function CommentsModal({ visible, postId, onClose }: CommentsModalProps) {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const unsubRef = useRef<ReturnType<typeof subscribeToComments> | null>(null);

  useEffect(() => {
    if (!visible || !postId) {
      setComments([]);
      return;
    }
    unsubRef.current = subscribeToComments(postId, setComments);
    return () => {
      unsubRef.current?.();
    };
  }, [visible, postId]);

  const username = profile?.name || profile?.displayName || 'Anonymous';

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!postId || !user?.uid || !text) return;
    setLoading(true);
    setInput('');
    try {
      await addComment(postId, user.uid, username, text);
    } catch (e) {
      console.warn('Add comment error:', e);
    } finally {
      setLoading(false);
    }
  }, [postId, user?.uid, username, input]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.grey + '40' }]}>
            <Text style={[styles.title, { color: colors.text }]}>Comments</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              !loading ? (
                <Text style={[styles.empty, { color: colors.grey }]}>No comments yet.</Text>
              ) : null
            }
            renderItem={({ item: c }) => (
              <View
                style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.commentRow}>
                  <UserAvatar name={c.username || c.userEmail} size={32} />
                  <View style={styles.commentBody}>
                    <Text style={[styles.commentEmail, { color: colors.primary }]}>
                      {c.username || c.userEmail}
                    </Text>
                    <Text style={[styles.commentContent, { color: colors.text }]}>{c.content}</Text>
                    <Text style={[styles.commentTime, { color: colors.grey }]}>
                      {formatCommentTime(c.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          />

          <View style={[styles.footer, { borderTopColor: colors.grey + '40', backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
              placeholder="Add a comment..."
              placeholderTextColor={colors.grey}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSubmit}
              editable={!loading}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="send" size={20} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  list: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 8,
  },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 24 },
  commentCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  commentBody: { flex: 1 },
  commentEmail: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  commentContent: { fontSize: 15 },
  commentTime: { fontSize: 11, marginTop: 4 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
