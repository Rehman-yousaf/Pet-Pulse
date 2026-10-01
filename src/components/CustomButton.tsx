import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
  loading?: boolean;
  disabled?: boolean;
}

export const CustomButton = ({
  title,
  onPress,
  color,
  style,
  loading = false,
  disabled = false,
}: ButtonProps) => {
  const { colors } = useTheme();
  const bgColor = color ?? colors.primary;
  const isDisabled = loading || disabled;
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: bgColor },
        style,
        isDisabled && styles.disabled,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.white} />
      ) : (
        <Text style={[styles.text, { color: colors.white }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 10,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabled: { opacity: 0.7 },
});
