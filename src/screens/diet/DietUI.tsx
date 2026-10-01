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
import type { DietPlan, DietPlanInput, DietPlanItem } from '@/src/services/dietService';
import {
  addDietPlan,
  deleteDietPlan,
  subscribeToDietPlans,
} from '@/src/services/dietService';
import { addLog } from '@/src/services/logService';
import { getPet } from '@/src/services/petService';

function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const emptyItem: DietPlanItem = { label: '', amount: null, time: null };

export function DietUI() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [petName, setPetName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<DietPlanInput>({
    title: '',
    items: [{ ...emptyItem }],
  });
  const [loading, setLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickingTimeForIndex, setPickingTimeForIndex] = useState<number | null>(null);
  const unsubRef = useRef<ReturnType<typeof subscribeToDietPlans> | null>(null);

  const uid = user?.uid ?? '';
  const pid = (petId as string) ?? '';

  useEffect(() => {
    if (!uid || !pid) return;
    unsubRef.current = subscribeToDietPlans(uid, pid, setPlans);
    return () => {
      unsubRef.current?.();
    };
  }, [uid, pid]);

  useEffect(() => {
    if (!uid || !pid) return;
    getPet(uid, pid).then((p) => setPetName(p?.name ?? 'Pet'));
  }, [uid, pid]);

  const handleAdd = useCallback(async () => {
    if (!uid || !pid || !form.title.trim()) return;
    const items = form.items
      .map((i) => ({
        label: (i.label || '').trim(),
        amount: (i.amount || '').trim() || null,
        time: (i.time || '').trim() || null,
      }))
      .filter((i) => i.label);
    if (items.length === 0) return;
    setLoading(true);
    try {
      await addDietPlan(uid, pid, { title: form.title.trim(), items });
      setModalVisible(false);
      setForm({ title: '', items: [{ ...emptyItem }] });
    } catch (e) {
      console.warn('Add diet plan error:', e);
    } finally {
      setLoading(false);
    }
  }, [uid, pid, form]);

  const handleDelete = useCallback(
    (plan: DietPlan) => {
      Alert.alert('Delete diet plan', `Remove "${plan.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => uid && pid && deleteDietPlan(uid, pid, plan.id),
        },
      ]);
    },
    [uid, pid]
  );

  const handleFed = useCallback(
    async (plan: DietPlan) => {
      if (!uid || !pid) return;
      try {
        await addLog(uid, pid, {
          type: 'diet',
          title: plan.title || 'Fed',
          at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Log fed error:', e);
      }
    },
    [uid, pid]
  );

  const addItem = useCallback(() => {
    setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  }, []);

  const updateItem = useCallback((index: number, field: keyof DietPlanItem, value: string | null) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  }, []);

  const removeItem = useCallback((index: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== index).length ? f.items.filter((_, i) => i !== index) : [{ ...emptyItem }],
    }));
  }, []);

  const onTimePick = useCallback(
    (_: unknown, date?: Date) => {
      setShowTimePicker(Platform.OS === 'ios');
      if (date != null && pickingTimeForIndex != null) {
        const t = formatTime(date.getHours(), date.getMinutes());
        updateItem(pickingTimeForIndex, 'time', t);
      }
      setPickingTimeForIndex(null);
    },
    [pickingTimeForIndex, updateItem]
  );

  const timePickerValue = (() => {
    const idx = pickingTimeForIndex ?? 0;
    const timeStr = form.items[idx]?.time || '08:00';
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(isNaN(h) ? 8 : h, isNaN(m) ? 0 : m, 0, 0);
    return d;
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.grey + '40' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Diet</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listInner}>
        {plans.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card }]}>
            <Ionicons name="nutrition-outline" size={48} color={colors.grey} />
            <Text style={[styles.emptyText, { color: colors.grey }]}>No diet plans yet</Text>
            <Text style={[styles.emptySub, { color: colors.grey }]}>Tap + to add</Text>
          </View>
        ) : (
          plans.map((plan) => (
            <View
              key={plan.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grey + '30' }]}
            >
              <View style={styles.cardBody}>
                <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
                {plan.items?.length > 0 && (
                  <View style={styles.itemsList}>
                    {plan.items.map((item, i) => (
                      <Text key={i} style={[styles.itemLine, { color: colors.grey }]}>
                        • {item.label}
                        {item.amount ? ` — ${item.amount}` : ''}
                        {item.time ? ` @ ${item.time}` : ''}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.fedBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleFed(plan)}
                >
                  <Text style={[styles.fedBtnText, { color: colors.white }]}>Fed</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(plan)} hitSlop={12}>
                  <Ionicons name="trash-outline" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add diet plan</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
                placeholder="Plan title (e.g. Breakfast)"
                placeholderTextColor={colors.grey}
                value={form.title}
                onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
              />
              <Text style={[styles.label, { color: colors.text }]}>Items</Text>
              {form.items.map((item, index) => (
                <View key={index} style={[styles.itemRow, { backgroundColor: colors.card, borderColor: colors.grey + '50' }]}>
                  <TextInput
                    style={[styles.itemInput, { color: colors.text }]}
                    placeholder="Label (e.g. Kibble)"
                    placeholderTextColor={colors.grey}
                    value={item.label}
                    onChangeText={(t) => updateItem(index, 'label', t)}
                  />
                  <TextInput
                    style={[styles.itemInputSmall, { color: colors.text }]}
                    placeholder="Amount"
                    placeholderTextColor={colors.grey}
                    value={item.amount ?? ''}
                    onChangeText={(t) => updateItem(index, 'amount', t || null)}
                  />
                  <TouchableOpacity
                    style={styles.timeChip}
                    onPress={() => {
                      setPickingTimeForIndex(index);
                      setShowTimePicker(true);
                    }}
                  >
                    <Text style={[styles.timeChipText, { color: colors.primary }]}>
                      {item.time || 'Time'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeItem(index)} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[styles.addItemBtn, { borderColor: colors.primary }]} onPress={addItem}>
                <Ionicons name="add" size={20} color={colors.primary} />
                <Text style={[styles.addItemText, { color: colors.primary }]}>Add item</Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={timePickerValue}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimePick}
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
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardBody: { flex: 1 },
  planTitle: { fontSize: 16, fontWeight: '600' },
  itemsList: { marginTop: 8 },
  itemLine: { fontSize: 13, marginBottom: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 },
  fedBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  fedBtnText: { fontSize: 14, fontWeight: '600' },
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
  itemRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  itemInput: { flex: 1, minWidth: 100, fontSize: 16 },
  itemInputSmall: { width: 80, fontSize: 16 },
  timeChip: { paddingHorizontal: 10, paddingVertical: 6 },
  timeChipText: { fontSize: 14 },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    marginBottom: 16,
  },
  addItemText: { fontSize: 14 },
  cancel: { textAlign: 'center', marginTop: 12, fontSize: 16 },
});
