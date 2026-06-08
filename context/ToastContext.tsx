import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { IconSymbol } from '../components/ui/icon-symbol';
import { useAppTheme } from './ThemeContext';
type ToastType = 'success' | 'error' | 'info';
interface ToastOptions {
    message: string;
    type?: ToastType;
    duration?: number;
}
interface ToastContextType {
    showToast: (options: ToastOptions) => void;
}
const ToastContext = createContext<ToastContextType | undefined>(undefined);
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const { isDark } = useAppTheme();
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState<ToastType>('success');
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const timeoutRef = useRef<any>(null);

    const showToast = useCallback(({ message, type = 'success', duration = 3000 }: ToastOptions) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setMessage(message);
        setType(type);
        setVisible(true);

        // Slide and fade in from the top
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: Platform.OS === 'ios' ? 60 : 40,
                duration: 350,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto dismiss
        timeoutRef.current = setTimeout(() => {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -100,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setVisible(false);
            });
        }, duration);
    }, [slideAnim, opacityAnim]);

    // Styling config based on toast type
    const getToastConfig = () => {
        switch (type) {
            case 'success':
                return {
                    bg: isDark ? 'bg-slate-800 border-l-4 border-emerald-500 shadow-2xl shadow-black/40' : 'bg-white border-l-4 border-emerald-500 shadow-xl shadow-gray-400/30',
                    iconColor: '#10B981',
                    iconName: 'checkmark.circle.fill',
                };
            case 'error':
                return {
                    bg: isDark ? 'bg-slate-800 border-l-4 border-rose-500 shadow-2xl shadow-black/40' : 'bg-white border-l-4 border-rose-500 shadow-xl shadow-gray-400/30',
                    iconColor: '#EF4444',
                    iconName: 'xmark.circle.fill',
                };
            case 'info':
            default:
                return {
                    bg: isDark ? 'bg-slate-800 border-l-4 border-indigo-500 shadow-2xl shadow-black/40' : 'bg-white border-l-4 border-indigo-500 shadow-xl shadow-gray-400/30',
                    iconColor: '#4F46E5',
                    iconName: 'info.circle',
                };
        }
    };

    const config = getToastConfig();

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {visible && (
                <Animated.View
                    style={[
                        styles.toastContainer,
                        {
                            transform: [{ translateY: slideAnim }],
                            opacity: opacityAnim,
                        },
                    ]}
                >
                    <View className={`flex-row items-center px-4 py-3.5 rounded-2xl border border-gray-300/10 ${config.bg}`}>
                        <IconSymbol name={config.iconName} size={20} color={config.iconColor} />
                        <Text className={`ml-3 mr-2 text-sm font-semibold flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {message}
                        </Text>
                    </View>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        top: 0,
        left: '5%',
        right: '5%',
        width: '90%',
        zIndex: 9999,
    },
});