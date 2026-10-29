import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { fetchProductByBarcode, type ScannedProduct } from '@/src/services/foodLookupService';
import type { PetContext } from '@/src/services/grokService';
import { analyzeSnackSafetyWithGroq, type SnackSafetyResult } from '@/src/services/groqSnackAnalyzer';
import { subscribeToPets, type Pet } from '@/src/services/petService';
import { PET_TYPES, getPetEmoji } from '@/src/utils/Helpers';

type Mode = 'scan' | 'search';

function adviceBadge(result: SnackSafetyResult): { label: string; color: string } {
  const portion = result.portionGuide.toLowerCase();
  const blocked = /\b0\s*g\b/.test(portion) || portion.includes('do not feed');
  if (blocked || result.status === 'TOXIC' || result.safetyScore <= 40) {
    return { label: 'Do Not Feed', color: '#FF3B30' };
  }
  if (result.status === 'CAUTION' || (result.safetyScore > 40 && result.safetyScore <= 75)) {
    return { label: 'Feed with Caution / Small Portion', color: '#FF9500' };
  }
  return { label: 'Safe in Moderation', color: '#34C759' };
}

const VERDICT = {
  SAFE: { color: '#34C759', label: 'Safe' },
  CAUTION: { color: '#FF9500', label: 'Caution' },
  TOXIC: { color: '#FF3B30', label: 'Toxic' },
} as const;

function speciesLabel(type: string): string {
  const key = (type || '').trim().toLowerCase();
  return PET_TYPES.find((item) => item.id === key)?.label ?? (type?.trim() || 'Pet');
}

function toPetContext(pet: Pet): PetContext {
  return {
    id: pet.id,
    name: pet.name?.trim() || 'your pet',
    type: speciesLabel(pet.type),
    breed: pet.breed?.trim() || 'Unknown breed',
    age: Number(pet.age) || 0,
    weight: Number(pet.weight) || 0,
  };
}

