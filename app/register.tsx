import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { useAppTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

export default function RegisterScreen() {
    const { isDark } = useAppTheme();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'3' | '2'>('3'); // 3 = Pracownik, 2 = Pracodawca
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async () => {
        if (!email || !password || !confirmPassword) {
            showToast({ message: t('fillAllFields'), type: 'error' });
            return;
        }
        if (password !== confirmPassword) {
            showToast({ message: t('passwordsDontMatch'), type: 'error' });
            return;
        }
        if (password.length < 6) {
            showToast({ message: t('passwordTooShort'), type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user document in Firestore with role
            await setDoc(doc(db, 'users', user.uid), {
                email: email,
                role: parseInt(role),
                firstName: '',
                lastName: '',
                phone: '',
                defaultRate: null,
                rateType: 'netto',
                employerId: null,
                employerName: null,
                createdAt: new Date(),
            });
        } catch (error: any) {
            setLoading(false);
            if (error.code === 'auth/email-already-in-use') {
                showToast({ message: t('emailAlreadyInUse'), type: 'error' });
            } else {
                showToast({ message: t('registerError'), type: 'error' });
            }
            console.error(error);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}
        >
            <StatusBar style={isDark ? "light" : "dark"} />
            <View className="flex-1 p-6 justify-center">
                <View className="mb-8">
                    <Text className={`text-4xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('registerHeader')}</Text>
                    <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('registerSubheader')}</Text>
                </View>
                <View className="mb-6">
                    <View className="mb-4">
                        <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>{t('accountTypeLabel')}</Text>
                        <View className={`flex-row bg-${isDark ? 'slate-800' : 'gray-100'} border ${isDark ? 'border-slate-700' : 'border-gray-200'} rounded-2xl p-1`}>
                            <TouchableOpacity
                                onPress={() => setRole('3')}
                                className={`flex-1 py-3.5 rounded-xl items-center ${role === '3' ? 'bg-indigo-600' : ''}`}
                            >
                                <Text className={`text-sm font-bold ${role === '3' ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('roleEmployee')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setRole('2')}
                                className={`flex-1 py-3.5 rounded-xl items-center ${role === '2' ? 'bg-indigo-600' : ''}`}
                            >
                                <Text className={`text-sm font-bold ${role === '2' ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('roleEmployer')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View className="mb-4">
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
                    <View className="mb-4">
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
                    <View className="mb-6">
                        <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>{t('confirmPasswordLabel')}</Text>
                        <TextInput
                            className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                            placeholder={t('confirmPasswordPlaceholder')}
                            placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />
                    </View>
                    <TouchableOpacity
                        className="bg-indigo-600 py-4 rounded-xl items-center shadow-lg shadow-indigo-600/40"
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="text-white text-lg font-bold">{t('registerBtn')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
                <View className="flex-row justify-center mt-4">
                    <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('alreadyHaveAccount')} </Text>
                    <Link href="/login" asChild>
                        <TouchableOpacity>
                            <Text className="text-indigo-600 text-base font-bold">{t('loginNow')}</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}