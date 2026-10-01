import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import type { LogEntry } from '@/src/services/logService';
import { deleteLog, listenToLogs } from '@/src/services/logService';
import { getPet } from '@/src/services/petService';

function formatLogDate(entry: LogEntry): string {
  try {
    const createdAt = entry.createdAt;
    if (entry.at) return new Date(entry.at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    if (createdAt && typeof (createdAt as { toDate?: () => Date }).toDate === 'function') {
      return (createdAt as { toDate: () => Date }).toDate().toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return '';
  } catch {
    return '';
  }
}

function iconForType(type: string): 'medkit-outline' | 'fast-food-outline' | 'shield-checkmark-outline' | 'ellipse-outline' {
  switch (type) {
    case 'medication':
      return 'medkit-outline';
    case 'diet':
      return 'fast-food-outline';
    case 'vaccination':
      return 'shield-checkmark-outline';
    default:
      return 'ellipse-outline';
  }
}

export function HistoryUI() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [petName, setPetName] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const unsubRef = useRef<ReturnType<typeof listenToLogs> | null>(null);

  const uid = user?.uid ?? '';
  const pid = (petId as string) ?? '';

  useEffect(() => {
    if (uid && pid) getPet(uid, pid).then((p) => setPetName(p?.name ?? 'Pet'));
  }, [uid, pid]);

  useEffect(() => {
    if (!uid || !pid) return;
    unsubRef.current = listenToLogs(uid, pid, setLogs);
    return () => {
      unsubRef.current?.();
    };
  }, [uid, pid]);

  const handleDelete = useCallback(
    (log: LogEntry) => {
      Alert.alert('Delete entry', `Remove "${log.itemName}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => uid && pid && deleteLog(uid, pid, log.id),
        },
      ]);
    },
    [uid, pid]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>History</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listInner}>
        {logs.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card }]}>
            <Ionicons name="time-outline" size={48} color={colors.grey} />
            <Text style={[styles.emptyText, { color: colors.grey }]}>No log entries yet</Text>
          </View>
        ) : (
          logs.map((log) => (
            <View
              key={log.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={iconForType(log.type)} size={24} color={colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.itemName, { color: colors.text }]}>{log.itemName}</Text>
                <Text style={[styles.timestamp, { color: colors.grey }]}>{formatLogDate(log)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  {log.type}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(log)} hitSlop={12}>
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  headerRight: { width: 24 },
  list: { flex: 1 },
  listInner: { padding: 16, paddingBottom: 40 },
  empty: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: { fontSize: 16, marginTop: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconWrap: { marginRight: 12 },
  cardBody: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600' },
  timestamp: { fontSize: 13, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
