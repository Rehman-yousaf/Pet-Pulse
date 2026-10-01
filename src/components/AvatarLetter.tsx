import { StyleSheet, Text, View } from 'react-native';

const AVATAR_BG = '#FF7A00';

interface AvatarLetterProps {
  username: string;
  size?: number;
}

export function AvatarLetter({ username, size = 40 }: AvatarLetterProps) {
  const letter = (username || '?').trim()[0]?.toUpperCase() || '?';
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.letter, { fontSize: size * 0.5 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: AVATAR_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
