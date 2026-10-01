import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenWrapper } from '@/src/components/ScreenWrapper';
import { CustomButton } from '@/src/components/CustomButton';
import { Colors } from '@/src/constants/Colors';
import { resetPassword } from '@/src/services/authService';
import { isValidEmail } from '@/src/utils/Helpers';

export const ForgotPasswordUI = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const msg =
        err?.code === 'auth/user-not-found'
          ? 'No account found with this email'
          : err?.code === 'auth/invalid-email'
          ? 'Invalid email format'
          : err?.message || 'Failed to send reset email. Please try again.';
      setError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We've sent a password reset link to {email}
        </Text>
        <CustomButton
          title="Back to Login"
          onPress={() => router.replace('/auth/login')}
          style={{ marginTop: 30 }}
        />
      </View>
    );
  }

  return (
    <ScreenWrapper
      style={styles.container}
      paddingBottom={60}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.grey}
          value={email}
          onChangeText={(t) => { setEmail(t); setError(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <CustomButton title="Send Reset Link" onPress={handleReset} loading={loading} />

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 25, paddingTop: 60 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.grey,
    marginBottom: 30,
  },
  errorText: { color: Colors.error, marginBottom: 12, fontSize: 14 },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#EEE',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  backBtn: { marginTop: 20, alignItems: 'center' },
  backText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
});
