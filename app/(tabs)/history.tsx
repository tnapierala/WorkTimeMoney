import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../config/firebaseConfig';
import { useAppTheme } from '../../context/ThemeContext';

interface Entry {
    id: string;
    hours: number;
    netIncome: number;
    totalIncome: number;
    monthYear: string;
    date: any;
}

export default function HistoryScreen() {
    const { isDark } = useAppTheme();
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
            collection(db, `users/${user.uid}/entries`),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const entryList: Entry[] = [];
            snapshot.forEach((doc) => {
                entryList.push({ id: doc.id, ...doc.data() } as Entry);
            });
            setEntries(entryList);
            setLoading(false);
        }, (error) => {
            console.error(error);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const handleDelete = (id: string) => {
        Alert.alert(
            'Usuń wpis',
            'Czy na pewno chcesz usunąć ten rekord?',
            [
                { text: 'Anuluj', style: 'cancel' },
                {
                    text: 'Usuń',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const user = auth.currentUser;
                            if (user) {
                                await deleteDoc(doc(db, `users/${user.uid}/entries`, id));
                            }
                        } catch (error) {
                            Alert.alert('Błąd', 'Nie udało się usunąć wpisu.');
                        }
                    }
                }
            ]
        );
    };

    const handleEdit = (entry: Entry) => {
        router.push({
            pathname: '/modal',
            params: {
                id: entry.id,
                hours: entry.hours.toString(),
                netIncome: entry.netIncome.toString()
            }
        });
    };

    const renderItem = ({ item }: { item: Entry }) => (
        <View className={`rounded-2xl p-4 mb-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'}`}>
            <View className={`flex-row justify-between items-center mb-3 border-b pb-2 ${isDark ? 'border-slate-700' : 'border-gray-50'}`}>
                <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-700'}`}>{item.monthYear}</Text>
                <View className="flex-row">
                    <TouchableOpacity onPress={() => handleEdit(item)} className="ml-3 p-1">
                        <IconSymbol name="pencil" size={20} color="#4F46E5" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} className="ml-3 p-1">
                        <IconSymbol name="trash.fill" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <View className="flex-row justify-between">
                <View className="items-start">
                    <Text className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Godziny</Text>
                    <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.hours}h</Text>
                </View>
                <View className="items-start">
                    <Text className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Stawka</Text>
                    <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.netIncome} zł</Text>
                </View>
                <View className="items-start">
                    <Text className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Suma</Text>
                    <Text className="text-sm font-bold text-indigo-600">{item.totalIncome.toFixed(2)} zł</Text>
                </View>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View className={`flex-1 justify-center items-center ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <View className={`pt-14 px-6 pb-5 ${isDark ? 'bg-slate-800 border-b border-slate-700' : 'bg-white shadow-sm'}`}>
                <Text className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>Twoja Historia</Text>
                <Text className={`text-base mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{entries.length} zapisanych rekordów</Text>
            </View>

            <FlatList
                data={entries}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ListEmptyComponent={
                    <View className="mt-24 items-center px-10">
                        <Text className="text-center text-slate-400 text-base">Brak wpisów. Dodaj coś na ekranie głównym!</Text>
                    </View>
                }
            />
        </View>
    );
}
