import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, doc, getDoc, getDocs, updateDoc, deleteDoc, where, query, serverTimestamp, onSnapshot } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View, Modal, RefreshControl } from 'react-native';
import { format } from 'date-fns';
import { auth, db } from '../../config/firebaseConfig';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useToast } from '../../context/ToastContext';
import { CustomDatePicker } from '../../components/CustomDatePicker';

export default function WorkEntriesScreen() {
    const { isDark } = useAppTheme();
    const { t, language } = useLanguage();
    const { showToast } = useToast();
    const router = useRouter();

    // Common states
    const [role, setRole] = useState<number | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(true);

    // Employee Form State
    const [address, setAddress] = useState('');
    const [description, setDescription] = useState('');
    const [hours, setHours] = useState('');
    const [dateText, setDateText] = useState(format(new Date(), 'dd.MM.yyyy'));
    const [dateVal, setDateVal] = useState(new Date());
    const [saving, setSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Employer Team Management State
    const [inviteEmail, setInviteEmail] = useState('');
    const [sendingInvite, setSendingInvite] = useState(false);
    const [activeEmployees, setActiveEmployees] = useState<any[]>([]);
    const [pendingInvites, setPendingInvites] = useState<any[]>([]);
    const [employeeInfoModalVisible, setEmployeeInfoModalVisible] = useState(false);
    const [selectedEmployeeForInfo, setSelectedEmployeeForInfo] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch data from profile when screen is focused (live subscriptions)
    useFocusEffect(
        useCallback(() => {
            let active = true;
            let unsubscribes: (() => void)[] = [];
            const fetchData = async () => {
                const user = auth.currentUser;
                if (!user) return;
                try {
                    const docSnap = await getDoc(doc(db, 'users', user.uid));
                    if (!docSnap.exists() || !active) return;
                    const data = docSnap.data();
                    setProfile(data);
                    setRole(data.role || 3);
                    setUserName(data.firstName || '');
                    if (data.role === 2) {
                        // Live active employees
                        const empQuery = query(collection(db, 'users'), where('employerId', '==', user.uid));
                        const unsubEmployees = onSnapshot(empQuery, (empSnap) => {
                            if (!active) return;
                            const empList = empSnap.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            }));
                            setActiveEmployees(empList);
                        }, (err) => {
                            console.error("Error listening to active employees:", err);
                        });
                        unsubscribes.push(unsubEmployees);
                        // Live pending invites
                        const inviteQuery = query(
                            collection(db, 'invitations'),
                            where('employerId', '==', user.uid),
                            where('status', '==', 'pending')
                        );
                        const unsubInvites = onSnapshot(inviteQuery, (inviteSnap) => {
                            if (!active) return;
                            const inviteList = inviteSnap.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            }));
                            setPendingInvites(inviteList);
                        }, (err) => {
                            console.error("Error listening to invitations:", err);
                        });
                        unsubscribes.push(unsubInvites);
                    }
                } catch (error) {
                    console.error('Error fetching data in entries page:', error);
                } finally {
                    if (active) setLoading(false);
                }
            };
            fetchData();
            return () => {
                active = false;
                unsubscribes.forEach(unsub => unsub());
            };
        }, [])
    );

    // Manual fallback refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        const user = auth.currentUser;
        if (user) {
            try {
                const docSnap = await getDoc(doc(db, 'users', user.uid));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.role === 2) {
                        const empQuery = query(collection(db, 'users'), where('employerId', '==', user.uid));
                        const empSnap = await getDocs(empQuery);
                        setActiveEmployees(empSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                        const inviteQuery = query(
                            collection(db, 'invitations'),
                            where('employerId', '==', user.uid),
                            where('status', '==', 'pending')
                        );
                        const inviteSnap = await getDocs(inviteQuery);
                        setPendingInvites(inviteSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    }
                }
            } catch (err) {
                console.error("Error refreshing team management page:", err);
            }
        }
        setRefreshing(false);
    }, []);

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
    // Save work entry (Employee)
    const handleSaveWorkEntry = async () => {
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
            const employeeName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || user.email;
            const employerId = profile?.employerId || null;

            await addDoc(collection(db, `users/${user.uid}/work_entries`), {
                address: address,
                description: description,
                hours: h,
                dateString: dateText,
                date: selectedDate,
                createdAt: serverTimestamp(),
                employeeUid: user.uid,
                employeeName: employeeName,
                employerId: employerId,
            });

            showToast({ message: t('entrySaveSuccess'), type: 'success' });
            setAddress('');
            setDescription('');
            setHours('');
            setDateText(format(new Date(), 'dd.MM.yyyy'));
            setDateVal(new Date());
        } catch (error) {
            console.error(error);
            showToast({ message: t('entrySaveError'), type: 'error' });
        } finally {
            setSaving(false);
        }
    };
    // Send Invitation (Employer)
    const handleSendInvite = async () => {
        if (!inviteEmail) {
            showToast({ message: t('inviteErrorEmailEmpty'), type: 'error' });
            return;
        }

        const emailClean = inviteEmail.toLowerCase().trim();
        setSendingInvite(true);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Nie zalogowano');

            // Check if user exists in database and is role 3 (employee)
            const userQuery = query(collection(db, 'users'), where('email', '==', emailClean));
            const userSnap = await getDocs(userQuery);
            if (userSnap.empty) {
                Alert.alert(t('error'), t('inviteErrorUserNotFound'));
                showToast({ message: t('inviteErrorUserNotFound'), type: 'error' });
                setSendingInvite(false);
                return;
            }

            const targetUserDoc = userSnap.docs[0];
            const targetUserData = targetUserDoc.data();
            if (targetUserData.role !== 3) {
                showToast({ message: t('inviteErrorNotEmployee'), type: 'error' });
                setSendingInvite(false);
                return;
            }

            if (targetUserData.employerId) {
                showToast({ message: t('inviteErrorAlreadyAssigned'), type: 'error' });
                setSendingInvite(false);
                return;
            }

            // Check if there is already a pending invitation for this user
            const existingInviteQuery = query(
                collection(db, 'invitations'),
                where('employerId', '==', user.uid),
                where('employeeEmail', '==', emailClean),
                where('status', '==', 'pending')
            )
            const existingInviteSnap = await getDocs(existingInviteQuery);

            if (!existingInviteSnap.empty) {
                showToast({ message: t('inviteErrorAlreadySent'), type: 'error' });
                setSendingInvite(false);
                return;
            }

            // Add invitation
            const employerName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || user.email;
            await addDoc(collection(db, 'invitations'), {
                employerId: user.uid,
                employerEmail: user.email,
                employerName: employerName,
                employerCompanyName: profile?.companyName || '',
                employerCompanyDetails: profile?.companyDetails || '',
                employerPhone: profile?.companyPhone || profile?.phone || '',
                employeeEmail: emailClean,
                employeeUid: targetUserDoc.id,
                employeeName: `${targetUserData.firstName || ''} ${targetUserData.lastName || ''}`.trim() || emailClean,
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            showToast({ message: t('inviteSentSuccess'), type: 'success' });
            setInviteEmail('');

            // Refresh pending invites list
            const inviteQuery = query(
                collection(db, 'invitations'),
                where('employerId', '==', user.uid),
                where('status', '==', 'pending')
            );
            const inviteSnap = await getDocs(inviteQuery);
            setPendingInvites(inviteSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) {
            console.error(e);
            showToast({ message: t('inviteError'), type: 'error' });
        } finally {
            setSendingInvite(false);
        }
    };

    // Remove Employee (Employer)
    const handleRemoveEmployee = async (employeeUid: string, employeeName: string) => {
        Alert.alert(
            t('removeEmployeeTitle'),
            t('removeEmployeeConfirm').replace('{name}', employeeName),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('removeBtn'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Update employee document to remove employerId
                            await updateDoc(doc(db, 'users', employeeUid), {
                                employerId: null,
                                employerName: null
                            });
                            // Mark invitation as removed/deleted
                            const inviteQuery = query(
                                collection(db, 'invitations'),
                                where('employerId', '==', auth.currentUser?.uid),
                                where('employeeUid', '==', employeeUid),
                                where('status', '==', 'accepted')
                            );
                            const inviteSnap = await getDocs(inviteQuery);
                            if (!inviteSnap.empty) {
                                await deleteDoc(doc(db, 'invitations', inviteSnap.docs[0].id));
                            }
                            showToast({ message: t('removeSuccess'), type: 'success' });
                            setActiveEmployees(prev => prev.filter(emp => emp.id !== employeeUid));
                        } catch (error) {
                            console.error(error);
                            showToast({ message: t('removeError'), type: 'error' });
                        }
                    }
                }
            ]
        );
    };

    // Cancel Pending Invitation (Employer)
    const handleCancelInvite = async (inviteId: string) => {
        Alert.alert(
            t('cancelInviteTitle'),
            t('cancelInviteConfirm'),
            [
                { text: t('cancelInviteNo'), style: 'cancel' },
                {
                    text: t('cancelInviteYes'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'invitations', inviteId));
                            setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
                            showToast({ message: t('cancelInviteSuccess'), type: 'success' });
                        } catch (error) {
                            console.error(error);
                            showToast({ message: t('cancelInviteError'), type: 'error' });
                        }
                    }
                }
            ]
        );
    };
    // LOADING STATE
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#0F172A' : '#F3F4F6' }}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }
    // EMPLOYER MANAGEMENT VIEW
    if (role === 2) {
        return (
            <ScrollView
                className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}
                contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 120 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#4F46E5"]}
                        tintColor={isDark ? "#FFFFFF" : "#4F46E5"}
                    />
                }
            >
                <StatusBar style={isDark ? "light" : "dark"} />
                {/* Header */}
                <View className="mb-8">
                    <Text className={`text-lg font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t('teamManagement')}
                    </Text>
                    <Text className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {t('employeesAndInvites')}
                    </Text>
                </View>
                {/* Invite Employee Card */}
                <View className={`card-premium mb-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`}>
                    <Text className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {t('inviteNewEmployee')}
                    </Text>
                    <View className="mb-4">
                        <TextInput
                            className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                            placeholder={t('inviteEmailPlaceholder')}
                            placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                            value={inviteEmail}
                            onChangeText={setInviteEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                    <TouchableOpacity
                        className="btn-primary mt-2 flex-row"
                        onPress={handleSendInvite}
                        disabled={sendingInvite}
                    >
                        {sendingInvite ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="btn-primary-text">{t('sendInviteBtn')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
                {/* Active Employees List */}
                <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-400' : 'text-gray-600'} mb-3`}>
                    {t('activeEmployeesTitle')} ({activeEmployees.length})
                </Text>
                <View className={`rounded-3xl border mb-8 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'}`}>
                    {activeEmployees.length > 0 ? (
                        activeEmployees.map((emp, index) => (
                            <View key={emp.id}>
                                {index > 0 && <View className={`h-[1px] ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />}
                                <View className="flex-row justify-between items-center p-4">
                                    <View className="flex-1 mr-3">
                                        <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                            {`${emp.firstName || ''} ${emp.lastName || ''}`.trim() || (language === 'pl' ? 'Pracownik' : 'Employee')}
                                        </Text>
                                        <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                            {emp.email}
                                        </Text>
                                    </View>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedEmployeeForInfo(emp);
                                                setEmployeeInfoModalVisible(true);
                                            }}
                                            className={`p-2 rounded-lg ${isDark ? 'bg-indigo-950/50' : 'bg-indigo-100'}`}
                                        >
                                            <IconSymbol name="info.circle" size={18} color="#4F46E5" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleRemoveEmployee(emp.id, `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email)}
                                            className={`p-2 rounded-lg ${isDark ? 'bg-red-950/50' : 'bg-red-100'}`}
                                        >
                                            <IconSymbol name="trash.fill" size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View className="p-6 items-center">
                            <Text className="text-md text-slate-400 text-center">{t('noEmployeesPlaceholder')}</Text>
                        </View>
                    )}
                </View>
                {/* Pending Invites List */}
                <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-400' : 'text-gray-600'} mb-3`}>
                    {t('sentInvitesTitle')} ({pendingInvites.length})
                </Text>
                <View className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'}`}>
                    {pendingInvites.length > 0 ? (
                        pendingInvites.map((inv, index) => (
                            <View key={inv.id}>
                                {index > 0 && <View className={`h-[1px] ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />}
                                <View className="flex-row justify-between items-center p-4">
                                    <View className="flex-1 mr-3">
                                        <Text className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                            {inv.employeeEmail}
                                        </Text>
                                        <Text className="text-sm text-amber-500 font-bold uppercase tracking-wider">
                                            {t('awaitingAcceptance')}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleCancelInvite(inv.id)}
                                        className={`px-3 py-1.5 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}
                                    >
                                        <Text className="text-xs text-red-500 font-semibold">{t('cancel')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View className="p-6 items-center">
                            <Text className="text-md text-slate-400 text-center">{t('noInvitesPlaceholder')}</Text>
                        </View>
                    )}
                </View>
                {/* Employee Info Modal */}
                <Modal visible={employeeInfoModalVisible} transparent animationType="fade">
                    <View className="flex-1 bg-black/70 justify-center p-6">
                        <View className={`rounded-3xl p-6 border max-h-[80%] ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-300'}`}>
                            <Text className={`text-xl font-bold mb-5 text-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{t('employeeDataTitle')}</Text>
                            {selectedEmployeeForInfo && (
                                <ScrollView className="max-h-[300px] mb-5" showsVerticalScrollIndicator={false}>
                                    <View className="mb-4">
                                        <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('fullName')}</Text>
                                        <Text className={`text-base font-semibold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {`${selectedEmployeeForInfo.firstName || ''} ${selectedEmployeeForInfo.lastName || ''}`.trim() || (language === 'pl' ? 'Pracownik' : 'Employee')}
                                        </Text>
                                    </View>
                                    <View className="mb-4">
                                        <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('emailLabel')}</Text>
                                        <Text className={`text-base mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {selectedEmployeeForInfo.email}
                                        </Text>
                                    </View>
                                    <View className="mb-4">
                                        <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('phone')}</Text>
                                        <Text className={`text-base mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {selectedEmployeeForInfo.phone || t('notSpecified')}
                                        </Text>
                                    </View>
                                    <View className="mb-4">
                                        <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('birthDate')}</Text>
                                        <Text className={`text-base mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {selectedEmployeeForInfo.birthDate || t('notSpecified')}
                                        </Text>
                                    </View>
                                </ScrollView>
                            )}
                            <TouchableOpacity className="bg-indigo-600 py-4 rounded-xl items-center" onPress={() => setEmployeeInfoModalVisible(false)}>
                                <Text className="text-white font-bold text-base">{t('closeBtn')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        );
    }
    // EMPLOYEE FORM VIEW (role === 3 or role === 1)
    return (
        <ScrollView
            className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}
            contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 120 }}
        >
            <StatusBar style={isDark ? "light" : "dark"} />
            {/* Header styled like index.tsx */}
            <View className="mb-8 flex-row justify-between items-end">
                <View className="flex-1 mr-4">
                    <Text className={`text-lg font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t('workNotebook')}
                    </Text>
                    <Text className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {t('addNewEntry')}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => router.push('/work-history')}
                    className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'}`}
                    style={{ marginBottom: 2 }}
                >
                    <IconSymbol name="history" size={24} color="#4F46E5" />
                </TouchableOpacity>
            </View>
            {/* Form Card */}
            <View className={`card-premium ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`}>
                <View className="mb-5">
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                        {t('addressLabel')}
                    </Text>
                    <TextInput
                        className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                        placeholder={t('addressPlaceholder')}
                        placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                        value={address}
                        onChangeText={setAddress}
                    />
                </View>
                <View className="mb-5">
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                        {t('descLabel')}
                    </Text>
                    <TextInput
                        className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                        placeholder={t('descPlaceholder')}
                        placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        style={{ height: 100 }}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>
                <View className="mb-5">
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                        {t('hoursLabel')}
                    </Text>
                    <TextInput
                        className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                        placeholder={t('hoursEntryPlaceholder')}
                        placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                        keyboardType="numeric"
                        value={hours}
                        onChangeText={setHours}
                    />
                </View>
                <View className="mb-6">
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                        {t('dateLabel')}
                    </Text>
                    <View className="flex-row items-center">
                        <TextInput
                            className={`flex-1 border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                            placeholder="DD.MM.YYYY"
                            placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                            value={dateText}
                            onChangeText={setDateText}
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
                    className="btn-primary mt-2 flex-row"
                    onPress={handleSaveWorkEntry}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text className="btn-primary-text">{t('saveEntryBtn')}</Text>
                    )}
                </TouchableOpacity>
            </View>
            {/* Info Section */}
            <View className={`rounded-2xl mt-8 p-5 border ${isDark ? 'bg-indigo-900/10 border-indigo-900/20' : 'bg-indigo-50 border-indigo-100'}`}>
                <Text className="text-base font-bold text-indigo-600 mb-2">{t('historyTitle')}</Text>
                <Text className={`text-sm leading-5 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    {t('historyDesc')}
                </Text>
            </View>
        </ScrollView>
    );
}