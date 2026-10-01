import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '@/src/components/CustomButton';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import type { DietPlanInput } from '@/src/services/dietService';
import { add, getOne, update } from '@/src/services/dietService';

function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const emptyForm: DietPlanInput = { title: '', notes: null, time: null };

export function DietFormScreen({ mode }: { mode: 'new' | 'edit' }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ petId: string; dietId?: string }>();
  const petId = (params.petId as string) ?? '';
  const dietId = (params.dietId as string) ?? '';
  const [form, setForm] = useState<DietPlanInput>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loadDone, setLoadDone] = useState(false);

  const uid = user?.uid ?? '';

  useEffect(() => {
    if (mode !== 'edit' || !uid || !petId || !dietId) {
      setLoadDone(true);
      return;
    }
    getOne(uid, petId, dietId)
      .then((plan) => {
        if (plan) {
          setForm({
            title: plan.title,
            notes: plan.notes ?? null,
            time: plan.time ?? null,
          });
        }
        setLoadDone(true);
      })
      .catch(() => setLoadDone(true));
  }, [mode, uid, petId, dietId]);

  const onTimePick = useCallback(
    (_: unknown, date?: Date) => {
      setShowTimePicker(Platform.OS === 'ios');
      if (date) setForm((f) => ({ ...f, time: formatTime(date.getHours(), date.getMinutes()) }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!uid || !petId) return;
    const title = form.title.trim();
    if (!title) return;
    setLoading(true);
    try {
      if (mode === 'new') {
        await add(uid, petId, {
          title,
          notes: form.notes?.trim() || null,
          time: form.time?.trim() || null,
        });
      } else {
        await update(uid, petId, dietId, {
          title,
          notes: form.notes?.trim() || null,
          time: form.time?.trim() || null,
        });
      }
      router.back();
    } catch (e) {
      console.warn('Save diet plan error:', e);
    } finally {
      setLoading(false);
    }
  }, [uid, petId, dietId, mode, form, router]);

  const timeValue = (() => {
    const t = form.time || '08:00';
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(isNaN(h) ? 8 : h, isNaN(m) ? 0 : m, 0, 0);
    return d;
  })();

  if (!loadDone && mode === 'edit') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <Text style={[styles.loadingText, { color: colors.grey }]}>Loading…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{mode === 'new' ? 'Add diet plan' : 'Edit diet plan'}</Text>
        <View style={styles.placeholder} />
      </View>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.grey }]}>Title *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
            placeholder="e.g. Breakfast"
            placeholderTextColor={colors.grey}
            value={form.title}
            onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
          />
          <Text style={[styles.label, { color: colors.grey }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
            placeholder="Notes"
            placeholderTextColor={colors.grey}
            value={form.notes ?? ''}
            onChangeText={(t) => setForm((f) => ({ ...f, notes: t || null }))}
            multiline
          />
          <Text style={[styles.label, { color: colors.grey }]}>Time (optional)</Text>
          <TouchableOpacity
            style={[styles.timeRow, { backgroundColor: colors.card, borderColor: colors.grey }]}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={[styles.timeValue, { color: colors.primary }]}>{form.time || 'Pick time'}</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={timeValue}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimePick}
            />
          )}
          <CustomButton title="Save" onPress={handleSave} loading={loading} disabled={!form.title.trim()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  placeholder: { width: 24 },
  kav: { flex: 1 },
  scroll: { flex: 1 },
  scrollInner: { padding: 16, paddingBottom: 60 },
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 12 },
  notesInput: { minHeight: 60 },
  timeRow: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  timeValue: { fontSize: 16, fontWeight: '600' },
  loadingText: { textAlign: 'center', fontSize: 16 },
});
