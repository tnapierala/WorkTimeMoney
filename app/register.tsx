import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../config/firebaseConfig';
import { useAppTheme } from '../context/ThemeContext';

export default function RegisterScreen() {
    const { isDark } = useAppTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async () => {
        if (!email || !password || !confirmPassword) {
            Alert.alert('Błąd', 'Proszę wypełnić wszystkie pola.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Błąd', 'Hasła nie są identyczne.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Błąd', 'Hasło musi mieć co najmniej 6 znaków.');
            return;
        }

        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            Alert.alert('Sukces', 'Konto zostało utworzone!', [
                { text: 'OK', onPress: () => router.replace('/(tabs)') }
            ]);
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                Alert.alert('Błąd', 'Ten adres e-mail jest już zajęty.');
            } else {
                Alert.alert('Błąd rejestracji', 'Spróbuj ponownie później.');
            }
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
                <View className="mb-8">
                    <Text className={`text-4xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Stwórz konto</Text>
                    <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Dołącz do WorkTimeMoney i miej kontrolę!</Text>
                </View>

                <View className="mb-6">
                    <View className="mb-4">
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

                    <View className="mb-4">
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

                    <View className="mb-6">
                        <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>Powtórz hasło</Text>
                        <TextInput
                            className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                            placeholder="Powtórz hasło"
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
                            <Text className="text-white text-lg font-bold">Zarejestruj się</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View className="flex-row justify-center mt-4">
                    <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Masz już konto? </Text>
                    <Link href="/login" asChild>
                        <TouchableOpacity>
                            <Text className="text-indigo-600 text-base font-bold">Zaloguj się</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
