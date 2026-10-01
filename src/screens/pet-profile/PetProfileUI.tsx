import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { isToday } from '@/src/utils/dateUtils';
import type { DietPlan } from '@/src/services/dietService';
import { deleteDietPlan, markDietPlanAsFed, subscribeToDietPlans } from '@/src/services/dietService';
import type { Medication } from '@/src/services/medicationService';
import { deleteMedication, markMedicationAsGiven, subscribeToMedications } from '@/src/services/medicationService';
import { getPet } from '@/src/services/petService';
import type { Vaccination } from '@/src/services/vaccinationService';
import { deleteVaccination, markVaccinationAsGiven, subscribeToVaccinations } from '@/src/services/vaccinationService';

type TabId = 'overview' | 'meds' | 'diet' | 'vaccines';

export function PetProfileUI() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [tab, setTab] = useState<TabId>('overview');
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);

  const uid = user?.uid ?? '';
  const pid = (petId as string) ?? '';

  useEffect(() => {
    if (!uid || !pid) return;
    getPet(uid, pid).then((p) => {
      if (p) {
        setPetName(p.name);
        setPetType(p.type || 'pet');
      }
    });
  }, [uid, pid]);

  const unsubM = useRef<ReturnType<typeof subscribeToMedications> | null>(null);
  const unsubD = useRef<ReturnType<typeof subscribeToDietPlans> | null>(null);
  const unsubV = useRef<ReturnType<typeof subscribeToVaccinations> | null>(null);
  useEffect(() => {
    if (!uid || !pid) return;
    unsubM.current = subscribeToMedications(uid, pid, setMedications);
    unsubD.current = subscribeToDietPlans(uid, pid, setDietPlans);
    unsubV.current = subscribeToVaccinations(uid, pid, setVaccinations);
    return () => {
      unsubM.current?.();
      unsubD.current?.();
      unsubV.current?.();
    };
  }, [uid, pid]);

  const handleDeleteMed = useCallback(
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

  const handleDeleteDiet = useCallback(
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

  const handleDeleteVacc = useCallback(
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

  const handleMarkMedGiven = useCallback(
    async (med: Medication) => {
      if (!uid || !pid) return;
      try {
        await markMedicationAsGiven(uid, pid, med.id, med.name);
      } catch (e) {
        console.warn('Mark given error:', e);
      }
    },
    [uid, pid]
  );

  const handleMarkFed = useCallback(
    async (plan: DietPlan) => {
      if (!uid || !pid) return;
      try {
        await markDietPlanAsFed(uid, pid, plan.id, plan.title);
      } catch (e) {
        console.warn('Mark fed error:', e);
      }
    },
    [uid, pid]
  );

  const handleMarkVaccGiven = useCallback(
    async (v: Vaccination) => {
      if (!uid || !pid) return;
      try {
        await markVaccinationAsGiven(uid, pid, v.id, v.name);
      } catch (e) {
        console.warn('Mark given error:', e);
      }
    },
    [uid, pid]
  );

  if (!pid) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.grey }]}>Missing pet</Text>
      </View>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'meds', label: 'Meds' },
    { id: 'diet', label: 'Diet' },
    { id: 'vaccines', label: 'Vaccines' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.petName, { color: colors.text }]}>{petName || 'Pet'}</Text>
          <Text style={[styles.petType, { color: colors.tabInactive }]}>{petType}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && { borderBottomColor: colors.tabActive, borderBottomWidth: 2 }]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabLabel, { color: tab === t.id ? colors.tabActive : colors.tabInactive }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {tab === 'overview' && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grey + '30' }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Quick actions</Text>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={() => setTab('meds')}
            >
              <Ionicons name="medkit-outline" size={22} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Medications</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={() => setTab('diet')}
            >
              <Ionicons name="nutrition-outline" size={22} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Diet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={() => setTab('vaccines')}
            >
              <Ionicons name="fitness-outline" size={22} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Vaccinations</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={() => router.push(`/history/${pid}` as any)}
            >
              <Ionicons name="time-outline" size={22} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>History</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'meds' && (
          <>
            <TouchableOpacity
              style={[styles.addRow, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/pets/${pid}/meds/new` as any)}
            >
              <Ionicons name="add" size={22} color={colors.white} />
              <Text style={[styles.addRowText, { color: colors.white }]}>Add medication</Text>
            </TouchableOpacity>
            {medications.length === 0 ? (
              <Pressable
                style={[styles.empty, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/pets/${pid}/meds/new` as any)}
              >
                <Ionicons name="medkit-outline" size={48} color={colors.grey} />
                <Text style={[styles.emptyText, { color: colors.grey }]}>No medications yet</Text>
                <Text style={[styles.emptySub, { color: colors.grey }]}>Tap + to add</Text>
              </Pressable>
            ) : (
              medications.map((med) => {
                const givenToday = med.isGivenToday === true && isToday(med.lastGivenAt);
                return (
                  <View
                    key={med.id}
                    style={[styles.rowCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <TouchableOpacity
                      style={styles.rowCardBody}
                      onPress={() => router.push(`/pets/${pid}/meds/${med.id}` as any)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.rowTitle, { color: colors.text }]}>{med.name}</Text>
                      <Text style={[styles.rowSub, { color: colors.grey }]}>
                        {med.dosage && `${med.dosage} • `}
                        {med.frequency}
                        {(med.reminderTimes?.length ?? 0) > 0 && ` • ${med.reminderTimes!.join(', ')}`}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.markGivenBtn,
                          { backgroundColor: givenToday ? '#2ECC71' : colors.primary },
                        ]}
                        onPress={(e) => { e.stopPropagation(); if (!givenToday) handleMarkMedGiven(med); }}
                        disabled={givenToday}
                      >
                        <Text style={[styles.markGivenBtnText, { color: colors.white }]}>
                          {givenToday ? 'Marked as Given' : 'Mark as Given'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteMed(med)} hitSlop={12}>
                      <Ionicons name="trash-outline" size={22} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        )}

        {tab === 'diet' && (
          <>
            <TouchableOpacity
              style={[styles.addRow, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/pets/${pid}/diet/new` as any)}
            >
              <Ionicons name="add" size={22} color={colors.white} />
              <Text style={[styles.addRowText, { color: colors.white }]}>Add diet plan</Text>
            </TouchableOpacity>
            {dietPlans.length === 0 ? (
              <Pressable
                style={[styles.empty, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/pets/${pid}/diet/new` as any)}
              >
                <Ionicons name="nutrition-outline" size={48} color={colors.grey} />
                <Text style={[styles.emptyText, { color: colors.grey }]}>No diet plans yet</Text>
                <Text style={[styles.emptySub, { color: colors.grey }]}>Tap + to add</Text>
              </Pressable>
            ) : (
              dietPlans.map((plan) => {
                const givenToday = plan.isGivenToday === true && isToday(plan.lastGivenAt);
                return (
                  <View
                    key={plan.id}
                    style={[styles.rowCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <TouchableOpacity
                      style={styles.rowCardBody}
                      onPress={() => router.push(`/pets/${pid}/diet/${plan.id}` as any)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.rowTitle, { color: colors.text }]}>{plan.title}</Text>
                      {(plan.notes || (plan.items?.length ?? 0) > 0) && (
                        <Text style={[styles.rowSub, { color: colors.grey }]}>
                          {plan.notes || plan.items?.map((i) => i.label).join(' • ')}
                        </Text>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.markGivenBtn,
                          { backgroundColor: givenToday ? '#2ECC71' : colors.primary },
                        ]}
                        onPress={(e) => { e.stopPropagation(); if (!givenToday) handleMarkFed(plan); }}
                        disabled={givenToday}
                      >
                        <Text style={[styles.markGivenBtnText, { color: colors.white }]}>
                          {givenToday ? 'Marked as Fed' : 'Mark as Fed'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteDiet(plan)} hitSlop={12}>
                      <Ionicons name="trash-outline" size={22} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        )}

        {tab === 'vaccines' && (
          <>
            <TouchableOpacity
              style={[styles.addRow, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/pets/${pid}/vaccines/new` as any)}
            >
              <Ionicons name="add" size={22} color={colors.white} />
              <Text style={[styles.addRowText, { color: colors.white }]}>Add vaccination</Text>
            </TouchableOpacity>
            {vaccinations.length === 0 ? (
              <Pressable
                style={[styles.empty, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/pets/${pid}/vaccines/new` as any)}
              >
                <Ionicons name="fitness-outline" size={48} color={colors.grey} />
                <Text style={[styles.emptyText, { color: colors.grey }]}>No vaccinations yet</Text>
                <Text style={[styles.emptySub, { color: colors.grey }]}>Tap + to add</Text>
              </Pressable>
            ) : (
              vaccinations.map((v) => {
                const givenToday = v.isGivenToday === true && isToday(v.lastGivenAt);
                return (
                  <View
                    key={v.id}
                    style={[styles.rowCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <TouchableOpacity
                      style={styles.rowCardBody}
                      onPress={() => router.push(`/pets/${pid}/vaccines/${v.id}` as any)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.rowTitle, { color: colors.text }]}>{v.name}</Text>
                      <Text style={[styles.rowSub, { color: colors.grey }]}>
                        {v.date}
                        {v.nextDue ? ` • Next: ${v.nextDue}` : ''}
                        {v.vetName ? ` • ${v.vetName}` : ''}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.markGivenBtn,
                          { backgroundColor: givenToday ? '#2ECC71' : colors.primary },
                        ]}
                        onPress={(e) => { e.stopPropagation(); if (!givenToday) handleMarkVaccGiven(v); }}
                        disabled={givenToday}
                      >
                        <Text style={[styles.markGivenBtnText, { color: colors.white }]}>
                          {givenToday ? 'Marked as Given' : 'Mark as Given'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteVacc(v)} hitSlop={12}>
                      <Ionicons name="trash-outline" size={22} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { width: 24 },
  petName: { fontSize: 18, fontWeight: 'bold' },
  petType: { fontSize: 14, marginTop: 2, textTransform: 'capitalize' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabLabel: { fontSize: 14, fontWeight: '600' },
  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  actionBtnText: { fontSize: 16, fontWeight: '500' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  addRowText: { fontSize: 16, fontWeight: '600' },
  empty: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: { fontSize: 16, marginTop: 12 },
  emptySub: { fontSize: 14, marginTop: 4 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  rowCardBody: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 4 },
  markGivenBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  markGivenBtnText: { fontSize: 14, fontWeight: '600' },
  errorText: { textAlign: 'center', marginTop: 24, fontSize: 16 },
});
