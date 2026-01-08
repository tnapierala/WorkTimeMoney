import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../config/firebaseConfig';
import { useAppTheme } from '../context/ThemeContext';

export default function LoginScreen() {
    const { isDark } = useAppTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Błąd', 'Proszę wypełnić wszystkie pola.');
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Błąd logowania', 'Nieprawidłowy e-mail lub hasło.');
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
                    <Text className={`text-4xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Zaloguj się</Text>
                    <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Witaj ponownie w WorkTimeMoney!</Text>
                </View>

                <View className="mb-6">
                    <View className="mb-5">
                        <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>E-mail</Text>
                        <TextInput
                            className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                            placeholder="Twój e-mail"
                            placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View className="mb-5">
                        <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>Hasło</Text>
                        <TextInput
                            className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                            placeholder="Twoje hasło"
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
                            <Text className="text-white text-lg font-bold">Zaloguj się</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View className="flex-row justify-center mt-4">
                    <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Nie masz jeszcze konta? </Text>
                    <Link href="/register" asChild>
                        <TouchableOpacity>
                            <Text className="text-indigo-600 text-base font-bold">Zarejestruj się</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
