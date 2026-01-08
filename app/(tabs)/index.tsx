import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../config/firebaseConfig';
import { useAppTheme } from '../../context/ThemeContext';

export default function HomeScreen() {
  const { isDark } = useAppTheme();
  const [hours, setHours] = useState('');
  const [netIncome, setNetIncome] = useState('');
  const [taxRate, setTaxRate] = useState('23');
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState('');
  const [rateType, setRateType] = useState<'netto' | 'brutto'>('netto');

  // Fetch data from profile when screen is focused
  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.defaultRate) {
              setNetIncome(data.defaultRate.toString());
            }
            if (data.firstName) {
              setUserName(data.firstName);
            }
            if (data.rateType) {
              setRateType(data.rateType);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
      fetchData();
    }, [])
  );

  const handleSave = async () => {
    if (!hours || !netIncome) {
      Alert.alert('Błąd', `Proszę podać liczbę godzin i kwotę ${rateType === 'netto' ? 'na rękę' : 'przed podatkiem'}.`);
      return;
    }

    const h = parseFloat(hours.replace(',', '.'));
    const income = parseFloat(netIncome.replace(',', '.'));
    const tax = parseFloat(taxRate.replace(',', '.'));

    if (isNaN(h) || isNaN(income) || isNaN(tax)) {
      Alert.alert('Błąd', 'Podane wartości muszą być liczbami.');
      return;
    }

    const total = h * income * (rateType === 'brutto' ? (1 + tax / 100) : 1);

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Użytkownik nie jest zalogowany');

      const date = new Date();
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;

      await addDoc(collection(db, `users/${user.uid}/entries`), {
        hours: h,
        netIncome: income,
        totalIncome: total,
        date: serverTimestamp(),
        monthYear: monthYear,
      });

      Alert.alert('Sukces', `Zapisano! Twój dochód ${rateType === 'netto' ? 'na rękę' : 'przed podatkiem'} to: ${total.toFixed(2)} zł`);
      setHours('');
    } catch (error) {
      console.error(error);
      Alert.alert('Błąd', 'Nie udało się zapisać danych.');
    } finally {
      setSaving(false);
    }
  };

  // Helper for dynamic colors (still needed for some non-Tailwind things if any, 
  // but Tailwind handles most via dark: prefix)

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}
      contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 120 }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="mb-8">
        <Text className={`text-lg font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Cześć {userName}!
        </Text>
        <Text className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Oblicz swój dochód
        </Text>
      </View>

      {/* Main Card - Using custom class from global.css */}
      <View className={`card-premium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`}>
        <View className="mb-5">
          <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
            Liczba godzin
          </Text>
          <TextInput
            className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
            placeholder="np. 160"
            placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
            keyboardType="numeric"
            value={hours}
            onChangeText={setHours}
          />
        </View>

        <View className="mb-5">
          <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
            {rateType === 'netto' ? 'Stawka na rękę (zł/h)' : 'Stawka przed podatkiem (zł/h)'}
          </Text>
          <TextInput
            className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
            placeholder="np. 30.50"
            placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
            keyboardType="numeric"
            value={netIncome}
            onChangeText={setNetIncome}
          />
        </View>

        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-700'}`}>
              Rodzaj stawki
            </Text>
            <View className={`flex-row bg-${isDark ? 'slate-900' : 'gray-100'} rounded-xl p-1`}>
              <TouchableOpacity
                onPress={() => setRateType('netto')}
                className={`px-4 py-1.5 rounded-lg ${rateType === 'netto' ? 'bg-indigo-600' : ''}`}
              >
                <Text className={`text-xs font-bold ${rateType === 'netto' ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>Netto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setRateType('brutto')}
                className={`px-4 py-1.5 rounded-lg ${rateType === 'brutto' ? 'bg-indigo-600' : ''}`}
              >
                <Text className={`text-xs font-bold ${rateType === 'brutto' ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>Brutto</Text>
              </TouchableOpacity>
            </View>
          </View>

          {rateType === 'brutto' && (
            <View>
              <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                Podatek (%)
              </Text>
              <TextInput
                className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                placeholder="23"
                placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                keyboardType="numeric"
                value={taxRate}
                onChangeText={setTaxRate}
              />
            </View>
          )}
        </View>

        {/* Using custom button class from global.css */}
        <TouchableOpacity
          className="btn-primary mt-2 flex-row"
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="btn-primary-text">Oblicz i zapisz</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View className={`rounded-2xl mt-8 p-5 border ${isDark ? 'bg-indigo-900/10 border-indigo-900/20' : 'bg-indigo-50 border-indigo-100'}`}>
        <Text className="text-base font-bold text-indigo-600 mb-2">Jak to działa?</Text>
        <Text className={`text-sm leading-5 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Pomnożymy podane godziny przez stawkę i zapiszemy wynik w Twojej historii.
          Możesz go później przeglądać i edytować w zakładce Historia.
        </Text>
      </View>
    </ScrollView>
  );
}
