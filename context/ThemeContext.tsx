import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const deviceColorScheme = useDeviceColorScheme();

    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = await AsyncStorage.getItem('userThemeMode');
            if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
                setThemeModeState(savedTheme);
            }
        };
        loadTheme();
    }, []);

    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        await AsyncStorage.setItem('userThemeMode', mode);
    };

    const isDark = themeMode === 'system'
        ? deviceColorScheme === 'dark'
        : themeMode === 'dark';

    useEffect(() => {
        const themeColor = isDark ? '#0F172A' : '#F3F4F6';
        SystemUI.setBackgroundColorAsync(themeColor);
        if (Platform.OS === 'android') {
            NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
        }
    }, [isDark]);

    return (
        <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useAppTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useAppTheme must be used within a ThemeProvider');
    }
    return context;
}
