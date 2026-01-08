import { IconSymbol } from '@/components/ui/icon-symbol';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { isDark } = useAppTheme();

  const activeColor = isDark ? '#4F46E5' : '#5d55e7';
  const inactiveColor = isDark ? '#94A3B8' : '#9CA3AF';
  const borderColor = isDark ? '#1e293b' : '#9CA3AF';
  const bgColor = isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)';

  return (
    <Tabs
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
          borderTopWidth: 1, // Explicitly set to match other sides
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
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historia',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.btns, focused ? styles.activeTab : null]}>
              <IconSymbol style={[focused ? styles.iconSymbol : null]} size={20} name="history" color={focused ? "#FFF" : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
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
          title: 'Profil',
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
    borderRadius: 12, // Fixed from percentage
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    padding: 0,
  },
  homeButton: {
    width: 40,
    height: 40,
    borderRadius: 12, // Fixed from percentage
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
