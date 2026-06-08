import { IconSymbol } from '@/components/ui/icon-symbol';
import { useToast } from '../../context/ToastContext';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, getDate, getMonth, getYear, isSameDay, isSameMonth, setMonth, setYear, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Clipboard, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../config/firebaseConfig';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';

interface ProfileData {
    firstName: string;
    lastName: string;
    phone: string;
    defaultRate: number | null;
    avatarUrl?: string;
    rateType?: 'netto' | 'brutto';
    birthDate?: string;
    role?: number;
    employerId?: string | null;
    employerName?: string | null;
    employerCompanyName?: string | null;
    companyName?: string;
    companyPhone?: string;
    companyDetails?: string;
}

interface RateHistory {
    rate: number;
    date: any;
}

export default function ProfileScreen() {
    const { themeMode, setThemeMode, isDark } = useAppTheme();
    const { language, setLanguage, t } = useLanguage();
    const { showToast } = useToast();
    const [profile, setProfile] = useState<ProfileData>({
        firstName: '',
        lastName: '',
        phone: '',
        defaultRate: null,
        rateType: 'netto',
        birthDate: '',
    });
    const [loading, setLoading] = useState(true);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [companyInfoModalVisible, setCompanyInfoModalVisible] = useState(false);
    const [selectedInviteForInfo, setSelectedInviteForInfo] = useState<any>(null);
    const [editingField, setEditingField] = useState<keyof ProfileData | null>(null);
    const [editValue, setEditValue] = useState('');
    const [rateHistory, setRateHistory] = useState<RateHistory[]>([]);
    const [uploading, setUploading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pickerDate, setPickerDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

    const fetchProfile = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const docSnap = await getDoc(doc(db, 'users', user.uid));
            if (docSnap.exists()) {
                setProfile(docSnap.data() as ProfileData);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRateHistory = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const q = query(
                collection(db, `users/${user.uid}/rateHistory`),
                orderBy('date', 'desc'),
                limit(10)
            );
            const querySnapshot = await getDocs(q);
            const history: RateHistory[] = [];
            querySnapshot.forEach((doc) => {
                history.push(doc.data() as RateHistory);
            });
            setRateHistory(history);
        } catch (error) {
            console.error(error);
        }
    };

    const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);

    useFocusEffect(
        useCallback(() => {
            fetchProfile();

            let unsubInvites: (() => void) | undefined;
            const user = auth.currentUser;
            if (user && user.email) {
                const emailClean = user.email.toLowerCase().trim();
                const q = query(
                    collection(db, 'invitations'),
                    where('employeeEmail', '==', emailClean),
                    where('status', '==', 'pending')
                );
                unsubInvites = onSnapshot(q, (snap) => {
                    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setPendingInvitations(list);
                }, (error) => {
                    console.error('Error listening to employee invitations:', error);
                });
            }

            return () => {
                if (unsubInvites) unsubInvites();
            };
        }, [])
    );

    const handleAcceptInvitation = async (invite: any) => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            // 1. Update invitation document in Firestore
            await updateDoc(doc(db, 'invitations', invite.id), {
                status: 'accepted',
                employeeUid: user.uid
            });

            // 2. Update employee's user document in Firestore
            await updateDoc(doc(db, 'users', user.uid), {
                employerId: invite.employerId,
                employerName: invite.employerName,
                employerCompanyName: invite.employerCompanyName || ''
            });

            setProfile(prev => ({
                ...prev,
                employerId: invite.employerId,
                employerName: invite.employerName,
                employerCompanyName: invite.employerCompanyName || ''
            }));

            setPendingInvitations(prev => prev.filter(inv => inv.id !== invite.id));
            showToast({ message: `Zaakceptowano zaproszenie! Jesteś teraz przypisany do pracodawcy: ${invite.employerCompanyName || invite.employerName}`, type: 'success' });
        } catch (error) {
            console.error(error);
            showToast({ message: 'Nie udało się zaakceptować zaproszenia.', type: 'error' });
        }
    };

    const handleDeclineInvitation = async (inviteId: string) => {
        try {
            await updateDoc(doc(db, 'invitations', inviteId), {
                status: 'declined'
            });
            setPendingInvitations(prev => prev.filter(inv => inv.id !== inviteId));
            showToast({ message: 'Zaproszenie zostało odrzucone.', type: 'success' });
        } catch (error) {
            console.error(error);
            showToast({ message: 'Nie udało się odrzucić zaproszenia.', type: 'error' });
        }
    };

    const handleDisconnectEmployer = async () => {
        const user = auth.currentUser;
        if (!user || !user.email) return;
        const emailClean = user.email.toLowerCase().trim();
        Alert.alert(
            'Rozłącz się',
            'Czy na pewno chcesz się odpięć od obecnego pracodawcy?',
            [
                { text: 'Anuluj', style: 'cancel' },
                {
                    text: 'Rozłącz',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const employerId = profile.employerId;

                            // 1. Update user profile in Firestore
                            await updateDoc(doc(db, 'users', user.uid), {
                                employerId: null,
                                employerName: null
                            });

                            // 2. Delete accepted invitation in Firestore
                            const q = query(
                                collection(db, 'invitations'),
                                where('employerId', '==', employerId),
                                where('employeeEmail', '==', emailClean),
                                where('status', '==', 'accepted')
                            );
                            const snap = await getDocs(q);
                            if (!snap.empty) {
                                await deleteDoc(doc(db, 'invitations', snap.docs[0].id));
                            }

                            setProfile(prev => ({
                                ...prev,
                                employerId: null,
                                employerName: null
                            }));

                            showToast({ message: 'Zostałeś odpięty od pracodawcy.', type: 'success' });
                        } catch (error) {
                            console.error(error);

                            showToast({ message: 'Nie udało się rozłączyć z pracodawcą.', type: 'error' });
                        }
                    }
                }
            ]
        );
    };

    const openEdit = (field: keyof ProfileData) => {
        setEditingField(field);
        setEditValue(profile[field]?.toString() || '');
        setEditModalVisible(true);
    };

    const saveEdit = async () => {
        const user = auth.currentUser;
        if (!user || !editingField) return;

        try {
            let finalValue: any = editValue;
            if (editingField === 'defaultRate') {
                const parsed = parseFloat(editValue.replace(',', '.'));
                if (isNaN(parsed)) {
                    showToast({ message: 'Podaj poprawną liczbę', type: 'error' });
                    return;
                }
                finalValue = parsed;
                if (finalValue !== profile.defaultRate) {
                    await addDoc(collection(db, `users/${user.uid}/rateHistory`), {
                        rate: finalValue,
                        date: serverTimestamp(),
                    });
                }
            }
            const updatedProfile = { ...profile, [editingField]: finalValue };
            await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
            setProfile(updatedProfile);
            setEditModalVisible(false);
        } catch (error) {
            showToast({ message: 'Nie udało się zapisać zmian', type: 'error' });
        }
    };
    const copyToClipboard = (text: string) => {
        Clipboard.setString(text);
        showToast({ message: 'Identyfikator został skopiowany do schowka', type: 'info' });
    };
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.2,
            base64: true,
        });
        if (!result.canceled && result.assets[0].base64) {
            saveBase64Image(result.assets[0].base64);
        }
    };

    const saveBase64Image = async (base64String: string) => {
        const user = auth.currentUser;
        if (!user) return;
        setUploading(true);
        try {
            const avatarUrl = `data:image/jpeg;base64,${base64String}`;
            await setDoc(doc(db, 'users', user.uid), { avatarUrl }, { merge: true });
            setProfile(prev => ({ ...prev, avatarUrl }));
            showToast({ message: 'Awatar został zaktualizowany', type: 'success' });
        } catch (error: any) {
            console.error(error);
            showToast({ message: 'Nie udało się zapisać zdjęcia', type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (selectedDate) {
            setPickerDate(selectedDate);
        }
    };

    const confirmCustomDate = () => {
        if (pickerDate) {
            setEditValue(format(pickerDate, 'dd.MM.yyyy'));
        }
        setShowDatePicker(false);
    };

    const openCustomDatePicker = () => {
        if (editValue) {
            try {
                const parts = editValue.split('.');
                if (parts.length === 3) {
                    const parsed = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                    if (!isNaN(parsed.getTime())) {
                        setPickerDate(parsed);
                    }
                }
            } catch (e) { }
        }
        setViewMode('days');
        setShowDatePicker(true);
    };

    const oldDateChange = async (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            const day = selectedDate.getDate().toString().padStart(2, '0');
            const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
            const year = selectedDate.getFullYear();
            const dateString = `${day}.${month}.${year}`;
            // Update the edit value in the modal instead of direct save
            setEditValue(dateString);
        }
    };

    if (loading) {
        return (
            <View className={`flex-1 items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    const primaryIconColor = isDark ? '#94A3B8' : '#9CA3AF';
    const secondaryIconColor = isDark ? '#4F46E5' : '#5d55e7';
    const thirdIconColor = isDark ? '#c6cbd2' : '#fff';

    return (
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <SafeAreaView className="flex-1">
                <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
                    {/* Pending Invitations Section (At the beginning!) */}
                    {pendingInvitations.length > 0 && (
                        <View className="mb-6">
                            <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-amber-400' : 'text-amber-600'} mb-3`}>
                                {t('pendingInvites')} ({pendingInvitations.length})
                            </Text>
                            {pendingInvitations.map(invite => (
                                <View
                                    key={invite.id}
                                    className={`rounded-3xl p-5 border ${isDark ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50 border-amber-100'
                                        } mb-3 shadow-sm`}
                                >
                                    <View className="flex-row justify-between items-start mb-2">
                                        <View className="flex-1 mr-2">
                                            <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                                {t('invitationFrom')} {invite.employerCompanyName || invite.employerName}
                                            </Text>
                                            <Text className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {t('senderLabel')}: {invite.employerName} ({invite.employerEmail})
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedInviteForInfo(invite);
                                                setCompanyInfoModalVisible(true);
                                            }}
                                            className="p-2.5 bg-amber-500/10 dark:bg-amber-400/10 rounded-xl"
                                        >
                                            <IconSymbol name="info.circle" size={18} color={isDark ? '#F59E0B' : '#D97706'} />
                                        </TouchableOpacity>
                                    </View>
                                    <View className="flex-row mt-2">
                                        <TouchableOpacity
                                            onPress={() => handleDeclineInvitation(invite.id)}
                                            className={`flex-1 py-3 rounded-xl border mr-2 items-center justify-center ${isDark ? 'border-red-900/60 bg-red-950/10' : 'border-red-200 bg-red-50/50'
                                                }`}
                                        >
                                            <Text className="text-red-500 font-bold text-sm">{t('decline')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleAcceptInvitation(invite)}
                                            className="flex-1 py-3 rounded-xl bg-indigo-600 items-center justify-center ml-2"
                                        >
                                            <Text className="text-white font-bold text-sm">{t('accept')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                    {/* Avatar Section */}
                    <View className="items-center my-6">
                        <View className="relative">
                            <View className={`w-28 h-28 rounded-full items-center justify-center border-2 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-400' : 'bg-white border-gray-300 shadow-sm'}`}>
                                {uploading ? (
                                    <ActivityIndicator color="#4F46E5" />
                                ) : profile.avatarUrl ? (
                                    <Image
                                        key={profile.avatarUrl}
                                        source={profile.avatarUrl}
                                        style={{ width: '100%', height: '100%' }}
                                        contentFit="cover"
                                        transition={200}
                                        onError={(e) => console.error("Avatar Load Error:", e)}
                                    />
                                ) : (
                                    <IconSymbol name="person.fill" size={60} color={primaryIconColor} />
                                )}
                            </View>
                            <TouchableOpacity
                                className="absolute -bottom-2 -right-2 w-10 h-10 p-1 bg-indigo-600 rounded-xl items-center justify-center border-1 border-slate-700 shadow-sm"
                                onPress={pickImage}
                                disabled={uploading}
                            >
                                <IconSymbol name="pencil" size={18} color={thirdIconColor} />
                            </TouchableOpacity>
                        </View>
                        <Text className={`text-2xl font-bold mt-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{profile.firstName} {profile.lastName}</Text>
                        <Text className={`text-sm mt-1 ${isDark ? 'text-indigo-500' : 'text-indigo-600'}`}>{auth.currentUser?.email}</Text>
                        {(() => {
                            const r = profile.role || 3;
                            let badgeText = t('roleEmployee');
                            let badgeBg = 'bg-indigo-600';
                            if (r === 1) {
                                badgeText = t('roleDev');
                                badgeBg = 'bg-purple-600';
                            } else if (r === 2) {
                                badgeText = t('roleEmployer');
                                badgeBg = 'bg-emerald-600';
                            }
                            return (
                                <View className={`px-4 py-1 rounded-full ${badgeBg} mt-2`}>
                                    <Text className="text-white text-[10px] font-extrabold uppercase tracking-wider">{badgeText}</Text>
                                </View>
                            );
                        })()}
                    </View>
                    {/* Employer Link Details */}
                    {profile.role === 3 && profile.employerId && (
                        <View className="mb-6">
                            <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-100' : 'text-gray-600'} mb-3`}>
                                {t('yourEmployer')}
                            </Text>
                            <View className={`rounded-3xl p-5 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'}`}>
                                <View className="flex-row justify-between items-center mb-4">
                                    <View className="flex-1 mr-3">
                                        {profile.employerCompanyName ? (
                                            <>
                                                <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                                    {profile.employerCompanyName}
                                                </Text>
                                                <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'} mt-0.5`}>
                                                    {t('roleEmployer')}: {profile.employerName}
                                                </Text>
                                            </>
                                        ) : (
                                            <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                                {profile.employerName}
                                            </Text>
                                        )}
                                        <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'} mt-1`}>
                                            {t('statusConnected')}
                                        </Text>
                                    </View>
                                    <View className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/20 items-center justify-center">
                                        <IconSymbol name="person.fill" size={20} color="#10B981" />
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={handleDisconnectEmployer}
                                    className={`py-3.5 rounded-xl border items-center justify-center ${isDark ? 'border-red-900/60 bg-red-950/10' : 'border-red-200 bg-red-50/50'
                                        }`}
                                >
                                    <Text className="text-red-500 font-bold text-sm">{t('disconnectFromEmployer')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    {/* Profile Section */}
                    <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-100' : 'text-gray-600'} mb-3 mt-6`}>{t('yourProfile')}</Text>
                    <View className={`rounded-3xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'}`}>
                        <View className="flex-row justify-between items-center px-4 py-4">
                            <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('uid')}</Text>
                            <View className="flex-row items-center flex-1 justify-end ml-4">
                                <Text className={`text-base mr-3 font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`} numberOfLines={1}>{auth.currentUser?.uid}</Text>
                                <TouchableOpacity onPress={() => copyToClipboard(auth.currentUser?.uid || '')}>
                                    <IconSymbol name="copy" size={18} color={secondaryIconColor} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View className={`h-[1px] mx-4 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`} />
                        <ProfileItem
                            label={t('firstName')}
                            value={profile.firstName || t('notProvided')}
                            onPress={() => openEdit('firstName')}
                            isDark={isDark}
                        />
                        <View className={`h-[1px] mx-4 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`} />
                        <ProfileItem
                            label={t('lastName')}
                            value={profile.lastName || t('notProvided')}
                            onPress={() => openEdit('lastName')}
                            isDark={isDark}
                        />
                        <View className={`h-[1px] mx-4 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`} />
                        <ProfileItem
                            label={t('birthDate')}
                            value={profile.birthDate || t('notProvided')}
                            onPress={() => openEdit('birthDate')}
                            isDark={isDark}
                        />
                        <View className={`h-[1px] mx-4 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`} />
                        <ProfileItem
                            label={t('phone')}
                            value={profile.phone || t('notProvided')}
                            onPress={() => openEdit('phone')}
                            isDark={isDark}
                        />
                    </View>
                    {/* Company Info Section (For Employer only) */}
                    {profile.role === 2 && (
                        <>
                            <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-100' : 'text-gray-600'} mb-3 mt-6`}>{t('companyInfo')}</Text>
                            <View className={`rounded-3xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'}`}>
                                <ProfileItem
                                    label={t('companyName')}
                                    value={profile.companyName || t('notProvided')}
                                    onPress={() => openEdit('companyName')}
                                    isDark={isDark}
                                />
                                <View className={`h-[1px] mx-4 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`} />
                                <ProfileItem
                                    label={t('companyPhone')}
                                    value={profile.companyPhone || t('notProvided')}
                                    onPress={() => openEdit('companyPhone')}
                                    isDark={isDark}
                                />
                                <View className={`h-[1px] mx-4 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`} />
                                <ProfileItem
                                    label={t('companyDetails')}
                                    value={profile.companyDetails || t('notProvided')}
                                    onPress={() => openEdit('companyDetails')}
                                    isDark={isDark}
                                    isColumn={true}
                                />
                            </View>
                        </>
                    )}
                    {/* Settings Section */}
                    {profile.role !== 2 && (
                        <>
                            <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-100' : 'text-gray-600'} mb-3 mt-6`}>{t('settings')}</Text>
                            <View className={`rounded-3xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'}`}>
                                <View className="flex-row justify-between items-center px-4 py-4">
                                    <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('defaultRate')}</Text>
                                    <View className="flex-row items-center flex-1 justify-end ml-4">
                                        <Text className={`text-base mr-3 font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{profile.defaultRate ? `${profile.defaultRate} zł/h` : t('notSet')}</Text>
                                        <TouchableOpacity onPress={async () => {
                                            await fetchRateHistory();
                                            setHistoryModalVisible(true);
                                        }} className="px-2">
                                            <IconSymbol name="history" size={20} color={secondaryIconColor} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => openEdit('defaultRate')} className="px-2">
                                            <IconSymbol name="pencil" size={18} color={secondaryIconColor} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View className={`h-[1px] mx-4 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`} />
                                <View className="flex-row justify-between items-center px-4 py-4">
                                    <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('rateTypeLabel')}</Text>
                                    <View className={`flex-row bg-${isDark ? 'slate-900' : 'gray-100'} rounded-xl p-1`}>
                                        <TouchableOpacity
                                            onPress={async () => {
                                                const updated = { ...profile, rateType: 'netto' as const };
                                                await setDoc(doc(db, 'users', auth.currentUser!.uid), updated, { merge: true });
                                                setProfile(updated);
                                            }}
                                            className={`px-4 py-2 rounded-lg ${profile.rateType === 'netto' ? 'bg-indigo-600' : ''}`}
                                        >
                                            <Text className={`text-sm font-bold ${profile.rateType === 'netto' ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('netto')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={async () => {
                                                const updated = { ...profile, rateType: 'brutto' as const };
                                                await setDoc(doc(db, 'users', auth.currentUser!.uid), updated, { merge: true });
                                                setProfile(updated);
                                            }}
                                            className={`px-4 py-2 rounded-lg ${profile.rateType === 'brutto' ? 'bg-indigo-600' : ''}`}
                                        >
                                            <Text className={`text-sm font-bold ${profile.rateType === 'brutto' ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('brutto')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </>
                    )}
                    {/* Language Section */}
                    <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-100' : 'text-gray-600'} mb-3 mt-6`}>{t('languageLabel')}</Text>
                    <View className={`rounded-3xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'} mb-2`}>
                        <ThemeOption
                            label={t('langPl')}
                            active={language === 'pl'}
                            onPress={() => setLanguage('pl')}
                            isDark={isDark}
                        />
                        <View className={`h-[1px] mx-4 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`} />
                        <ThemeOption
                            label={t('langEn')}
                            active={language === 'en'}
                            onPress={() => setLanguage('en')}
                            isDark={isDark}
                        />
                    </View>
                    {/* Theme Section */}
                    <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-100' : 'text-gray-600'} mb-3 mt-4`}>{t('appearance')}</Text>
                    <View className={`rounded-3xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'}`}>
                        <ThemeOption
                            label={t('themeLight')}
                            active={themeMode === 'light'}
                            onPress={() => setThemeMode('light')}
                            isDark={isDark}
                        />
                        <View className={`h-[1px] mx-4 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`} />
                        <ThemeOption
                            label={t('themeDark')}
                            active={themeMode === 'dark'}
                            onPress={() => setThemeMode('dark')}
                            isDark={isDark}
                        />
                        <View className={`h-[1px] mx-4 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`} />
                        <ThemeOption
                            label={t('themeSystem')}
                            active={themeMode === 'system'}
                            onPress={() => setThemeMode('system')}
                            isDark={isDark}
                        />
                    </View>
                    <TouchableOpacity
                        className={`mt-10 p-5 rounded-3xl items-center border bg-red-600 border-red-600 ${isDark ? null : 'shadow-sm'}`}
                        onPress={() => auth.signOut()}
                    >
                        <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-white'}`}>{t('logout')}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
            {/* Edit Modal */}
            <Modal visible={editModalVisible} transparent animationType="fade">
                <View className="flex-1 bg-black/70 justify-center p-6">
                    <View className={`relative rounded-3xl p-6 border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-300'}`}>
                        <Text className={`text-xl font-bold mb-5 text-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                            {t('edit')} {
                                editingField === 'firstName' ? t('firstName') :
                                    editingField === 'lastName' ? t('lastName') :
                                        editingField === 'birthDate' ? t('birthDate') :
                                            editingField === 'phone' ? t('phone') :
                                                editingField === 'companyName' ? t('companyName') :
                                                    editingField === 'companyPhone' ? t('companyPhone') :
                                                        editingField === 'companyDetails' ? t('companyDetails') :
                                                            editingField === 'defaultRate' ? t('defaultRate') : ''
                            }
                        </Text>
                        <View className={`relative flex ${editingField === 'birthDate' ? 'mb-4' : 'mb-6'}`}>
                            <TextInput
                                className={`w-full border rounded-xl p-4 text-base ${isDark ? 'bg-slate-800 border-slate-500 text-slate-300' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
                                value={editValue}
                                onChangeText={setEditValue}
                                keyboardType={
                                    editingField === 'defaultRate' || editingField === 'birthDate' ? (Platform.OS === 'ios' ? 'decimal-pad' : 'numeric') :
                                        editingField === 'phone' || editingField === 'companyPhone' ? 'phone-pad' : 'default'
                                }
                                placeholder={editingField === 'birthDate' ? 'DD.MM.YYYY' : ''}
                                placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
                                autoFocus
                                multiline={editingField === 'companyDetails'}
                                numberOfLines={editingField === 'companyDetails' ? 4 : 1}
                                style={editingField === 'companyDetails' ? { height: 100, textAlignVertical: 'top' } : undefined}
                            />
                            {editingField === 'birthDate' && (
                                <TouchableOpacity
                                    onPress={openCustomDatePicker}
                                    className="absolute right-3 top-2 w-10 h-10 items-center justify-center"
                                    style={{ zIndex: 50 }}
                                >
                                    <IconSymbol name="calendar" size={24} color={secondaryIconColor} />
                                </TouchableOpacity>
                            )}
                        </View>
                        {editingField === 'birthDate' && (
                            <Text className={`text-xs mb-6 -mt-3 text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                {t('recommendedDateFormat')}
                            </Text>
                        )}
                        <View className="flex-row justify-between">
                            <TouchableOpacity className="flex-1 me-2 py-4 rounded-xl items-center border border-red-500" onPress={() => setEditModalVisible(false)}>
                                <Text className="text-red-500 font-semibold text-base">{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="flex-1 ms-2 bg-indigo-600 py-4 rounded-xl items-center" onPress={saveEdit}>
                                <Text className="text-white font-bold text-base">{t('save')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {showDatePicker && (
                <Modal visible={showDatePicker} transparent animationType="fade">
                    <View className="flex-1 bg-black/70 justify-center items-center p-6">
                        <View className={`w-full max-w-[340px] rounded-[28px] overflow-hidden ${isDark ? 'bg-[#1C1B1F] border border-[#49454F]' : 'bg-[#F2F2F2] border border-gray-200'}`}>
                            {/* Header */}
                            <View className="p-4 flex-row justify-between items-center border-b border-[#49454F]/20">
                                <View className="flex-row items-center gap-1">
                                    <TouchableOpacity
                                        onPress={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                                        className="flex-row items-center p-2 rounded-lg"
                                    >
                                        <Text className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {format(pickerDate, 'MMM', { locale: pl })}
                                        </Text>
                                        <IconSymbol name="chevron.down" size={16} color={isDark ? 'white' : 'black'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                                        className="flex-row items-center p-2 rounded-lg"
                                    >
                                        <Text className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {format(pickerDate, 'yyyy')}
                                        </Text>
                                        <IconSymbol name="chevron.down" size={16} color={isDark ? 'white' : 'black'} />
                                    </TouchableOpacity>
                                </View>
                                <View className="flex-row gap-2">
                                    <TouchableOpacity onPress={() => setPickerDate(subMonths(pickerDate, 1))} className="p-2">
                                        <IconSymbol name="chevron.left" size={24} color={isDark ? 'white' : 'black'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setPickerDate(addMonths(pickerDate, 1))} className="p-2">
                                        <IconSymbol name="chevron.right" size={24} color={isDark ? 'white' : 'black'} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {/* Body */}
                            <View className="p-4 min-h-[300px]">
                                {viewMode === 'days' && (
                                    <>
                                        <View className="flex-row justify-between mb-2">
                                            {['pn', 'wt', 'śr', 'cz', 'pt', 'so', 'nd'].map(d => (
                                                <Text key={d} className={`w-[40px] text-center text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                                    {d.toUpperCase()}
                                                </Text>
                                            ))}
                                        </View>
                                        <View className="flex-row flex-wrap">
                                            {(() => {
                                                const start = startOfWeek(startOfMonth(pickerDate), { weekStartsOn: 1 });
                                                const end = endOfWeek(endOfMonth(pickerDate), { weekStartsOn: 1 });
                                                return eachDayOfInterval({ start, end }).map(day => {
                                                    const isCurrentMonth = isSameMonth(day, pickerDate);
                                                    const isSelected = isSameDay(day, pickerDate);
                                                    return (
                                                        <TouchableOpacity
                                                            key={day.toISOString()}
                                                            onPress={() => setPickerDate(day)}
                                                            className={`w-[40px] h-[40px] items-center justify-center rounded-full my-0.5 ${isSelected ? 'bg-indigo-600' : ''}`}
                                                        >
                                                            <Text className={`text-sm ${isSelected ? 'text-white font-bold' : isCurrentMonth ? (isDark ? 'text-slate-200' : 'text-gray-900') : (isDark ? 'text-slate-600' : 'text-gray-300')}`}>
                                                                {getDate(day)}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                });
                                            })()}
                                        </View>
                                    </>
                                )}
                                {viewMode === 'months' && (
                                    <View className="flex-row flex-wrap justify-between">
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <TouchableOpacity
                                                key={i}
                                                onPress={() => { setPickerDate(setMonth(pickerDate, i)); setViewMode('days'); }}
                                                className={`w-[30%] py-4 items-center rounded-xl mb-2 ${getMonth(pickerDate) === i ? 'bg-indigo-600' : isDark ? 'bg-slate-800' : 'bg-gray-100'}`}
                                            >
                                                <Text className={`font-medium ${getMonth(pickerDate) === i ? 'text-white' : isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                                                    {format(new Date(2021, i, 1), 'LLL', { locale: pl })}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                {viewMode === 'years' && (
                                    <ScrollView className="max-h-[300px]" showsVerticalScrollIndicator={false}>
                                        <View className="flex-row flex-wrap justify-between">
                                            {Array.from({ length: 100 }).map((_, i) => {
                                                const year = new Date().getFullYear() - i;
                                                return (
                                                    <TouchableOpacity
                                                        key={year}
                                                        onPress={() => { setPickerDate(setYear(pickerDate, year)); setViewMode('days'); }}
                                                        className={`w-[30%] py-4 items-center rounded-xl mb-2 ${getYear(pickerDate) === year ? 'bg-indigo-600' : isDark ? 'bg-slate-800' : 'bg-gray-100'}`}
                                                    >
                                                        <Text className={`font-medium ${getYear(pickerDate) === year ? 'text-white' : isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                                                            {year}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </ScrollView>
                                )}
                            </View>
                            {/* Footer */}
                            <View className="p-4 flex-row justify-end gap-2">
                                <TouchableOpacity onPress={() => setShowDatePicker(false)} className="px-6 py-3">
                                    <Text className="text-indigo-600 font-bold">{t('cancel').toUpperCase()}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={confirmCustomDate} className="px-6 py-3">
                                    <Text className="text-indigo-600 font-bold">OK</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
            {/* History Modal */}
            <Modal visible={historyModalVisible} transparent animationType="slide">
                <View className="flex-1 bg-black/70 justify-center p-6">
                    <View className={`rounded-3xl p-6 border max-h-[80%] ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-300'}`}>
                        <Text className={`text-xl font-bold mb-5 text-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{t('rateHistoryTitle')}</Text>
                        <ScrollView>
                            {rateHistory.length > 0 ? rateHistory.map((item, index) => (
                                <View key={index} className={`flex-row justify-between py-3 border-b ${isDark ? 'border-slate-700' : 'border-gray-50'}`}>
                                    <Text className={`${isDark ? 'text-slate-400' : 'text-gray-900'}`}>
                                        {item.date?.toDate ? item.date.toDate().toLocaleDateString() : t('noDate')}
                                    </Text>
                                    <Text className={`font-semibold ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{item.rate} zł/h</Text>
                                </View>
                            )) : (
                                <Text className="text-slate-400 text-center my-5">{t('noRateHistory')}</Text>
                            )}
                        </ScrollView>
                        <TouchableOpacity className="bg-indigo-600 py-4 rounded-xl items-center mt-5" onPress={() => setHistoryModalVisible(false)}>
                            <Text className="text-white font-bold text-base">{t('closeBtn')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {/* Company Info Modal */}
            <Modal visible={companyInfoModalVisible} transparent animationType="fade">
                <View className="flex-1 bg-black/70 justify-center p-6">
                    <View className={`rounded-3xl p-6 border max-h-[80%] ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-300'}`}>
                        <Text className={`text-xl font-bold mb-5 text-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{t('employerDataTitle')}</Text>
                        {selectedInviteForInfo && (
                            <ScrollView className="max-h-[300px] mb-5" showsVerticalScrollIndicator={false}>
                                <View className="mb-4">
                                    <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('companyName')} / {t('roleEmployer')}</Text>
                                    <Text className={`text-base font-semibold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {selectedInviteForInfo.employerCompanyName || selectedInviteForInfo.employerName}
                                    </Text>
                                </View>
                                <View className="mb-4">
                                    <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('contactPerson')}</Text>
                                    <Text className={`text-base mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {selectedInviteForInfo.employerName}
                                    </Text>
                                </View>
                                <View className="mb-4">
                                    <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('emailLabel')}</Text>
                                    <Text className={`text-base mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {selectedInviteForInfo.employerEmail}
                                    </Text>
                                </View>
                                <View className="mb-4">
                                    <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('phone')}</Text>
                                    <Text className={`text-base mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {selectedInviteForInfo.employerPhone || t('notProvided')}
                                    </Text>
                                </View>
                                <View className="mb-4">
                                    <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('companyDesc')}</Text>
                                    <Text className={`text-sm mt-1 leading-5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                                        {selectedInviteForInfo.employerCompanyDetails || t('noAdditionalDetails')}
                                    </Text>
                                </View>
                            </ScrollView>
                        )}
                        <TouchableOpacity className="bg-indigo-600 py-4 rounded-xl items-center" onPress={() => setCompanyInfoModalVisible(false)}>
                            <Text className="text-white font-bold text-base">{t('closeBtn')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
function ThemeOption({ label, active, onPress, isDark }: { label: string, active: boolean, onPress: () => void, isDark: boolean }) {
    return (
        <TouchableOpacity className="flex-row justify-between items-center px-4 py-4" onPress={onPress}>
            <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</Text>
            <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${active ? 'border-indigo-600' : isDark ? 'border-slate-600' : 'border-gray-400'}`}>
                {active && <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
            </View>
        </TouchableOpacity>
    );
}
function ProfileItem({ label, value, onPress, hideEdit = false, isDark, isColumn = false }: { label: string, value: string, onPress: () => void, hideEdit?: boolean, isDark: boolean, isColumn?: boolean }) {
    const primaryIconColor = isDark ? '#94A3B8' : '#9CA3AF';
    const secondaryIconColor = isDark ? '#4F46E5' : '#5d55e7';
    if (isColumn) {
        return (
            <View className="flex-col px-4 py-4">
                <View className="flex-row justify-between items-center mb-2">
                    <Text className={`text-base font-semibold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</Text>
                    {!hideEdit && (
                        <TouchableOpacity onPress={onPress}>
                            <IconSymbol name="pencil" size={18} color={secondaryIconColor} />
                        </TouchableOpacity>
                    )}
                </View>
                <Text className={`text-sm leading-5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{value}</Text>
            </View>
        );
    }
    return (
        <View className="flex-row justify-between items-center px-4 py-4">
            <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</Text>
            <View className="flex-row items-center flex-1 justify-end ml-4">
                <Text className={`text-base mr-3 font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{value}</Text>
                {!hideEdit && (
                    <TouchableOpacity onPress={onPress}>
                        <IconSymbol name="pencil" size={18} color={secondaryIconColor} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}