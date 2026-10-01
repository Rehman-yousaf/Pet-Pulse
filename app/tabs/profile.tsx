import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { UserAvatar } from '@/src/components/UserAvatar';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { db } from '@/src/services/firebaseConfig';
import type { ThemePreference } from '@/src/services/userService';

const PRIMARY = '#FF7A00';
const BACKGROUND = '#F2F2F2';
const CARD_BG = '#FFFFFF';
const DANGER = '#E53935';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function ProfileScreen() {
  const { user, profile, logout, isLoading: authLoading } = useAuth();
  const { currentTheme, setTheme } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile != null) {
      setName((profile.name || profile.displayName || '').trim() || (user?.email?.split('@')[0] || ''));
    } else if (user?.email) {
      setName(user.email.split('@')[0]?.trim() || '');
    }
  }, [profile, user?.email]);

  const handleSave = useCallback(async () => {
    if (!user?.uid || !name.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { name: name.trim() });
      Alert.alert('Saved', 'Your name has been updated.');
    } catch (e) {
      if (__DEV__) console.warn('Profile save error:', e);
      Alert.alert('Error', 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  }, [user?.uid, name]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace('/auth/login');
    } catch (e) {
      if (__DEV__) console.warn('Logout error:', e);
      router.replace('/auth/login');
    }
  }, [logout, router]);

  const email = user?.email ?? '';
  const displayNameForAvatar = name.trim() || profile?.name || profile?.displayName || email || '?';

  if (authLoading || !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.avatarSection}>
          <UserAvatar name={displayNameForAvatar} size={80} />
          <Text style={styles.avatarHint}>Your profile</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#999"
          />
          <Text style={[styles.label, styles.labelTop]}>Email</Text>
          <Text style={styles.emailValue}>{email}</Text>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.themeRow}>
            {THEMES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.themeChip,
                  currentTheme === t.value && styles.themeChipActive,
                ]}
                onPress={() => setTheme(t.value)}
              >
                <Text
                  style={[
                    styles.themeChipText,
                    currentTheme === t.value && styles.themeChipTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutBtnText}>Sign out</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  kav: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 12, fontSize: 15, color: '#666' },
  avatarSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 28,
  },
  avatarHint: {
    fontSize: 13,
    color: '#666',
    marginTop: 10,
  },
  card: {
    backgroundColor: CARD_BG,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  labelTop: { marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  emailValue: {
    fontSize: 15,
    color: '#333',
  },
  saveBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  themeRow: { flexDirection: 'row', gap: 10 },
  themeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  themeChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  themeChipText: { fontSize: 14, color: '#333', fontWeight: '500' },
  themeChipTextActive: { color: '#fff' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DANGER,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  logoutBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
