import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '../components/ui/icon-symbol';
import { auth, db } from '../config/firebaseConfig';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { CustomDatePicker } from '../components/CustomDatePicker';

export default function EditWorkModal() {
  const { isDark } = useAppTheme();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const router = useRouter();

  const {
    id,
    address: initialAddress,
    description: initialDescription,
    hours: initialHours,
    dateString: initialDateString
  } = useLocalSearchParams();

  const [address, setAddress] = useState(initialAddress as string);
  const [description, setDescription] = useState(initialDescription as string);
  const [hours, setHours] = useState(initialHours as string);

  // Parse initial date string (DD.MM.YYYY) to Date object or fallback to today
  const parseDateString = (dateStr: string): Date => {
    try {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        const parsed = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error parsing date:', e);
    }
    return new Date();
  };

  const [dateText, setDateText] = useState(initialDateString as string);
  const [dateVal, setDateVal] = useState(parseDateString(initialDateString as string));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);



  const handleUpdate = async () => {
    if (!address || !description || !hours || !dateText) {
      showToast({ message: t('fillAllError'), type: 'error' });
      return;
    }

    const h = parseFloat(hours.replace(',', '.'));
    if (isNaN(h)) {
      showToast({ message: t('hoursNanError'), type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Użytkownik nie jest zalogowany');

      const selectedDate = parseDateString(dateText);

      await updateDoc(doc(db, `users/${user.uid}/work_entries`, id as string), {
        address: address,
        description: description,
        hours: h,
        dateString: dateText,
        date: selectedDate,
      });
      router.back();
    } catch (error) {
      console.error(error);
      showToast({ message: t('updateEntryError'), type: 'error' });
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
        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('editWorkEntryTitle')}</Text>
      </View>
      <View className="flex-1 justify-center p-6">
        <View className={`rounded-3xl p-6 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-xl'}`}>
          <Text className={`text-2xl font-extrabold mb-6 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('changeEntryDetails')}</Text>
          <View className="mb-4">
            <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>{t('addressLabel')}</Text>
            <TextInput
              className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              value={address}
              onChangeText={setAddress}
              placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
            />
          </View>
          <View className="mb-4">
            <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>{t('descLabel')}</Text>
            <TextInput
              className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
              multiline
              numberOfLines={3}
              style={{ height: 80 }}
            />
          </View>
          <View className="mb-4">
            <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>{t('hoursLabel')}</Text>
            <TextInput
              className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              keyboardType="numeric"
              value={hours}
              onChangeText={setHours}
              placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
            />
          </View>
          <View className="mb-6">
            <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>{t('dateLabel')}</Text>
            <View className="flex-row items-center">
              <TextInput
                className={`flex-1 border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                value={dateText}
                onChangeText={setDateText}
                placeholder="DD.MM.YYYY"
                placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
              />
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className={`ml-3 p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-300'}`}
              >
                <IconSymbol name="calendar" size={20} color="#4F46E5" />
              </TouchableOpacity>
            </View>
          </View>
          {/* Custom DatePicker Modal */}
          <CustomDatePicker
            visible={showDatePicker}
            value={dateVal}
            onClose={() => setShowDatePicker(false)}
            onChange={(selectedDate) => {
              setDateVal(selectedDate);
              setDateText(format(selectedDate, 'dd.MM.yyyy'));
            }}
          />
          <TouchableOpacity
            className="bg-indigo-600 py-4 rounded-xl items-center"
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-base font-bold">{t('saveChanges')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className="mt-3 py-3 items-center"
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text className="text-slate-400 font-semibold text-base">{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}