import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/src/constants/Colors';
import { useAuth } from '@/src/context/AuthContext';

export default function EntryPoint() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (user) {
        router.replace('/tabs');
      } else {
        router.replace('/auth/login');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, isLoading, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>PetPulse 🐾</Text>
      <ActivityIndicator size="large" color={Colors.white} style={{ marginTop: 20 }} />
      <Text style={styles.loaderText}>Loading your pet's world...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { fontSize: 48, fontWeight: 'bold', color: Colors.white },
  loaderText: { color: Colors.white, marginTop: 15, fontSize: 16, opacity: 0.9 },
});
