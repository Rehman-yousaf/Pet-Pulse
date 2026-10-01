import { StyleSheet, Text, View } from 'react-native';

const ORANGE = '#FF7A00';

interface UserAvatarProps {
  name?: string;
  size?: number;
}

export function UserAvatar({ name, size = 40 }: UserAvatarProps) {
  const letter = (name?.trim?.()?.[0] ?? '?').toUpperCase();
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.letter, { fontSize: size * 0.5 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
