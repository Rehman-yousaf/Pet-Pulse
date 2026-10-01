import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { PetCard } from '@/src/components/PetCard';
import { CustomButton } from '@/src/components/CustomButton';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import type { Pet, PetInput } from '@/src/services/petService';
import { addPet, subscribeToPets } from '@/src/services/petService';
import { getRandomPetQuote } from '@/src/utils/getRandomPetQuote';
import { getGreeting } from '@/src/utils/Helpers';
import { PET_TYPES } from '@/src/utils/Helpers';

export function MainDashboardUI() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [pets, setPets] = useState<Pet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm, setAddForm] = useState<PetInput>({
    name: '',
    type: 'dog',
    breed: '',
    age: 0,
    weight: 0,
  });
  const [addLoading, setAddLoading] = useState(false);
  const [dailyQuote, setDailyQuote] = useState(() => getRandomPetQuote());

  const unsubRef = useRef<ReturnType<typeof subscribeToPets> | null>(null);
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    unsubRef.current = subscribeToPets(uid, setPets);
    return () => {
      unsubRef.current?.();
    };
  }, [user?.uid]);

  const filteredPets = useMemo(() => {
    if (!searchQuery.trim()) return pets;
    const q = searchQuery.trim().toLowerCase();
    return pets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || (p.type || '').toLowerCase().includes(q)
    );
  }, [pets, searchQuery]);

  const displayName = profile?.name || profile?.displayName || 'Pet Parent';

  const handleRefreshQuote = useCallback(() => {
    setDailyQuote(getRandomPetQuote());
  }, []);

  const handleAddPet = useCallback(async () => {
    if (!user?.uid || !addForm.name.trim()) return;
    setAddLoading(true);
    try {
      await addPet(user.uid, {
        ...addForm,
        name: addForm.name.trim(),
        breed: addForm.breed.trim(),
      });
      setAddModalVisible(false);
      setAddForm({ name: '', type: 'dog', breed: '', age: 0, weight: 0 });
    } catch (e) {
      console.warn('Add pet error:', e);
    } finally {
      setAddLoading(false);
    }
  }, [user?.uid, addForm]);

  return (
    <>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { backgroundColor: colors.white }]}>
        <View>
          <Text style={[styles.greetingText, { color: colors.grey }]}>{getGreeting()}!</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{displayName} 🐾</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.vetCard}
        onPress={() => router.push('/vet-visits' as any)}
        activeOpacity={0.85}
      >
        <View style={styles.vetCardLeft}>
          <View style={styles.vetCardIconWrap}>
            <Ionicons name="calendar" size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.vetCardTitle}>Vet Visits</Text>
            <Text style={styles.vetCardSubtitle}>Schedule or manage appointments</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={[styles.pawInsightCard, { backgroundColor: colors.card, borderColor: colors.grey + '30' }]}>
        <View style={styles.pawInsightHeader}>
          <Text style={[styles.pawInsightTitle, { color: colors.text }]}>Daily Paw Insight 🐾</Text>
          <TouchableOpacity onPress={handleRefreshQuote} hitSlop={12}>
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.pawInsightQuote, { color: colors.text }]}>{dailyQuote}</Text>
      </View>

      <View style={[styles.section, styles.sectionSpaced]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Family</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setAddModalVisible(true)}
          >
            <Ionicons name="add" size={20} color={colors.white} />
            <Text style={[styles.addBtnText, { color: colors.white }]}>Add Pet</Text>
          </TouchableOpacity>
        </View>

        {pets.length === 0 ? (
          <View style={[styles.emptyPets, { backgroundColor: colors.card, borderColor: colors.grey + '40' }]}>
            <Text style={[styles.emptyText, { color: colors.grey }]}>You haven't added any pets yet</Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setAddModalVisible(true)}
            >
              <Text style={[styles.emptyBtnText, { color: colors.white }]}>Add your first pet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.grey + '40' }]}>
              <Ionicons name="search" size={20} color={colors.grey} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by name or type..."
                placeholderTextColor={colors.grey}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.grey} />
                </TouchableOpacity>
              )}
            </View>
            {filteredPets.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.grey }]}>No pets match your search</Text>
            ) : (
              filteredPets.map((pet) => (
                <PetCard
                  key={pet.id}
                  name={pet.name}
                  breed={pet.breed ?? ''}
                  type={pet.type}
                  age={pet.age}
                  onPress={() => router.push(`/pets/${pet.id}` as any)}
                />
              ))
            )}
          </>
        )}
      </View>

      </ScrollView>
    </SafeAreaView>

      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
              style={styles.modalKAV}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Pet</Text>
                <TextInput
                  style={[styles.input, styles.inputSpaced, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
                  placeholder="Name"
                  placeholderTextColor={colors.grey}
                  value={addForm.name}
                  onChangeText={(t) => setAddForm((f) => ({ ...f, name: t }))}
                />
                <TextInput
                  style={[styles.input, styles.inputSpaced, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
                  placeholder="Breed"
                  placeholderTextColor={colors.grey}
                  value={addForm.breed}
                  onChangeText={(t) => setAddForm((f) => ({ ...f, breed: t }))}
                />
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.inputHalf, styles.inputSpaced, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
                    placeholder="Age"
                    placeholderTextColor={colors.grey}
                    keyboardType="number-pad"
                    value={addForm.age ? String(addForm.age) : ''}
                    onChangeText={(t) => setAddForm((f) => ({ ...f, age: parseInt(t, 10) || 0 }))}
                  />
                  <TextInput
                    style={[styles.input, styles.inputHalf, styles.inputSpaced, { backgroundColor: colors.card, color: colors.text, borderColor: colors.grey }]}
                    placeholder="Weight (kg)"
                    placeholderTextColor={colors.grey}
                    keyboardType="decimal-pad"
                    value={addForm.weight ? String(addForm.weight) : ''}
                    onChangeText={(t) => setAddForm((f) => ({ ...f, weight: parseFloat(t) || 0 }))}
                  />
                </View>
                <View style={styles.typeRow}>
                  {PET_TYPES.slice(0, 6).map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.typeChip,
                        { backgroundColor: addForm.type === t.id ? colors.primary : colors.card },
                      ]}
                      onPress={() => setAddForm((f) => ({ ...f, type: t.id }))}
                    >
                      <Text style={[styles.typeChipText, { color: addForm.type === t.id ? colors.white : colors.text }]}>
                        {t.emoji} {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <CustomButton title="Add Pet" onPress={handleAddPet} loading={addLoading} />
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <Text style={[styles.cancelText, { color: colors.grey }]}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  greetingText: { fontSize: 16, fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: 'bold' },
  vetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF7A00',
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
  },
  vetCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  vetCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  vetCardTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  vetCardSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  pawInsightCard: {
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  pawInsightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pawInsightTitle: { fontSize: 16, fontWeight: '700' },
  pawInsightQuote: { fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  section: { marginBottom: 20 },
  sectionSpaced: { marginTop: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 16 },
  emptyPets: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 15,
    borderWidth: 1,
  },
  emptyText: { marginTop: 12, fontSize: 16 },
  emptyBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  emptyBtnText: { fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSafeArea: { width: '100%', alignItems: 'center' },
  modalContainer: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalKAV: { maxHeight: '100%' },
  modalScrollContent: { paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  inputSpaced: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  inputHalf: { flex: 1 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  typeChipText: { fontSize: 14 },
  cancelText: { textAlign: 'center', marginTop: 12, fontSize: 16 },
});
