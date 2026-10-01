import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { getPetEmoji } from '@/src/utils/Helpers';

interface PetCardProps {
  name: string;
  breed: string;
  type?: string;
  age?: number;
  onPress: () => void;
  onQuickAction?: () => void;
}

export const PetCard = React.memo(function PetCard({ name, breed, type, age, onPress, onQuickAction }: PetCardProps) {
  const { colors } = useTheme();
  const emoji = getPetEmoji(type ?? '');

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.grey + '40' }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '18' }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.breed, { color: colors.grey }]}>
          {breed || '—'}
          {age != null && age >= 0 ? ` • ${age} yr` : ''}
        </Text>
      </View>
      {onQuickAction ? (
        <TouchableOpacity onPress={onQuickAction} hitSlop={12}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.grey} />
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.grey} />
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 28 },
  info: { flex: 1, marginLeft: 15 },
  name: { fontSize: 18, fontWeight: 'bold' },
  breed: { fontSize: 14 },
});
