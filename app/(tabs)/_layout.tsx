import { IconSymbol } from '@/components/ui/icon-symbol';
import { Tabs, useSegments, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, BackHandler, ToastAndroid } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../config/firebaseConfig';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function TabLayout() {
  const { isDark } = useAppTheme();
  const { t } = useLanguage();
  const [role, setRole] = useState<number | null>(null);

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let backPressCount = 0;
    let timeout: any = null;

    const onBackPress = () => {
      const isInTabs = segments[0] === '(tabs)';
      if (!isInTabs) return false;

      const activeTab = segments[1] || 'index';

      if (activeTab === 'index') {
        if (backPressCount === 0) {
          backPressCount++;
          ToastAndroid.show(
            t('exitAppToast') || 'Naciśnij ponownie, aby wyjść z aplikacji',
            ToastAndroid.SHORT
          );
          timeout = setTimeout(() => {
            backPressCount = 0;
          }, 2000);
          return true;
        } else {
          if (timeout) clearTimeout(timeout);
          BackHandler.exitApp();
          return true;
        }
      } else {
        router.replace('/(tabs)');
        return true;
      }
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      subscription.remove();
      if (timeout) clearTimeout(timeout);
    };
  }, [segments, router, t]);

  useEffect(() => {
    const loadRole = async () => {
      // Try cache first
      const cached = await AsyncStorage.getItem('userRole');
      if (cached) setRole(parseInt(cached));

      // Then fetch fresh from Firestore
      const user = auth.currentUser;
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (docSnap.exists()) {
            const r = docSnap.data().role || 3;
            setRole(r);
            await AsyncStorage.setItem('userRole', r.toString());
          }
        } catch (e) {
          console.error('Error loading role in tab layout:', e);
        }
      }
    };
    loadRole();
  }, []);

  const activeColor = isDark ? '#4F46E5' : '#5d55e7';
  const inactiveColor = isDark ? '#94A3B8' : '#9CA3AF';
  const borderColor = isDark ? '#1e293b' : '#9CA3AF';
  const bgColor = isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)';

  const isEmployer = role === 2;
  const isEmployee = role === 3 || role === 1;

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 25,
          left: 'auto',
          right: 'auto',
          elevation: 0,
          backgroundColor: bgColor,
          borderRadius: 30,
          height: 'auto',
          paddingTop: 10,
          paddingBottom: 10,
          paddingHorizontal: 10,
          marginHorizontal: '10%',
          marginVertical: 10,
          width: '80%',
          borderWidth: 1,
          borderTopWidth: 1,
          borderStyle: 'solid',
          borderColor: borderColor,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          ...Platform.select({
            ios: {
              shadowOpacity: 0.15,
              shadowRadius: 15,
            },
            android: {
              elevation: 2,
            }
          })
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
      }}>

      <Tabs.Screen
        name="work-entries"
        options={{
          title: t('tabWorkEntries'),
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.btns, focused ? styles.activeTab : null]}>
              <IconSymbol style={[focused ? styles.iconSymbol : null]} size={20} name="list.bullet" color={focused ? "#FFF" : color} />
            </View>
          ),
        }}
      />
      {/* Calculator tab - Employee only */}
      <Tabs.Screen
        name="calculator"
        options={{
          title: t('tabCalculator'),
          href: isEmployee ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.btns, focused ? styles.activeTab : null]}>
              <IconSymbol style={[focused ? styles.iconSymbol : null]} size={20} name="calculator" color={focused ? "#FFF" : color} />
            </View>
          ),
        }}
      />
      {/* Assignments tab - Employer only */}
      <Tabs.Screen
        name="assignments"
        options={{
          title: t('tabAssignments'),
          href: isEmployer ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.btns, focused ? styles.activeTab : null]}>
              <IconSymbol style={[focused ? styles.iconSymbol : null]} size={20} name="paperplane.fill" color={focused ? "#FFF" : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.btns, styles.homeButton, focused ? styles.activeHome : null]}>
              <IconSymbol style={[focused ? styles.iconSymbol : null]} size={20} name="house.fill" color={focused ? "#FFF" : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile'),
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.btns, focused ? styles.activeTab : null]}>
              <IconSymbol style={[focused ? styles.iconSymbol : null]} size={20} name="person.fill" color={focused ? "#FFF" : color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  btns: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    padding: 0,
  },
  homeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  activeHome: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  activeTab: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  iconSymbol: {
    transform: [{ scale: 1.1 }],
  },
});
