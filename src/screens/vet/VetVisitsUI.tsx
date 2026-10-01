import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import type { Pet } from '@/src/services/petService';
import { getPets } from '@/src/services/petService';
import type { VetVisit } from '@/src/services/vetVisitService';
import {
  addVetVisit,
  completeVisit,
  deleteVisit,
  listenVetVisits,
} from '@/src/services/vetVisitService';

const BACKGROUND = '#F5F5F5';
const CARD_BG = '#ffffff';
const ORANGE = '#FF7A00';
const SPACING = 16;

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return s;
  }
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function VetVisitsUI() {
  const { user } = useAuth();
  const router = useRouter();
  const [visitsByPet, setVisitsByPet] = useState<Record<string, VetVisit[]>>({});
  const [pets, setPets] = useState<Pet[]>([]);
  const [petNames, setPetNames] = useState<Record<string, string>>({});
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [visitToComplete, setVisitToComplete] = useState<VetVisit | null>(null);
  const [summaryText, setSummaryText] = useState('');
  const [form, setForm] = useState({
    petId: '',
    vetName: '',
    reason: '',
    date: toDateStr(new Date()),
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const unsubRefs = useRef<Array<() => void>>([]);

  const uid = user?.uid ?? '';

  useEffect(() => {
    if (!uid) return;
    let mounted = true;
    getPets(uid)
      .then((list) => {
        if (!mounted) return;
        setPets(list);
        const map: Record<string, string> = {};
        list.forEach((p) => {
          map[p.id] = p.name;
        });
        setPetNames(map);
        if (list.length > 0 && !form.petId) setForm((f) => ({ ...f, petId: list[0].id }));
      })
      .catch((e) => console.warn('getPets error:', e));
    return () => {
      mounted = false;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || pets.length === 0) {
      setVisitsByPet({});
      return;
    }
    const unsubs: Array<() => void> = [];
    pets.forEach((pet) => {
      try {
        const unsub = listenVetVisits(uid, pet.id, (list) => {
          setVisitsByPet((prev) => ({ ...prev, [pet.id]: list }));
        });
        unsubs.push(unsub);
      } catch (e) {
        console.warn('listenVetVisits error:', e);
      }
    });
    unsubRefs.current = unsubs;
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [uid, pets.map((p) => p.id).join(',')]);

  const allVisits = Object.entries(visitsByPet).flatMap(([petId, list]) =>
    list.map((v) => ({ ...v, petId }))
  );
  allVisits.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const upcoming = allVisits.filter((v) => v.status === 'upcoming');
  const past = allVisits.filter((v) => v.status === 'completed');

  const handleSchedule = useCallback(async () => {
    if (!uid || !form.petId || !form.vetName.trim() || !form.date.trim()) return;
    setLoading(true);
    try {
      await addVetVisit(uid, form.petId, {
        vetName: form.vetName.trim(),
        reason: form.reason.trim(),
        date: form.date.trim(),
        status: 'upcoming',
        notes: form.notes.trim() || null,
      });
      setScheduleModalVisible(false);
      setForm({
        petId: form.petId,
        vetName: '',
        reason: '',
        date: toDateStr(new Date()),
        notes: '',
      });
    } catch (e) {
      console.warn('Add vet visit error:', e);
    } finally {
      setLoading(false);
    }
  }, [uid, form]);

  const handleMarkDonePress = useCallback((visit: VetVisit) => {
    setVisitToComplete(visit);
    setSummaryText('');
    setSummaryModalVisible(true);
  }, []);

  const handleCompleteWithSummary = useCallback(async () => {
    if (!uid || !visitToComplete) return;
    try {
      await completeVisit(uid, visitToComplete.petId, visitToComplete.id, summaryText.trim());
      setSummaryModalVisible(false);
      setVisitToComplete(null);
      setSummaryText('');
    } catch (e) {
      console.warn('Complete visit error:', e);
    }
  }, [uid, visitToComplete, summaryText]);

  const handleDelete = useCallback(
    (visit: VetVisit) => {
      Alert.alert('Delete visit', 'Remove this vet visit?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!uid) return;
            try {
              await deleteVisit(uid, visit.petId, visit.id);
            } catch (e) {
              console.warn('Delete visit error:', e);
            }
          },
        },
      ]);
    },
    [uid]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.scheduleBtn}
          onPress={() => setScheduleModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.scheduleBtnText}>Schedule Vet Visit</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>Upcoming</Text>
        {upcoming.length === 0 ? (
          <Text style={styles.empty}>No upcoming visits</Text>
        ) : (
          upcoming.map((v) => (
            <UpcomingCard
              key={`${v.petId}-${v.id}`}
              visit={v}
              petName={petNames[v.petId] ?? 'Pet'}
              onMarkDone={() => handleMarkDonePress(v)}
              onDelete={() => handleDelete(v)}
            />
          ))
        )}

        <Text style={styles.sectionTitle}>Past</Text>
        {past.length === 0 ? (
          <Text style={styles.empty}>No past visits</Text>
        ) : (
          past.map((v) => (
            <PastCard
              key={`${v.petId}-${v.id}`}
              visit={v}
              petName={petNames[v.petId] ?? 'Pet'}
              onDelete={() => handleDelete(v)}
            />
          ))
        )}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.findVetsBtn}
          onPress={() => router.push('/tabs/map')}
          activeOpacity={0.8}
        >
          <Ionicons name="map-outline" size={22} color="#fff" />
          <Text style={styles.findVetsBtnText}>Find Vets Near Me</Text>
        </TouchableOpacity>
      </View>

      {/* Schedule Visit Modal */}
      <Modal
        visible={scheduleModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <View style={styles.scheduleModalOverlay}>
          <View style={styles.scheduleModalSafeArea}>
            <View style={styles.scheduleModalContainer}>
              <KeyboardAvoidingView
                style={styles.scheduleModalKAV}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.scheduleModalScrollContent}
                >
                  {console.log('Schedule modal rendered')}
                  <Text style={styles.modalTitle}>Schedule visit</Text>
                  {pets.length === 0 ? (
                    <Text style={styles.empty}>Add a pet first from Home.</Text>
                  ) : (
                    <>
                      <Text style={styles.label}>Pet</Text>
                      <View style={styles.petPicker}>
                        {pets.map((p) => (
                          <TouchableOpacity
                            key={p.id}
                            style={[
                              styles.petChip,
                              form.petId === p.id && styles.petChipActive,
                            ]}
                            onPress={() => setForm((f) => ({ ...f, petId: p.id }))}
                          >
                            <Text
                              style={[
                                styles.petChipText,
                                form.petId === p.id && styles.petChipTextActive,
                              ]}
                            >
                              {p.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                  <Text style={styles.label}>Vet name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Vet or clinic name"
                    placeholderTextColor="#999"
                    value={form.vetName}
                    onChangeText={(t) => setForm((f) => ({ ...f, vetName: t }))}
                  />
                  <Text style={styles.label}>Visit date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#999"
                    value={form.date}
                    onChangeText={(t) => setForm((f) => ({ ...f, date: t }))}
                    keyboardType="numbers-and-punctuation"
                  />
                  <Text style={styles.label}>Reason</Text>
                  <TextInput
                    style={[styles.input, styles.notesInput]}
                    placeholder="Reason for visit"
                    placeholderTextColor="#999"
                    value={form.reason}
                    onChangeText={(t) => setForm((f) => ({ ...f, reason: t }))}
                    multiline
                  />
                  <Text style={styles.label}>Notes (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.notesInput]}
                    placeholder="Any notes"
                    placeholderTextColor="#999"
                    value={form.notes}
                    onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                    onPress={handleSchedule}
                    disabled={loading || !form.petId || pets.length === 0 || !form.vetName.trim() || !form.date.trim()}
                  >
                    <Text style={styles.saveBtnText}>{loading ? 'Saving…' : 'Save'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
                    <Text style={styles.cancel}>Cancel</Text>
                  </TouchableOpacity>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Visit Summary Modal (Mark Done) */}
      <Modal
        visible={summaryModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setSummaryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add visit summary</Text>
            {visitToComplete && (
              <Text style={styles.summaryHint}>
                {visitToComplete.vetName} – {formatDate(visitToComplete.date)}
              </Text>
            )}
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="What was done? Notes from the visit…"
              placeholderTextColor="#999"
              value={summaryText}
              onChangeText={setSummaryText}
              multiline
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleCompleteWithSummary}
            >
              <Text style={styles.saveBtnText}>Mark done</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSummaryModalVisible(false);
                setVisitToComplete(null);
                setSummaryText('');
              }}
            >
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function UpcomingCard({
  visit,
  petName,
  onMarkDone,
  onDelete,
}: {
  visit: VetVisit;
  petName: string;
  onMarkDone: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.vetName}>{visit.vetName || 'Vet visit'}</Text>
        <TouchableOpacity onPress={onDelete} hitSlop={12} style={styles.deleteIcon}>
          <Ionicons name="trash-outline" size={20} color="#c62828" />
        </TouchableOpacity>
      </View>
      <Text style={styles.cardDate}>{formatDate(visit.date)}</Text>
      {visit.reason ? (
        <Text style={styles.cardReason}>{visit.reason}</Text>
      ) : null}
      <Text style={styles.cardPet}>{petName}</Text>
      <TouchableOpacity style={styles.markDoneBtn} onPress={onMarkDone} activeOpacity={0.8}>
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.markDoneText}>Mark done</Text>
      </TouchableOpacity>
    </View>
  );
}

function PastCard({
  visit,
  petName,
  onDelete,
}: {
  visit: VetVisit;
  petName: string;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.card, styles.pastCard]}>
      <View style={styles.cardHeader}>
        <Text style={styles.vetName}>{visit.vetName || 'Vet visit'}</Text>
        <TouchableOpacity onPress={onDelete} hitSlop={12} style={styles.deleteIcon}>
          <Ionicons name="trash-outline" size={20} color="#999" />
        </TouchableOpacity>
      </View>
      <Text style={styles.cardDate}>{formatDate(visit.date)}</Text>
      {visit.visitNotes ? (
        <Text style={styles.cardSummary}>{visit.visitNotes}</Text>
      ) : null}
      <Text style={styles.cardPet}>{petName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  scroll: { flex: 1 },
  scrollContent: {
    padding: SPACING,
    paddingBottom: 100,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: SPACING,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  scheduleBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitleFirst: {
    marginTop: 0,
  },
  empty: { fontSize: 14, color: '#666', marginVertical: 10 },
  card: {
    backgroundColor: CARD_BG,
    padding: SPACING,
    borderRadius: 16,
    marginVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  bottomContainer: {
    padding: SPACING,
    paddingTop: 12,
    paddingBottom: SPACING + 8,
    backgroundColor: BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  findVetsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  findVetsBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pastCard: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vetName: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  deleteIcon: { padding: 4 },
  cardDate: { fontSize: 14, color: ORANGE, marginTop: 4, fontWeight: '600' },
  cardReason: { fontSize: 14, color: '#555', marginTop: 6 },
  cardSummary: { fontSize: 14, color: '#555', marginTop: 6, fontStyle: 'italic' },
  cardPet: { fontSize: 12, color: '#888', marginTop: 6 },
  markDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ORANGE,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  markDoneText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  scheduleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleModalSafeArea: { width: '100%', alignItems: 'center' },
  scheduleModalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  scheduleModalKAV: {},
  scheduleModalScrollContent: { padding: 16, paddingBottom: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalKAV: { flex: 1 },
  modalScrollContent: { paddingBottom: 60 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  summaryHint: { fontSize: 13, color: '#666', marginBottom: 12 },
  label: { fontSize: 13, color: '#666', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  notesInput: { minHeight: 72 },
  petPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  petChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  petChipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  petChipText: { fontSize: 14, color: '#333' },
  petChipTextActive: { color: '#fff' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  timeValue: { fontSize: 16, fontWeight: '600', color: '#333' },
  saveBtn: {
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancel: { textAlign: 'center', marginTop: 12, fontSize: 15, color: '#666' },
});
