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
import type { MedicationInput } from '@/src/services/medicationService';
import { add, getOne, update } from '@/src/services/medicationService';

const FREQUENCY_OPTIONS = ['Once daily', 'Twice daily', 'Three times daily', 'Every 12 hours', 'Every 8 hours', 'Weekly', 'As needed'];

function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const emptyForm: MedicationInput = {
  name: '',
  dosage: '',
  frequency: FREQUENCY_OPTIONS[0],
  reminderTimes: [],
};

export function MedFormScreen({ mode }: { mode: 'new' | 'edit' }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ petId: string; medId?: string }>();
  const petId = (params.petId as string) ?? '';
  const medId = (params.medId as string) ?? '';
  const [form, setForm] = useState<MedicationInput>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loadDone, setLoadDone] = useState(false);

  const uid = user?.uid ?? '';

  useEffect(() => {
    if (mode !== 'edit' || !uid || !petId || !medId) {
      setLoadDone(true);
      return;
    }
    getOne(uid, petId, medId)
      .then((med) => {
        if (med) {
          setForm({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency || FREQUENCY_OPTIONS[0],
            reminderTimes: med.reminderTimes ?? [],
          });
        }
        setLoadDone(true);
      })
      .catch(() => setLoadDone(true));
  }, [mode, uid, petId, medId]);

  const addTime = useCallback((time: string) => {
    setForm((f) => ({
      ...f,
      reminderTimes: [...(f.reminderTimes || []), time].filter((t, i, arr) => arr.indexOf(t) === i),
    }));
  }, []);
  const removeTime = useCallback((time: string) => {
    setForm((f) => ({ ...f, reminderTimes: (f.reminderTimes || []).filter((t) => t !== time) }));
  }, []);

  const onTimePick = useCallback(
    (_: unknown, date?: Date) => {
      setShowTimePicker(Platform.OS === 'ios');
      if (date) addTime(formatTime(date.getHours(), date.getMinutes()));
    },
    [addTime]
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
          dosage: form.dosage.trim(),
          frequency: form.frequency.trim(),
          reminderTimes: form.reminderTimes || [],
        });
      } else {
        await update(uid, petId, medId, {
          name,
          dosage: form.dosage.trim(),
          frequency: form.frequency.trim(),
          reminderTimes: form.reminderTimes || [],
        });
      }
      router.back();
    } catch (e) {
      console.warn('Save medication error:', e);
    } finally {
      setLoading(false);
    }
  }, [uid, petId, medId, mode, form, router]);

  const timePickerDate = (() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
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
        <Text style={[styles.title, { color: colors.text }]}>{mode === 'new' ? 'Add medication' : 'Edit medication'}</Text>
        <View style={styles.placeholder} />
      </View>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.grey }]}>Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
            placeholder="Medication name"
            placeholderTextColor={colors.grey}
            value={form.name}
            onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
          />
          <Text style={[styles.label, { color: colors.grey }]}>Dosage (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
            placeholder="e.g. 5mg"
            placeholderTextColor={colors.grey}
            value={form.dosage}
            onChangeText={(t) => setForm((f) => ({ ...f, dosage: t }))}
          />
          <Text style={[styles.label, { color: colors.grey }]}>Frequency</Text>
          <View style={styles.freqWrap}>
            {FREQUENCY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.freqChip,
                  { backgroundColor: form.frequency === opt ? colors.primary : colors.card, borderColor: colors.grey + '60' },
                ]}
                onPress={() => setForm((f) => ({ ...f, frequency: opt }))}
              >
                <Text style={[styles.freqChipText, { color: form.frequency === opt ? colors.white : colors.text }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.grey }]}>Reminder times</Text>
          <View style={styles.chipRow}>
            {(form.reminderTimes || []).map((t) => (
              <View key={t} style={[styles.chip, { backgroundColor: colors.primary + '30' }]}>
                <Text style={[styles.chipText, { color: colors.primary }]}>{t}</Text>
                <TouchableOpacity onPress={() => removeTime(t)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.addTimeBtn, { borderColor: colors.primary }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={[styles.addTimeText, { color: colors.primary }]}>Add time</Text>
            </TouchableOpacity>
          </View>
          {showTimePicker && (
            <DateTimePicker
              value={timePickerDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimePick}
            />
          )}
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
  freqWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  freqChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  freqChipText: { fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 4, paddingVertical: 6, borderRadius: 16 },
  chipText: { fontSize: 14 },
  addTimeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, gap: 4 },
  addTimeText: { fontSize: 14 },
  loadingText: { textAlign: 'center', fontSize: 16 },
});
