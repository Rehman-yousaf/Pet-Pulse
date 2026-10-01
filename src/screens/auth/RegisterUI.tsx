import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '@/src/components/ScreenWrapper';
import { CustomButton } from '@/src/components/CustomButton';
import { Colors } from '@/src/constants/Colors';
import { registerWithEmail } from '@/src/services/authService';
import { isValidEmail } from '@/src/utils/Helpers';

export const RegisterUI = () => {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setError('Please enter a password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(email.trim(), password, fullName.trim());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Account created! You can now sign in.', [
        { text: 'OK', onPress: () => router.replace('/auth/login') },
      ]);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const msg =
        err?.code === 'auth/email-already-in-use'
          ? 'This email is already registered. Please login instead.'
          : err?.code === 'auth/weak-password'
          ? 'Password is too weak. Use at least 6 characters.'
          : err?.code === 'auth/invalid-email'
          ? 'Invalid email format'
          : err?.message || 'Registration failed. Please try again.';
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
      <Text style={styles.title}>Join PetPulse</Text>
        <Text style={styles.subtitle}>Start your pet's health journey today</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor={Colors.grey}
          value={fullName}
          onChangeText={(t) => { setFullName(t); setError(''); }}
          autoCapitalize="words"
        />
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
          placeholder="Password (min 6 characters)"
          placeholderTextColor={Colors.grey}
          value={password}
          onChangeText={(t) => { setPassword(t); setError(''); }}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor={Colors.grey}
          value={confirmPassword}
          onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
          secureTextEntry
        />

        <CustomButton
          title="Sign Up"
          color={Colors.secondary}
          onPress={handleRegister}
          loading={loading}
        />

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.replace('/auth/login')}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginBold}>Login</Text>
          </Text>
        </TouchableOpacity>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.background },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 40,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.grey, textAlign: 'center', marginBottom: 30 },
  errorText: { color: Colors.error, marginBottom: 12, textAlign: 'center', fontSize: 14 },
  input: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EEE',
    fontSize: 16,
  },
  loginBtn: { marginTop: 20, alignItems: 'center' },
  loginText: { color: Colors.text, fontSize: 16 },
  loginBold: { color: Colors.secondary, fontWeight: 'bold' },
});
