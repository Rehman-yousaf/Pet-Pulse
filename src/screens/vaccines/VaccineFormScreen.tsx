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
import type { VaccinationInput } from '@/src/services/vaccinationService';
import { add, getOne, update } from '@/src/services/vaccinationService';

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const emptyForm: VaccinationInput = {
  name: '',
  date: toDateStr(new Date()),
  nextDue: null,
  vetName: null,
};

export function VaccineFormScreen({ mode }: { mode: 'new' | 'edit' }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ petId: string; vaccinationId?: string }>();
  const petId = (params.petId as string) ?? '';
  const vaccinationId = (params.vaccinationId as string) ?? '';
  const [form, setForm] = useState<VaccinationInput>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNextDuePicker, setShowNextDuePicker] = useState(false);
  const [loadDone, setLoadDone] = useState(false);

  const uid = user?.uid ?? '';

  useEffect(() => {
    if (mode !== 'edit' || !uid || !petId || !vaccinationId) {
      setLoadDone(true);
      return;
    }
    getOne(uid, petId, vaccinationId)
      .then((v) => {
        if (v) {
          setForm({
            name: v.name,
            date: v.date,
            nextDue: v.nextDue ?? null,
            vetName: v.vetName ?? null,
          });
        }
        setLoadDone(true);
      })
      .catch(() => setLoadDone(true));
  }, [mode, uid, petId, vaccinationId]);

  const onDatePick = useCallback(
    (_: unknown, date?: Date) => {
      setShowDatePicker(Platform.OS === 'ios');
      if (date) setForm((f) => ({ ...f, date: toDateStr(date) }));
    },
    []
  );
  const onNextDuePick = useCallback(
    (_: unknown, date?: Date) => {
      setShowNextDuePicker(Platform.OS === 'ios');
      if (date) setForm((f) => ({ ...f, nextDue: toDateStr(date) }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!uid || !petId) return;
    const name = form.name.trim();
    if (!name) return;
    setLoading(true);
    try {
      if (mode === 'new') {
        await add(uid, petId, {
          name,
          date: form.date,
          nextDue: form.nextDue?.trim() || null,
          vetName: form.vetName?.trim() || null,
        });
      } else {
        await update(uid, petId, vaccinationId, {
          name,
          date: form.date,
          nextDue: form.nextDue?.trim() || null,
          vetName: form.vetName?.trim() || null,
        });
      }
      router.back();
    } catch (e) {
      console.warn('Save vaccination error:', e);
    } finally {
      setLoading(false);
    }
  }, [uid, petId, vaccinationId, mode, form, router]);

  const dateVal = (() => {
    const d = new Date(form.date || '');
    return isNaN(d.getTime()) ? new Date() : d;
  })();
  const nextDueVal = form.nextDue
    ? (() => {
        const d = new Date(form.nextDue);
        return isNaN(d.getTime()) ? new Date() : d;
      })()
    : new Date();

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
        <Text style={[styles.title, { color: colors.text }]}>{mode === 'new' ? 'Add vaccination' : 'Edit vaccination'}</Text>
        <View style={styles.placeholder} />
      </View>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.grey }]}>Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
            placeholder="e.g. Rabies"
            placeholderTextColor={colors.grey}
            value={form.name}
            onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
          />
          <Text style={[styles.label, { color: colors.grey }]}>Date</Text>
          <TouchableOpacity
            style={[styles.dateRow, { backgroundColor: colors.card, borderColor: colors.grey }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.dateValue, { color: colors.primary }]}>{form.date}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dateVal}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDatePick}
            />
          )}
          <Text style={[styles.label, { color: colors.grey }]}>Next due (optional)</Text>
          <TouchableOpacity
            style={[styles.dateRow, { backgroundColor: colors.card, borderColor: colors.grey }]}
            onPress={() => setShowNextDuePicker(true)}
          >
            <Text style={[styles.dateValue, { color: colors.primary }]}>{form.nextDue || 'Pick date'}</Text>
          </TouchableOpacity>
          {showNextDuePicker && (
            <DateTimePicker
              value={nextDueVal}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onNextDuePick}
            />
          )}
          <Text style={[styles.label, { color: colors.grey }]}>Vet name (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
            placeholder="Vet name"
            placeholderTextColor={colors.grey}
            value={form.vetName ?? ''}
            onChangeText={(t) => setForm((f) => ({ ...f, vetName: t || null }))}
          />
          <CustomButton title="Save" onPress={handleSave} loading={loading} disabled={!form.name.trim()} />
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
  dateRow: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  dateValue: { fontSize: 16, fontWeight: '600' },
  loadingText: { textAlign: 'center', fontSize: 16 },
});
