import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { auth } from '../config/firebaseConfig';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '../context/ThemeContext';
import '../global.css';

// unstable_settings removed

function RootLayoutContent() {
  const { isDark } = useAppTheme();
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  // Check onboarding status
  useEffect(() => {
    const checkOnboarding = async () => {
      const value = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(value === 'true');
    };
    checkOnboarding();
  }, []);

  // Handle user state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, [initializing]);

  // Handle redirection
  useEffect(() => {
    if (initializing || hasSeenOnboarding === null) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'onboarding';

    if (!hasSeenOnboarding && segments[0] !== 'onboarding' && !inAuthGroup) {
      router.replace('/onboarding');
    } else if (hasSeenOnboarding && !user) {
      if (!inAuthGroup) {
        router.replace('/login');
      }
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, initializing, hasSeenOnboarding, segments]);

  if (initializing || hasSeenOnboarding === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#0F172A' : '#F3F4F6' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          },
          headerTintColor: isDark ? '#FFFFFF' : '#0F172A',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <RootLayoutContent />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
