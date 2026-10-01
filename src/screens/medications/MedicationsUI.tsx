import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CustomButton } from '@/src/components/CustomButton';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import type { Medication, MedicationInput } from '@/src/services/medicationService';
import {
  addMedication,
  deleteMedication,
  subscribeToMedications,
} from '@/src/services/medicationService';
import { getPet } from '@/src/services/petService';

const FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Every 12 hours',
  'Every 8 hours',
  'Weekly',
  'As needed',
];

function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function MedicationsUI() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [petName, setPetName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [form, setForm] = useState<MedicationInput>({
    name: '',
    dosage: '',
    frequency: FREQUENCY_OPTIONS[0],
    reminderTimes: [],
  });
  const [loading, setLoading] = useState(false);
  const unsubRef = useRef<ReturnType<typeof subscribeToMedications> | null>(null);

  const uid = user?.uid ?? '';
  const pid = (petId as string) ?? '';

  useEffect(() => {
    if (!uid || !pid) return;
    unsubRef.current = subscribeToMedications(uid, pid, setMedications);
    return () => {
      unsubRef.current?.();
    };
  }, [uid, pid]);

  useEffect(() => {
    if (!uid || !pid) return;
    getPet(uid, pid).then((p) => setPetName(p?.name ?? 'Pet'));
  }, [uid, pid]);

  const handleAdd = useCallback(async () => {
    if (!uid || !pid || !form.name.trim()) return;
    setLoading(true);
    try {
      await addMedication(uid, pid, {
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        frequency: form.frequency.trim(),
        reminderTimes: form.reminderTimes || [],
      });
      setModalVisible(false);
      setForm({
        name: '',
        dosage: '',
        frequency: FREQUENCY_OPTIONS[0],
        reminderTimes: [],
      });
    } catch (e) {
      console.warn('Add medication error:', e);
    } finally {
      setLoading(false);
    }
  }, [uid, pid, form]);

  const handleDelete = useCallback(
    (med: Medication) => {
      Alert.alert('Delete medication', `Remove ${med.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => uid && pid && deleteMedication(uid, pid, med.id),
        },
      ]);
    },
    [uid, pid]
  );

  const addReminderTime = useCallback((time: string) => {
    setForm((f) => ({
      ...f,
      reminderTimes: [...(f.reminderTimes || []), time].filter(
        (t, i, arr) => arr.indexOf(t) === i
      ),
    }));
  }, []);

  const removeReminderTime = useCallback((time: string) => {
    setForm((f) => ({
      ...f,
      reminderTimes: (f.reminderTimes || []).filter((t) => t !== time),
    }));
  }, []);

  const onTimePick = useCallback(
    (_: unknown, date?: Date) => {
      setShowTimePicker(Platform.OS === 'ios');
      if (date) addReminderTime(formatTime(date.getHours(), date.getMinutes()));
    },
    [addReminderTime]
  );

  const timePickerDate = (() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.grey + '40' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Medications</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listInner}>
        {medications.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card }]}>
            <Ionicons name="medkit-outline" size={48} color={colors.grey} />
            <Text style={[styles.emptyText, { color: colors.grey }]}>No medications yet</Text>
            <Text style={[styles.emptySub, { color: colors.grey }]}>Tap + to add</Text>
          </View>
        ) : (
          medications.map((med) => (
            <View
              key={med.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grey + '30' }]}
            >
              <View style={styles.cardBody}>
                <Text style={[styles.medName, { color: colors.text }]}>{med.name}</Text>
                <Text style={[styles.medDetail, { color: colors.grey }]}>
                  {med.dosage && `${med.dosage} • `}
                  {med.frequency}
                  {(med.reminderTimes?.length ?? 0) > 0 &&
                    ` • ${med.reminderTimes!.join(', ')}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(med)} hitSlop={12}>
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add medication</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
                placeholder="Name"
                placeholderTextColor={colors.grey}
                value={form.name}
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
                placeholder="Dosage (e.g. 5mg)"
                placeholderTextColor={colors.grey}
                value={form.dosage}
                onChangeText={(t) => setForm((f) => ({ ...f, dosage: t }))}
              />
              <Text style={[styles.label, { color: colors.text }]}>Frequency</Text>
              <View style={styles.frequencyWrap}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.freqChip,
                      {
                        backgroundColor: form.frequency === opt ? colors.primary : colors.card,
                        borderColor: colors.grey + '60',
                      },
                    ]}
                    onPress={() => setForm((f) => ({ ...f, frequency: opt }))}
                  >
                    <Text
                      style={[
                        styles.freqChipText,
                        { color: form.frequency === opt ? colors.white : colors.text },
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.label, { color: colors.text }]}>Reminder times</Text>
              <View style={styles.chipRow}>
                {(form.reminderTimes || []).map((t) => (
                  <View
                    key={t}
                    style={[styles.chip, { backgroundColor: colors.primary + '30' }]}
                  >
                    <Text style={[styles.chipText, { color: colors.primary }]}>{t}</Text>
                    <TouchableOpacity
                      onPress={() => removeReminderTime(t)}
                      hitSlop={8}
                      style={styles.chipRemove}
                    >
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
                  style={Platform.OS === 'android' ? { marginTop: 8 } : undefined}
                />
              )}
              <CustomButton title="Save" onPress={handleAdd} loading={loading} />
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[styles.cancel, { color: colors.grey }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
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
  list: { flex: 1 },
  listInner: { padding: 16, paddingBottom: 40 },
  empty: { padding: 32, borderRadius: 12, alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 12 },
  emptySub: { fontSize: 14, marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardBody: { flex: 1 },
  medName: { fontSize: 16, fontWeight: '600' },
  medDetail: { fontSize: 13, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalScroll: { flexGrow: 1, justifyContent: 'center' },
  modalContent: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  frequencyWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  freqChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  freqChipText: { fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: { fontSize: 14 },
  chipRemove: { marginLeft: 4 },
  addTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  addTimeText: { fontSize: 14 },
  cancel: { textAlign: 'center', marginTop: 12, fontSize: 16 },
});