export default function SafeSnackerScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('scan');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const [result, setResult] = useState<SnackSafetyResult | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const scanLock = useRef(false);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setPets([]);
      setSelectedId(null);
      return;
    }
    return subscribeToPets(uid, (next) => {
      setPets(next);
      setSelectedId((current) => (current && next.some((pet) => pet.id === current) ? current : next[0]?.id ?? null));
    });
  }, [user?.uid]);

  const selectedPet = useMemo(() => pets.find((pet) => pet.id === selectedId) ?? null, [pets, selectedId]);
  const petContext = selectedPet ? toPetContext(selectedPet) : null;

  const finishWith = useCallback(async (name: string, ingredients: string, found: ScannedProduct | null) => {
    if (!petContext) {
      setLookupError('Add a pet on Home before checking a snack.');
      setLoading(false);
      setStatusText('');
      scanLock.current = false;
      return;
    }
    setLoading(true);
    setStatusText('Checking safety with Dr. PawPulse...');
    setProduct(found);
    try {
      const safety = await analyzeSnackSafetyWithGroq(name, ingredients, petContext);
      setResult(safety);
      setSheetOpen(true);
      const haptic =
        safety.status === 'TOXIC'
          ? Haptics.NotificationFeedbackType.Error
          : safety.status === 'SAFE'
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning;
      await Haptics.notificationAsync(haptic);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Safety check failed';
      console.log('[SafeSnacker] analysis failed', message);
      setLookupError(message);
      Alert.alert('Safety check failed', message);
    } finally {
      setLoading(false);
      setStatusText('');
      scanLock.current = false;
    }
  }, [petContext]);

  const onBarcode = useCallback(
    async (barcode: string) => {
      if (scanLock.current || loading || mode !== 'scan') return;
      scanLock.current = true;
      setLookupError(null);
      setLoading(true);
      setStatusText('Looking up barcode...');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log('[SafeSnacker] barcode', barcode);
      const found = await fetchProductByBarcode(barcode);
      if (!found) {
        setLoading(false);
        setStatusText('');
        scanLock.current = false;
        Alert.alert('Barcode not found', 'Product barcode not found in database. Please use manual food search.');
        return;
      }
      await finishWith(found.productName, `${found.brand ? found.brand + '. ' : ''}${found.ingredientsText}`, found);
    },
    [finishWith, loading, mode]
  );

  const onSearch = useCallback(async () => {
    const text = query.trim();
    if (!text || loading) return;
    setLookupError(null);
    await finishWith(text, text, null);
  }, [finishWith, loading, query]);

  const verdict = result ? VERDICT[result.status] : null;
  const advice = result ? adviceBadge(result) : null;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.petBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {pets.length === 0 ? (
          <Text style={[styles.emptyPets, { color: colors.grey }]}>Add a pet on Home to check snacks.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petRow}>
            {pets.map((pet) => {
              const selected = pet.id === selectedId;
              return (
                <TouchableOpacity key={pet.id} style={styles.petChip} onPress={() => setSelectedId(pet.id)}>
                  <View style={[styles.avatar, selected && styles.avatarOn]}>
                    <Text style={styles.emoji}>{getPetEmoji(pet.type)}</Text>
                  </View>
                  <Text numberOfLines={1} style={[styles.petName, { color: selected ? colors.primary : colors.text }]}>
                    {pet.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        {petContext ? (
          <Text style={[styles.checking, { color: colors.grey }]}>
            Checking snacks for {petContext.name} ({petContext.breed}, {petContext.weight}kg)
          </Text>
        ) : null}
      </View>

      <View style={styles.tabs}>
        {(['scan', 'search'] as const).map((item) => {
          const active = mode === item;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.tab, active && { backgroundColor: colors.primary }]}
              onPress={() => setMode(item)}
            >
              <Ionicons name={item === 'scan' ? 'barcode-outline' : 'search'} size={16} color={active ? '#fff' : colors.text} />
              <Text style={[styles.tabText, { color: active ? '#fff' : colors.text }]}>
                {item === 'scan' ? 'Scan barcode' : 'Type a food'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mode === 'scan' ? (
        <View style={styles.scannerWrap}>
          {!permission?.granted ? (
            <View style={styles.permissionBox}>
              <Ionicons name="camera-outline" size={42} color={colors.primary} />
              <Text style={[styles.permissionText, { color: colors.text }]}>
                Camera access is needed to read food barcodes.
              </Text>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={requestPermission}>
                <Text style={styles.primaryBtnText}>Allow camera</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
              onBarcodeScanned={loading ? undefined : ({ data }) => void onBarcode(data)}
            />
          )}
          <View pointerEvents="none" style={styles.frame} />
        </View>
      ) : (
        <View style={styles.searchBox}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="Peanut butter, blueberries, grapes..."
            placeholderTextColor={colors.grey}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void onSearch()}
            editable={!loading && !!petContext}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: query.trim() && petContext ? 1 : 0.5 }]}
            onPress={() => void onSearch()}
            disabled={!query.trim() || loading || !petContext}
          >
            <Text style={styles.primaryBtnText}>Check this food</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.grey }]}>{statusText || 'Working...'}</Text>
        </View>
      ) : null}
      {lookupError ? <Text style={styles.errorText}>{lookupError}</Text> : null}

      <Modal visible={sheetOpen} animationType="slide" transparent onRequestClose={() => setSheetOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {product?.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.productImage} /> : null}
              <Text style={[styles.foodName, { color: colors.text }]}>{product?.productName || query.trim()}</Text>
              {product?.brand ? <Text style={[styles.brand, { color: colors.grey }]}>{product.brand}</Text> : null}

              {result && verdict && advice ? (
                <>
                  <View style={[styles.badge, { backgroundColor: verdict.color }]}>
                    <Ionicons
                      name={result.status === 'SAFE' ? 'shield-checkmark' : 'warning'}
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.badgeText}>{result.title}</Text>
                  </View>
                  <View style={[styles.banner, { borderColor: advice.color, backgroundColor: advice.color + '18' }]}>
                    <Text style={[styles.bannerText, { color: advice.color }]}>{advice.label}</Text>
                  </View>

                  <View style={styles.scoreRow}>
                    <View style={[styles.scoreRing, { borderColor: verdict.color }]}>
                      <Text style={[styles.scoreValue, { color: verdict.color }]}>{result.safetyScore}</Text>
                      <Text style={[styles.scoreOf, { color: colors.grey }]}>/100</Text>
                    </View>
                    <Text style={[styles.scoreLabel, { color: colors.text }]}>Safety score for {petContext?.name}</Text>
                  </View>

                  <Text style={[styles.blockTitle, { color: colors.text }]}>Flagged ingredients</Text>
                  {result.toxicIngredients.length === 0 ? (
                    <Text style={[styles.body, { color: colors.grey }]}>None flagged.</Text>
                  ) : (
                    result.toxicIngredients.map((item) => (
                      <Text key={item} style={[styles.flag, { color: verdict.color }]}>
                        • {item}
                      </Text>
                    ))
                  )}

                  <Text style={[styles.blockTitle, { color: colors.text }]}>
                    Portion for {petContext?.weight}kg
                  </Text>
                  <View style={[styles.pill, { backgroundColor: '#FFF6EE' }]}>
                    <Text style={styles.pillText}>{result.portionGuide}</Text>
                  </View>

                  <Text style={[styles.blockTitle, { color: colors.text }]}>Personalized summary</Text>
                  <Text style={[styles.body, { color: colors.text }]}>{result.summary}</Text>
                  <Text style={[styles.body, { color: colors.grey, marginTop: 8 }]}>{result.caloricImpact}</Text>
                </>
              ) : null}

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => setSheetOpen(false)}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  petBar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 8 },
  petRow: { paddingHorizontal: 12, paddingTop: 10, gap: 12 },
  petChip: { width: 68, alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF6EE',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOn: { borderColor: '#FF8C42' },
  emoji: { fontSize: 24 },
  petName: { marginTop: 4, fontSize: 12, fontWeight: '600' },
  emptyPets: { padding: 16, fontSize: 14 },
  checking: { paddingHorizontal: 16, paddingTop: 6, fontSize: 12 },
  tabs: { flexDirection: 'row', gap: 8, padding: 16 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  tabText: { fontWeight: '700', fontSize: 14 },
  scannerWrap: { marginHorizontal: 16, height: 280, borderRadius: 18, overflow: 'hidden', backgroundColor: '#111' },
  camera: { flex: 1 },
  frame: {
    position: 'absolute',
    left: 36,
    right: 36,
    top: 70,
    bottom: 70,
    borderWidth: 3,
    borderColor: '#FF8C42',
    borderRadius: 16,
  },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 },
  permissionText: { textAlign: 'center', fontSize: 15 },
  searchBox: { paddingHorizontal: 16, gap: 12 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16 },
  primaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  loadingText: { fontSize: 14 },
  errorText: { color: '#FF3B30', paddingHorizontal: 16, paddingTop: 12, fontSize: 14 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { maxHeight: '86%', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18 },
  productImage: { width: '100%', height: 140, borderRadius: 14, marginBottom: 12 },
  foodName: { fontSize: 22, fontWeight: '800' },
  brand: { marginTop: 2, fontSize: 14 },
  badge: {
    marginTop: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  badgeText: { color: '#fff', fontWeight: '800' },
  banner: { marginTop: 12, borderWidth: 1, borderRadius: 12, padding: 12 },
  bannerText: { fontWeight: '800', fontSize: 16 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 },
  scoreRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: { fontSize: 24, fontWeight: '800' },
  scoreOf: { fontSize: 12 },
  scoreLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  blockTitle: { marginTop: 16, fontSize: 16, fontWeight: '800' },
  body: { marginTop: 6, fontSize: 15, lineHeight: 22 },
  flag: { marginTop: 4, fontSize: 15, fontWeight: '600' },
  pill: { marginTop: 8, borderRadius: 14, padding: 12 },
  pillText: { color: '#9A3412', fontWeight: '600', fontSize: 15 },
});
