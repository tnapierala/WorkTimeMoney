import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen'; // Dodano SplashScreen
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native'; // Dodano LogBox
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { auth } from '../config/firebaseConfig';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import '../global.css';
import { registerForPushNotificationsAsync } from '../config/notificationService';

// Zapobiegaj automatycznemu zniknięciu ekranu ładowania (aby ukryć renderowanie i skakanie ekranów)
SplashScreen.preventAutoHideAsync();
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NavigationRedirectorProps {
  initializing: boolean;
  user: any;
  hasSeenOnboarding: boolean | null;
  setHasSeenOnboarding: React.Dispatch<React.SetStateAction<boolean | null>>;
  setIsReady: React.Dispatch<React.SetStateAction<boolean>>;
}

function NavigationRedirector({
  initializing,
  user,
  hasSeenOnboarding,
  setHasSeenOnboarding,
  setIsReady,
}: NavigationRedirectorProps) {
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('hasSeenOnboarding');
        setHasSeenOnboarding(value === 'true');
      } catch (err) {
        console.error('[Layout] Error checking onboarding:', err);
        setHasSeenOnboarding(false);
      }
    };
    checkOnboarding();
  }, [pathname, setHasSeenOnboarding]);

  // Listen for push notification clicks and redirect accordingly
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const url = data?.url;
      if (url) {
        try {
          router.push(url as any);
        } catch (error) {
          console.error('[Notification Click] Router navigation error:', error);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  // Handle redirection
  useEffect(() => {
    if (initializing || hasSeenOnboarding === null) return;

    const performRedirect = () => {
      if (!hasSeenOnboarding) {
        // Force onboarding if they haven't seen it yet
        if (segments[0] !== 'onboarding') {
          router.replace('/onboarding');
        } else {
          setIsReady(true);
        }
      } else if (!user) {
        // User has seen onboarding, but is not logged in.
        // Only login and register screens are allowed.
        const isAuthScreen = segments[0] === 'login' || segments[0] === 'register';
        if (!isAuthScreen) {
          router.replace('/login');
        } else {
          setIsReady(true);
        }
      } else {
        // User is logged in and has seen onboarding.
        // If they are on any auth or onboarding screen, OR if they are at the root route, redirect to tabs.
        const isAuthOrOnboardingOrRoot = !segments[0] || segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'onboarding';
        if (isAuthOrOnboardingOrRoot) {
          router.replace('/(tabs)');
        } else {
          setIsReady(true);
        }
      }
    };

    const timeoutId = setTimeout(performRedirect, 0);
    return () => clearTimeout(timeoutId);
  }, [user, initializing, hasSeenOnboarding, segments, router, setIsReady]);

  return null;
}

function RootLayoutContent() {
  const { isDark } = useAppTheme();
  const { t } = useLanguage();
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false); // Stan odpowiedzialny za ukrycie Splash Screen

  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
      if (user) {
        registerForPushNotificationsAsync(user.uid);
      }
    });
    return unsubscribe;
  }, [initializing]);

  // Ukryj natywny Splash Screen dopiero kiedy routing jest ustawiony a dane załadowane
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  const showLoader = initializing || hasSeenOnboarding === null || !isReady;

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
        <Stack.Screen name="history-money" options={{ headerShown: false }} />
        <Stack.Screen name="work-history" options={{ headerShown: false }} />
        <Stack.Screen name="work-modal" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>

      <NavigationRedirector
        initializing={initializing}
        user={user}
        hasSeenOnboarding={hasSeenOnboarding}
        setHasSeenOnboarding={setHasSeenOnboarding}
        setIsReady={setIsReady}
      />

      {/* Dodatkowy spinner renderowany w trakcie ładowania (nawet jeśli zniknie Splash screen chwile wcześniej z powodów systemowych) */}
      {showLoader && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#0F172A' : '#F3F4F6', zIndex: 999 }}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      )}
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppThemeProvider>
          <ToastProvider>
            <RootLayoutContent />
          </ToastProvider>
        </AppThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}