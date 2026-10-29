import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { subscribeToDietPlans, type DietPlan } from '@/src/services/dietService';
import { askGrokVetAssistant, replyLooksUrgent, type ChatMessage, type PetContext } from '@/src/services/grokService';
import { listenToLogs, type LogEntry } from '@/src/services/logService';
import { subscribeToMedications, type Medication } from '@/src/services/medicationService';
import { subscribeToPets, type Pet } from '@/src/services/petService';
import { subscribeToVaccinations, type Vaccination } from '@/src/services/vaccinationService';
import { PET_TYPES, getPetEmoji } from '@/src/utils/Helpers';

function queryLooksUrgent(text: string): boolean {
  return /chocolate|xylitol|grape|onion|garlic|lily|lilies|rat poison|antifreeze|seizure|collapsed|collapse|difficulty breathing|can(?:not|'t) breathe|severe bleeding|unconscious/i.test(
    text
  );
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function speciesLabel(type: string): string {
  const key = (type || '').trim().toLowerCase();
  return PET_TYPES.find((t) => t.id === key)?.label ?? (type?.trim() || 'Pet');
}

function summarizeDiet(plans: DietPlan[]): string {
  return plans
    .slice(0, 4)
    .map((plan) => [plan.title, plan.notes, plan.time].filter(Boolean).join(' — '))
    .filter(Boolean)
    .join('; ');
}

function summarizeHistory(meds: Medication[], vaccines: Vaccination[]): string[] {
  const lines = [
    ...meds.slice(0, 6).map((med) =>
      [`Medication: ${med.name}`, med.dosage, med.frequency].filter(Boolean).join(', ')
    ),
    ...vaccines.slice(0, 6).map((shot) => {
      const due = shot.nextDue ? `, next due ${shot.nextDue}` : '';
      const when = shot.date ? ` on ${shot.date}` : '';
      return `Vaccine: ${shot.name}${when}${due}`;
    }),
  ];
  return lines.filter(Boolean);
}

function summarizeLogs(logs: LogEntry[]): string[] {
  return logs
    .slice(0, 8)
    .map((entry) => [entry.type, entry.itemName].filter(Boolean).join(': '))
    .filter(Boolean);
}

function MessageText({ content, color }: { content: string; color: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={[styles.bubbleText, { color }]}>
      {parts.map((part, index) => {
        const bold = part.startsWith('**') && part.endsWith('**') && part.length > 4;
        return (
          <Text key={`${index}-${part.slice(0, 12)}`} style={bold ? styles.bold : undefined}>
            {bold ? part.slice(2, -2) : part}
          </Text>
        );
      })}
    </Text>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [vaccines, setVaccines] = useState<Vaccination[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const mountedRef = useRef(true);
  const selectedIdRef = useRef<string | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setPets([]);
      setSelectedId(null);
      return;
    }
    return subscribeToPets(uid, (next) => {
      setPets(next);
      setSelectedId((current) => {
        if (current && next.some((pet) => pet.id === current)) return current;
        return next[0]?.id ?? null;
      });
    });
  }, [user?.uid]);

  useEffect(() => {
    setMessages([]);
    const uid = user?.uid;
    if (!uid || !selectedId) {
      setDietPlans([]);
      setLogs([]);
      setMeds([]);
      setVaccines([]);
      return;
    }
    const unsubDiet = subscribeToDietPlans(uid, selectedId, setDietPlans);
    const unsubLogs = listenToLogs(uid, selectedId, setLogs);
    const unsubMeds = subscribeToMedications(uid, selectedId, setMeds);
    const unsubVaccines = subscribeToVaccinations(uid, selectedId, setVaccines);
    return () => {
      unsubDiet();
      unsubLogs();
      unsubMeds();
      unsubVaccines();
    };
  }, [user?.uid, selectedId]);

  const selectedPet = useMemo(
    () => pets.find((pet) => pet.id === selectedId) ?? null,
    [pets, selectedId]
  );

  const petContext = useMemo<PetContext | null>(() => {
    if (!selectedPet) return null;
    const breed = selectedPet.breed?.trim() || 'Unknown breed';
    return {
      id: selectedPet.id,
      name: selectedPet.name?.trim() || 'your pet',
      type: speciesLabel(selectedPet.type),
      breed,
      age: Number(selectedPet.age) || 0,
      weight: Number(selectedPet.weight) || 0,
      diet: summarizeDiet(dietPlans) || undefined,
      medicalHistory: summarizeHistory(meds, vaccines),
      recentLogs: summarizeLogs(logs),
    };
  }, [selectedPet, dietPlans, meds, vaccines, logs]);

  const suggestions = useMemo(() => {
    if (!petContext) return [];
    const breed = petContext.breed === 'Unknown breed' ? petContext.type : petContext.breed;
    return [
      `How much kibble should ${petContext.name} eat?`,
      `Foods toxic to ${breed}s?`,
      `Safe daily exercise for a ${petContext.weight}kg ${petContext.type}?`,
    ];
  }, [petContext]);

  const sendText = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || loading || sendingRef.current) return;
      if (!petContext) {
        setToast('Add a pet on Home before chatting.');
        return;
      }

      const requestPetId = petContext.id;
      const history = messages.map((msg) => ({ role: msg.role, content: msg.content }));
      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput((current) => (current.trim() === text ? '' : current));
      sendingRef.current = true;
      setLoading(true);

      try {
        const reply = await askGrokVetAssistant(text, petContext, history);
        if (!mountedRef.current || selectedIdRef.current !== requestPetId) return;
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'assistant',
            content: reply,
            timestamp: new Date(),
            isEmergency: replyLooksUrgent(reply) || queryLooksUrgent(text),
          },
        ]);
      } catch (error) {
        if (!mountedRef.current) return;
        const message = error instanceof Error ? error.message : '';
        setToast(
          /missing/i.test(message)
            ? 'Add EXPO_PUBLIC_GROQ_API_KEY to .env, then restart Expo.'
            : /api key|unauthorized|401/i.test(message)
              ? 'Groq rejected this API key. Check EXPO_PUBLIC_GROQ_API_KEY, then restart Expo.'
              : 'PetBot temporarily unavailable. Please try again.'
        );
      } finally {
        sendingRef.current = false;
        if (mountedRef.current) setLoading(false);
      }
    },
    [loading, messages, petContext]
  );

  const send = useCallback(() => {
    void sendText(input);
  }, [input, sendText]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.main}>
        <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
          <Ionicons name="paw" size={22} color="#FFFFFF" style={styles.headerPaw} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>PetBot</Text>
            <Text style={styles.headerSub}>Dr. PawPulse, your virtual vet</Text>
          </View>
        </View>

        <View style={[styles.selector, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {pets.length === 0 ? (
            <Text style={[styles.emptyPets, { color: colors.grey }]}>
              Add a pet on Home to personalize this chat.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.petRow}
              keyboardShouldPersistTaps="handled"
            >
              {pets.map((pet) => {
                const selected = pet.id === selectedId;
                return (
                  <TouchableOpacity
                    key={pet.id}
                    style={styles.petItem}
                    onPress={() => setSelectedId(pet.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.avatar, selected && styles.avatarSelected]}>
                      <Text style={styles.avatarEmoji}>{getPetEmoji(pet.type)}</Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[styles.petName, { color: selected ? colors.primary : colors.text }]}
                    >
                      {pet.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          {petContext ? (
            <Text style={[styles.chattingAbout, { color: colors.grey }]}>
              Chatting about <Text style={styles.bold}>{petContext.name}</Text>
              {` (${petContext.breed}, ${petContext.weight}kg)`}
            </Text>
          ) : null}
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ℹ️ AI Vet Assistant provides general guidance. In an emergency, contact your vet.
          </Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={[styles.placeholder, { backgroundColor: colors.card }]}>
              <Ionicons name="chatbubble-ellipses" size={48} color={colors.grey} />
              <Text style={[styles.placeholderText, { color: colors.grey }]}>
                {petContext
                  ? `Ask about ${petContext.name}'s health, diet, or behavior.`
                  : "Ask about pet health, diet, or behavior. I'm here to help."}
              </Text>
            </View>
          }
          renderItem={({ item: m }) => {
            const isUser = m.role === 'user';
            const urgent = !isUser && m.isEmergency;
            return (
              <View style={[styles.bubbleWrap, isUser ? styles.bubbleRight : styles.bubbleLeft]}>
                <View
                  style={[
                    styles.bubble,
                    isUser ? styles.bubbleUser : styles.bubbleBot,
                    urgent && styles.bubbleEmergency,
                  ]}
                >
                  <MessageText content={m.content} color={isUser ? '#FFFFFF' : '#1A1A1A'} />
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            loading ? (
              <View style={[styles.bubbleWrap, styles.bubbleLeft]}>
                <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                  <ActivityIndicator size="small" color="#FF8C42" />
                  <Text style={[styles.bubbleText, styles.thinkingText]}>Dr. PawPulse is thinking...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {toast ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}

        {suggestions.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chips}
            style={[styles.chipBar, { backgroundColor: colors.background }]}
          >
            {suggestions.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                style={[styles.chip, { backgroundColor: colors.card, borderColor: '#FF8C42' }]}
                onPress={() => void sendText(prompt)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.chipText} numberOfLines={2}>
                  {prompt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={petContext ? `Ask about ${petContext.name}...` : 'Message...'}
              placeholderTextColor={colors.grey}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={send}
              editable={!loading && !!petContext}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: loading || !input.trim() ? 0.5 : 1 }]}
              onPress={send}
              disabled={loading || !input.trim()}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  main: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerPaw: { marginRight: 10 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  headerSub: { fontSize: 13, marginTop: 2, color: 'rgba(255,255,255,0.9)' },
  selector: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
  },
  petRow: { paddingHorizontal: 12, paddingTop: 10, gap: 12 },
  petItem: { width: 72, alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF6EE',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarSelected: { borderColor: '#FF8C42' },
  avatarEmoji: { fontSize: 26 },
  petName: { marginTop: 4, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  emptyPets: { paddingHorizontal: 16, paddingTop: 12, fontSize: 14 },
  chattingAbout: { paddingHorizontal: 16, paddingTop: 8, fontSize: 12 },
  bold: { fontWeight: '700' },
  disclaimer: {
    backgroundColor: '#FFF6EE',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3D2B8',
  },
  disclaimerText: { color: '#7C2D12', fontSize: 12, lineHeight: 17 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24, flexGrow: 1 },
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
  },
  bubbleUser: { backgroundColor: '#FF8C42' },
  bubbleBot: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  bubbleEmergency: {
    backgroundColor: '#FFF2F2',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  thinkingText: { color: '#1A1A1A' },
  chipBar: { maxHeight: 74, flexGrow: 0 },
  chips: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  chip: {
    maxWidth: 240,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipText: { color: '#FF8C42', fontSize: 13, fontWeight: '600' },
  inputContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toast: {
    backgroundColor: '#1F2937',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    marginHorizontal: 12,
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
