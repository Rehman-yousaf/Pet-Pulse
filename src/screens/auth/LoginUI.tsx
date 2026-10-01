import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '@/src/components/ScreenWrapper';
import { CustomButton } from '@/src/components/CustomButton';
import { Colors } from '@/src/constants/Colors';
import { loginWithEmail } from '@/src/services/authService';
import { isValidEmail } from '@/src/utils/Helpers';

export const LoginUI = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/tabs');
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const msg =
        err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password'
          ? 'Invalid email or password'
          : err?.code === 'auth/invalid-email'
          ? 'Invalid email format'
          : err?.message || 'Login failed. Please try again.';
      setError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper
      style={styles.container}
      paddingBottom={60}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.title}>Welcome to PetPulse</Text>
        <Text style={styles.subtitle}>Sign in to manage your pet's health</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.grey}
          value={email}
          onChangeText={(t) => { setEmail(t); setError(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.grey}
          value={password}
          onChangeText={(t) => { setPassword(t); setError(''); }}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => router.push('/auth/forgot-password')}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <CustomButton title="Login" onPress={handleLogin} loading={loading} />

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => router.push('/auth/register')}
        >
          <Text style={styles.registerText}>
            Don't have an account? <Text style={styles.registerBold}>Register</Text>
          </Text>
        </TouchableOpacity>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.background },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.grey,
    textAlign: 'center',
    marginBottom: 30,
  },
  errorText: {
    color: Colors.error,
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#EEE',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  registerBtn: { marginTop: 25, alignItems: 'center' },
  registerText: { color: Colors.text, fontSize: 16 },
  registerBold: { color: Colors.primary, fontWeight: 'bold' },
});
