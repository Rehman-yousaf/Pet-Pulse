import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import type { ActivityItem } from '@/src/services/activityService';
import { markActivityRead, subscribeToActivities } from '@/src/services/activityService';
import { timeAgo } from '@/src/utils/timeAgo';

const PRIMARY = '#FF7A00';
const BACKGROUND = '#F5F5F5';
const CARD_RADIUS = 14;
const SPACING = 16;

const TYPE_ICON: Record<ActivityItem['type'], string> = {
  medication: '💊',
  diet: '🥣',
  vaccine: '💉',
  vet: '🏥',
  like: '❤️',
  comment: '💬',
};

function ActivityCard({
  item,
  onPress,
}: {
  item: ActivityItem;
  onPress: () => void;
}) {
  const isUnread = !item.read;
  return (
    <Pressable
      style={[styles.card, isUnread ? styles.cardUnread : styles.cardRead]}
      onPress={onPress}
    >
      <View style={styles.cardRow}>
        <Text style={styles.icon}>{TYPE_ICON[item.type]}</Text>
        <View style={styles.cardBody}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>✓</Text>
      <Text style={styles.emptyTitle}>You're all caught up!</Text>
      <Text style={styles.emptySub}>
        New reminders and social activity will appear here.
      </Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToActivities(user.uid, setActivities);
    return () => unsub();
  }, [user?.uid]);

  const handlePress = async (item: ActivityItem) => {
    if (!user?.uid) return;
    if (!item.read) {
      try {
        await markActivityRead(user.uid, item.id);
      } catch (e) {
        if (__DEV__) console.warn('markActivityRead failed:', e);
      }
    }
    if ((item.type === 'like' || item.type === 'comment') && item.referenceId) {
      router.push('/tabs/social');
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Activity</Text>
            <Text style={styles.headerSub}>Sign in to see your activity</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Activity</Text>
            <Text style={styles.headerSub}>Reminders & social updates</Text>
          </View>
        </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, activities.length === 0 && styles.listContentEmpty]}
        ListEmptyComponent={EmptyState}
        renderItem={({ item }) => (
          <ActivityCard item={item} onPress={() => handlePress(item)} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: SPACING,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 13,
    marginTop: 2,
    color: 'rgba(255,255,255,0.9)',
  },
  listContent: {
    padding: SPACING,
    paddingBottom: SPACING * 2,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    borderRadius: CARD_RADIUS,
    padding: SPACING,
    marginBottom: SPACING,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardUnread: {
    backgroundColor: '#FFF4E8',
  },
  cardRead: {
    backgroundColor: '#FFFFFF',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING * 2,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
