import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebaseConfig';
import { useAppTheme } from '../context/ThemeContext';

export default function EditModal() {
  const { isDark } = useAppTheme();
  const { id, hours: initialHours, netIncome: initialNetIncome } = useLocalSearchParams();
  const [hours, setHours] = useState(initialHours as string);
  const [netIncome, setNetIncome] = useState(initialNetIncome as string);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleUpdate = async () => {
    if (!hours || !netIncome) {
      Alert.alert('Błąd', 'Proszę podać wszystkie dane.');
      return;
    }

    const h = parseFloat(hours.replace(',', '.'));
    const income = parseFloat(netIncome.replace(',', '.'));

    if (isNaN(h) || isNaN(income)) {
      Alert.alert('Błąd', 'Podane wartości muszą być liczbami.');
      return;
    }

    const total = h * income;

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Użytkownik nie jest zalogowany');

      await updateDoc(doc(db, `users/${user.uid}/entries`, id as string), {
        hours: h,
        netIncome: income,
        totalIncome: total,
      });

      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Błąd', 'Nie udało się zaktualizować danych.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Custom Header */}
      <View className={`flex-row items-center px-6 py-4 border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
        <TouchableOpacity onPress={() => router.back()} disabled={saving} className="mr-4 p-2 -ml-2">
          <IconSymbol name="chevron.left" size={28} color={isDark ? '#FFFFFF' : '#4F46E5'} />
        </TouchableOpacity>
        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Edytuj wpis</Text>
      </View>

      <View className="flex-1 justify-center p-6">
        <View className={`rounded-3xl p-6 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-xl'}`}>
          <Text className={`text-2xl font-extrabold mb-6 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>Wprowadź dane</Text>

          <View className="mb-5">
            <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>Liczba godzin</Text>
            <TextInput
              className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              keyboardType="numeric"
              value={hours}
              onChangeText={setHours}
              placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
            />
          </View>

          <View className="mb-6">
            <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>Stawka na rękę (zł/h)</Text>
            <TextInput
              className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              keyboardType="numeric"
              value={netIncome}
              onChangeText={setNetIncome}
              placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
            />
          </View>

          <TouchableOpacity
            className="bg-indigo-600 py-4 rounded-xl items-center"
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-base font-bold">Zapisz zmiany</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-3 py-3 items-center"
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text className="text-slate-400 font-semibold text-base">Anuluj</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
