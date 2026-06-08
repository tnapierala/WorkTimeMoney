import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../config/firebaseConfig';
import { useAppTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

export default function LoginScreen() {
    const { isDark } = useAppTheme();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            showToast({ message: t('fillAllFields'), type: 'error' });
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace('/(tabs)');
        } catch (error: any) {
            showToast({ message: t('loginError'), type: 'error' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}
        >
            <StatusBar style={isDark ? "light" : "dark"} />
            <View className="flex-1 p-6 justify-center">
                <View className="mb-10">
                    <Text className={`text-4xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('loginHeader')}</Text>
                    <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('loginSubheader')}</Text>
                </View>

                <View className="mb-6">
                    <View className="mb-5">
                        <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>{t('emailLabel')}</Text>
                        <TextInput
                            className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                            placeholder={t('emailPlaceholder')}
                            placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View className="mb-5">
                        <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>{t('passwordLabel')}</Text>
                        <TextInput
                            className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                            placeholder={t('passwordPlaceholder')}
                            placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        className="bg-indigo-600 py-4 rounded-xl items-center mt-2 shadow-lg shadow-indigo-600/40"
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="text-white text-lg font-bold">{t('loginBtn')}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View className="flex-row justify-center mt-4">
                    <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('noAccount')} </Text>
                    <Link href="/register" asChild>
                        <TouchableOpacity>
                            <Text className="text-indigo-600 text-base font-bold">{t('registerNow')}</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}