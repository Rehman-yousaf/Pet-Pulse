import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/ThemeContext';
import type { ChatMessage } from '@/src/services/groqService';
import { sendMessageToGroq } from '@/src/services/groqService';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showErrorToast = useCallback(() => {
    setToast('PetBot temporarily unavailable. Please try again.');
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendMessageToGroq([...messages, userMsg]);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      showErrorToast();
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, showErrorToast]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.main}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Ionicons name="paw" size={22} color="#FFFFFF" style={styles.headerPaw} />
          <View>
            <Text style={styles.headerTitle}>PetBot</Text>
            <Text style={styles.headerSub}>Your Veterinary Assistant</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={[styles.placeholder, { backgroundColor: colors.card }]}>
              <Ionicons name="chatbubble-ellipses" size={48} color={colors.grey} />
              <Text style={[styles.placeholderText, { color: colors.grey }]}>
                Ask about pet health, diet, or behavior. I'm here to help.
              </Text>
            </View>
          )}
          {messages.map((m, i) => (
            <View
              key={i}
              style={[
                styles.bubbleWrap,
                m.role === 'user' ? styles.bubbleRight : styles.bubbleLeft,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  m.role === 'user' ? styles.bubbleUser : styles.bubbleBot,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot,
                  ]}
                >
                  {m.content}
                </Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={[styles.bubbleWrap, styles.bubbleLeft]}>
              <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                <Text style={[styles.bubbleText, styles.bubbleTextBot]}>PetBot is typing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {toast ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
        <View style={styles.inputContainer}>
          <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.grey }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Message..."
              placeholderTextColor={colors.grey}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={send}
              editable={!loading}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              onPress={send}
              disabled={loading || !input.trim()}
            >
              <Ionicons name="send" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const USER_BUBBLE_BG = '#FF7A00';
const BOT_BUBBLE_BG = '#E8E8E8';
const BOT_BUBBLE_TEXT = '#1F2937';

const styles = StyleSheet.create({
  container: { flex: 1 },
  main: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: USER_BUBBLE_BG,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 0,
  },
  headerPaw: { marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  headerSub: { fontSize: 13, marginTop: 2, color: 'rgba(255,255,255,0.9)' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 16,
    marginBottom: 16,
  },
  placeholderText: { marginTop: 12, fontSize: 15, textAlign: 'center' },
  bubbleWrap: { marginBottom: 12 },
  bubbleLeft: { alignItems: 'flex-start' },
  bubbleRight: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bubbleUser: { backgroundColor: USER_BUBBLE_BG },
  bubbleBot: { backgroundColor: BOT_BUBBLE_BG },
  typingBubble: { alignSelf: 'flex-start' },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  bubbleTextUser: { color: '#FFFFFF' },
  bubbleTextBot: { color: BOT_BUBBLE_TEXT },
  inputContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  toast: {
    backgroundColor: '#1F2937',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    marginHorizontal: 12,
    alignSelf: 'stretch',
  },
  toastText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
