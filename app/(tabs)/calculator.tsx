import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../config/firebaseConfig';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useToast } from '../../context/ToastContext';

export default function CalculatorScreen() {
    const { isDark } = useAppTheme();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const router = useRouter();
    const [hours, setHours] = useState('');
    const [netIncome, setNetIncome] = useState('');
    const [taxRate, setTaxRate] = useState('39');
    const [saving, setSaving] = useState(false);
    const [rateType, setRateType] = useState<'netto' | 'brutto'>('netto');
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const loadDefaults = async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
                const docSnap = await getDoc(doc(db, 'users', user.uid));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.defaultRate) setNetIncome(data.defaultRate.toString());
                    if (data.firstName) setUserName(data.firstName);
                    if (data.rateType) setRateType(data.rateType);
                }
            } catch (e) {
                console.error('Error loading defaults:', e);
            }
        };
        loadDefaults();
    }, []);

    const handleSave = async () => {
        if (!hours || !netIncome) {
            showToast({ message: t('inputError'), type: 'error' });
            return;
        }

        const h = parseFloat(hours.replace(',', '.'));
        const income = parseFloat(netIncome.replace(',', '.'));
        const tax = parseFloat(taxRate.replace(',', '.'));

        if (isNaN(h) || isNaN(income) || isNaN(tax)) {
            showToast({ message: t('nanError'), type: 'error' });
            return;
        }

        const total = (h * income) - ((h * income) * (rateType === 'brutto' ? (tax / 100) : 0));

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

            showToast({ message: `${t('saveSuccess')} ${total.toFixed(2)} zł`, type: 'success' });
            setHours('');
        } catch (error) {
            console.error(error);
            showToast({ message: t('saveError'), type: 'error' });
        } finally {
            setSaving(false);
        }
    };
    return (
        <ScrollView
            className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}
            contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 120 }}
        >
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* Header */}
            <View className="mb-8 flex-row justify-between items-end">
                <View className="flex-1 mr-4">
                    <Text className={`text-lg font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t('hello')} {userName}!
                    </Text>
                    <Text className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {t('calculateIncome')}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => router.push('/history-money')}
                    className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'}`}
                    style={{ marginBottom: 2 }}
                >
                    <IconSymbol name="history" size={24} color="#4F46E5" />
                </TouchableOpacity>
            </View>

            {/* Main Card */}
            <View className={`card-premium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`}>
                <View className="mb-5">
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                        {t('hours')}
                    </Text>
                    <TextInput
                        className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                        placeholder={t('hoursPlaceholder')}
                        placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                        keyboardType="numeric"
                        value={hours}
                        onChangeText={setHours}
                    />
                </View>

                <View className="mb-5">
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                        {rateType === 'netto' ? t('rateNet') : t('rateGross')}
                    </Text>
                    <TextInput
                        className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                        placeholder={t('ratePlaceholder')}
                        placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                        keyboardType="numeric"
                        value={netIncome}
                        onChangeText={setNetIncome}
                    />
                </View>

                <View className="mb-6">
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-700'}`}>
                            {t('rateType')}
                        </Text>
                        <View className={`flex-row bg-${isDark ? 'slate-900' : 'gray-100'} rounded-xl p-1`}>
                            <TouchableOpacity
                                onPress={() => setRateType('netto')}
                                className={`px-4 py-1.5 rounded-lg ${rateType === 'netto' ? 'bg-indigo-600' : ''}`}
                            >
                                <Text className={`text-xs font-bold ${rateType === 'netto' ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('netto')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setRateType('brutto')}
                                className={`px-4 py-1.5 rounded-lg ${rateType === 'brutto' ? 'bg-indigo-600' : ''}`}
                            >
                                <Text className={`text-xs font-bold ${rateType === 'brutto' ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('brutto')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {rateType === 'brutto' && (
                        <View>
                            <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                                {t('tax')}
                            </Text>
                            <TextInput
                                className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                placeholder={t('taxPlaceholder')}
                                placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                                keyboardType="numeric"
                                value={taxRate}
                                onChangeText={setTaxRate}
                            />
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    className="btn-primary mt-2 flex-row"
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text className="btn-primary-text">{t('calculateAndSave')}</Text>
                    )}
                </TouchableOpacity>

            </View>

            {/* Info Section */}
            <View className={`rounded-2xl mt-8 p-5 border ${isDark ? 'bg-indigo-900/10 border-indigo-900/20' : 'bg-indigo-50 border-indigo-100'}`}>
                <Text className="text-base font-bold text-indigo-600 mb-2">{t('howItWorks')}</Text>
                <Text className={`text-sm leading-5 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    {t('howItWorksDesc')}
                </Text>
            </View>
        </ScrollView>
    );
}