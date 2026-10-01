import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { AuthProvider } from '@/src/context/AuthContext';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import '@/src/services/firebaseConfig';
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
} from '@/src/services/notificationClient';
import { registerForPushNotificationsAsync } from '@/src/utils/Notifications';

function ThemedStack() {
  const { colors } = useTheme();
  return (
    <>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/login"
          options={{
            title: 'Login',
            headerShown: true,
            headerBackVisible: true,
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="auth/register"
          options={{
            title: 'Register',
            headerShown: true,
            headerBackVisible: true,
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="auth/forgot-password"
          options={{
            title: 'Forgot Password',
            headerShown: true,
            headerBackVisible: true,
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen name="tabs" options={{ headerShown: false }} />
        <Stack.Screen
          name="notifications"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen name="pets/[petId]" options={{ headerShown: false }} />
        <Stack.Screen name="history/[petId]" options={{ headerShown: false }} />
        <Stack.Screen
          name="vet-visits"
          options={{
            title: 'Vet visits',
            headerShown: true,
            headerStyle: { backgroundColor: '#FF7A00' },
            headerTintColor: '#fff',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const notificationListener = useRef<ReturnType<typeof addNotificationReceivedListener> | null>(null);
  const responseListener = useRef<ReturnType<typeof addNotificationResponseReceivedListener> | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await registerForPushNotificationsAsync();
      } catch (e) {
        if (__DEV__) console.warn('Notification init error:', e);
      }
    };
    init();

    notificationListener.current = addNotificationReceivedListener(() => {});
    responseListener.current = addNotificationResponseReceivedListener(() => {
      router.push('/notifications');
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <ThemedStack />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
