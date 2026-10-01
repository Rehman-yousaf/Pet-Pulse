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
import type { Vaccination, VaccinationInput } from '@/src/services/vaccinationService';
import {
  addVaccination,
  deleteVaccination,
  subscribeToVaccinations,
} from '@/src/services/vaccinationService';
import { getPet } from '@/src/services/petService';

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function VaccinationsUI() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [petName, setPetName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNextDuePicker, setShowNextDuePicker] = useState(false);
  const [form, setForm] = useState<VaccinationInput>({
    name: '',
    date: toDateStr(new Date()),
    nextDue: null,
    vetName: null,
  });
  const [loading, setLoading] = useState(false);
  const unsubRef = useRef<ReturnType<typeof subscribeToVaccinations> | null>(null);

  const uid = user?.uid ?? '';
  const pid = (petId as string) ?? '';

  useEffect(() => {
    if (!uid || !pid) return;
    unsubRef.current = subscribeToVaccinations(uid, pid, setVaccinations);
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
      await addVaccination(uid, pid, {
        name: form.name.trim(),
        date: form.date,
        nextDue: form.nextDue?.trim() || null,
        vetName: form.vetName?.trim() || null,
      });
      setModalVisible(false);
      setForm({ name: '', date: toDateStr(new Date()), nextDue: null, vetName: null });
    } catch (e) {
      console.warn('Add vaccination error:', e);
    } finally {
      setLoading(false);
    }
  }, [uid, pid, form]);

  const handleDelete = useCallback(
    (v: Vaccination) => {
      Alert.alert('Delete vaccination', `Remove ${v.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => uid && pid && deleteVaccination(uid, pid, v.id),
        },
      ]);
    },
    [uid, pid]
  );

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.grey + '40' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Vaccinations</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listInner}>
        {vaccinations.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card }]}>
            <Ionicons name="fitness-outline" size={48} color={colors.grey} />
            <Text style={[styles.emptyText, { color: colors.grey }]}>No vaccinations yet</Text>
            <Text style={[styles.emptySub, { color: colors.grey }]}>Tap + to add</Text>
          </View>
        ) : (
          vaccinations.map((v) => (
            <View
              key={v.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grey + '30' }]}
            >
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{v.name}</Text>
                <Text style={[styles.cardSub, { color: colors.grey }]}>
                  Date: {v.date}
                  {v.nextDue ? ` • Next: ${v.nextDue}` : ''}
                  {v.vetName ? ` • ${v.vetName}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(v)} hitSlop={12}>
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add vaccination</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
                placeholder="Name (e.g. Rabies)"
                placeholderTextColor={colors.grey}
                value={form.name}
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              />
              <Text style={[styles.label, { color: colors.text }]}>Date</Text>
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
              <Text style={[styles.label, { color: colors.text }]}>Next due (optional)</Text>
              <TouchableOpacity
                style={[styles.dateRow, { backgroundColor: colors.card, borderColor: colors.grey }]}
                onPress={() => setShowNextDuePicker(true)}
              >
                <Text style={[styles.dateValue, { color: colors.primary }]}>
                  {form.nextDue || 'Pick date'}
                </Text>
              </TouchableOpacity>
              {showNextDuePicker && (
                <DateTimePicker
                  value={nextDueVal}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onNextDuePick}
                />
              )}
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
                placeholder="Vet name (optional)"
                placeholderTextColor={colors.grey}
                value={form.vetName ?? ''}
                onChangeText={(t) => setForm((f) => ({ ...f, vetName: t || null }))}
              />
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
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { fontSize: 13, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalScroll: { flexGrow: 1, justifyContent: 'center' },
  modalContent: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  dateRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  dateValue: { fontSize: 16, fontWeight: '600' },
  cancel: { textAlign: 'center', marginTop: 12, fontSize: 16 },
});
