import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, doc, getDoc, getDocs, where, query, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View, FlatList, RefreshControl } from 'react-native';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { auth, db } from '../../config/firebaseConfig';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useToast } from '../../context/ToastContext';
import { TranslatedText } from '../../components/TranslatedText';
import { notifyUser } from '../../config/notificationService';

export default function HomeScreen() {
  const { isDark } = useAppTheme();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const router = useRouter();

  // Common user info
  const [role, setRole] = useState<number | null>(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  // Employer Dashboard State
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [workEntries, setWorkEntries] = useState<any[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Employee Dashboard State
  const [monthlyHours, setMonthlyHours] = useState(0);
  const [todayAssignments, setTodayAssignments] = useState<any[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // Live updates
  useFocusEffect(
    useCallback(() => {
      let active = true;
      let unsubscribes: (() => void)[] = [];
      const setupListeners = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (!docSnap.exists() || !active) return;
          const data = docSnap.data();
          setRole(data.role || 3);
          if (data.firstName) setUserName(data.firstName);

          if (data.role === 2) {
            // EMPLOYER: Live work entries (unchanged logic)
            setLoadingDashboard(true);
            const empQuery = query(collection(db, 'users'), where('employerId', '==', user.uid));

            const unsubEmployees = onSnapshot(empQuery, (empSnap) => {
              if (!active) return;
              const empList = empSnap.docs.map(doc => ({
                id: doc.id,
                name: `${doc.data().firstName} ${doc.data().lastName}`.trim() || doc.data().email || 'Pracownik'
              }));
              setEmployees(empList);

              // Unsubscribe from previous entries listeners (excluding unsubEmployees)
              unsubscribes.forEach((unsub, idx) => {
                if (idx > 0) unsub();
              });
              unsubscribes = [unsubEmployees];

              const entriesMap = new Map<string, any[]>();

              if (empList.length === 0) {
                setWorkEntries([]);
                setLoadingDashboard(false);
                return;
              }

              empList.forEach((emp) => {
                const q = query(collection(db, `users/${emp.id}/work_entries`));
                const unsubEntries = onSnapshot(q, (snap) => {
                  if (!active) return;
                  const empEntries = snap.docs.map(docDoc => {
                    const entryData = docDoc.data();
                    const dateObj = entryData.date?.toDate ? entryData.date.toDate() : new Date();
                    return {
                      id: docDoc.id,
                      ...entryData,
                      dateObject: dateObj,
                      employeeName: emp.name
                    };
                  });

                  entriesMap.set(emp.id, empEntries);

                  // Compile and sort
                  const compiledList: any[] = [];
                  entriesMap.forEach((list) => {
                    compiledList.push(...list);
                  });
                  compiledList.sort((a, b) => b.dateObject.getTime() - a.dateObject.getTime());
                  setWorkEntries(compiledList);
                  setLoadingDashboard(false);
                }, (err) => {
                  console.error(`Error in entries subscription for ${emp.id}:`, err);
                });
                unsubscribes.push(unsubEntries);
              });
            }, (err) => {
              console.error("Error in employees subscription:", err);
            });
            unsubscribes.push(unsubEmployees);
          } else {
            // EMPLOYEE: Monthly hours + today's assignments
            // 1. Monthly hours from work_entries
            const workEntriesQuery = query(collection(db, `users/${user.uid}/work_entries`));
            const unsubWorkEntries = onSnapshot(workEntriesQuery, (snap) => {
              if (!active) return;
              const now = new Date();
              const currentMonth = now.getMonth();
              const currentYear = now.getFullYear();
              let totalHours = 0;
              snap.docs.forEach(d => {
                const entryData = d.data();
                const dateObj = entryData.date?.toDate ? entryData.date.toDate() : new Date();
                if (dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) {
                  totalHours += entryData.hours || 0;
                }
              });
              setMonthlyHours(totalHours);
            }, (err) => {
              console.error("Error in employee work entries subscription:", err);
            });
            unsubscribes.push(unsubWorkEntries);

            // 2. Employee assignments
            const assignQuery = query(
              collection(db, 'assignments'),
              where('employeeIds', 'array-contains', user.uid)
            );
            const unsubAssignments = onSnapshot(assignQuery, (snap) => {
              if (!active) return;
              const list = snap.docs.map(d => {
                const data = d.data();
                const dateObj = data.date?.toDate ? data.date.toDate() : new Date();
                return { id: d.id, ...data, dateObject: dateObj };
              });
              // Sort by date (newest/soonest first)
              list.sort((a, b) => b.dateObject.getTime() - a.dateObject.getTime());
              setTodayAssignments(list);
            }, (err) => {
              console.error("Error in employee assignments subscription:", err);
            });
            unsubscribes.push(unsubAssignments);
          }
        } catch (error) {
          console.error('Error in setupListeners:', error);
        } finally {
          if (active) setLoading(false);
        }
      };

      setupListeners();

      return () => {
        active = false;
        unsubscribes.forEach(unsub => unsub());
      };
    }, [])
  );

  // Fallback manual refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const user = auth.currentUser;
    if (user) {
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRole(data.role || 3);
          if (data.firstName) setUserName(data.firstName);
          if (data.role === 2) {
            const empQuery = query(collection(db, 'users'), where('employerId', '==', user.uid));
            const empSnap = await getDocs(empQuery);
            const empList = empSnap.docs.map(doc => ({
              id: doc.id,
              name: `${doc.data().firstName} ${doc.data().lastName}`.trim() || doc.data().email || 'Pracownik'
            }));
            setEmployees(empList);

            const promises = empList.map(async (emp) => {
              const q = query(collection(db, `users/${emp.id}/work_entries`));
              const snap = await getDocs(q);
              return snap.docs.map(docDoc => {
                const entryData = docDoc.data();
                const dateObj = entryData.date?.toDate ? entryData.date.toDate() : new Date();
                return {
                  id: docDoc.id,
                  ...entryData,
                  dateObject: dateObj,
                  employeeName: emp.name
                };
              });
            });
            const results = await Promise.all(promises);
            const compiledList = results.flat();
            compiledList.sort((a, b) => b.dateObject.getTime() - a.dateObject.getTime());
            setWorkEntries(compiledList);
          } else {
            // EMPLOYEE
            console.log("[Dashboard Manual Refresh] Reloading employee data...");
            // 1. Reload monthly hours
            const workEntriesQuery = query(collection(db, `users/${user.uid}/work_entries`));
            const workEntriesSnap = await getDocs(workEntriesQuery);
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            let totalHours = 0;
            workEntriesSnap.docs.forEach(d => {
              const entryData = d.data();
              const dateObj = entryData.date?.toDate ? entryData.date.toDate() : new Date();
              if (dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) {
                totalHours += entryData.hours || 0;
              }
            });
            setMonthlyHours(totalHours);

            // 2. Reload employee assignments
            const assignQuery = query(
              collection(db, 'assignments'),
              where('employeeIds', 'array-contains', user.uid)
            );
            const assignSnap = await getDocs(assignQuery);
            const list = assignSnap.docs.map(d => {
              const data = d.data();
              const dateObj = data.date?.toDate ? data.date.toDate() : new Date();
              return { id: d.id, ...data, dateObject: dateObj };
            });
            // Sort by date
            list.sort((a, b) => b.dateObject.getTime() - a.dateObject.getTime());
            setTodayAssignments(list);
          }
        }
      } catch (err) {
        console.error("Error refreshing dashboard:", err);
      }
    }
    setRefreshing(false);
  }, []);
  // Employee: Confirm assignment
  const handleConfirmAssignment = async (assignmentId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    setConfirmingId(assignmentId);
    try {
      const assignRef = doc(db, 'assignments', assignmentId);

      // Get the assignment details to find the employerId
      const assignSnap = await getDoc(assignRef);
      let employerId = null;
      let address = '';
      if (assignSnap.exists()) {
        const assignData = assignSnap.data();
        employerId = assignData.employerId;
        address = assignData.address || '';
      }

      await updateDoc(assignRef, {
        [`confirmations.${user.uid}`]: {
          confirmed: true,
          confirmedAt: serverTimestamp(),
        }
      });

      // Send push notification to the employer
      if (employerId) {
        const employeeName = userName || user.displayName || user.email || 'Pracownik';
        const title = t('assignmentConfirmedNotifTitle') || 'Adres potwierdzony!';
        const body = (t('assignmentConfirmedNotifBody') || '{employee} potwierdził otrzymanie adresu: {address}')
          .replace('{employee}', employeeName)
          .replace('{address}', address);
        notifyUser(employerId, title, body, { url: '/(tabs)/assignments' });
      }
    } catch (error) {
      console.error('Error confirming assignment:', error);
      showToast({ message: t('confirmError'), type: 'error' });
    } finally {
      setConfirmingId(null);
    }
  };
  // Helper: Sum hours for the selected employee in the current month (employer)
  const getMonthlyHoursSummary = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return workEntries
      .filter(entry => {
        if (selectedEmployeeId !== 'all' && entry.employeeUid !== selectedEmployeeId) {
          return false;
        }
        const entryDate = entry.dateObject;
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
      })
      .reduce((sum, entry) => sum + (entry.hours || 0), 0);
  };

  // Helper: Filter work entries by search query and selected employee
  const getFilteredEntries = () => {
    return workEntries.filter(entry => {
      if (selectedEmployeeId !== 'all' && entry.employeeUid !== selectedEmployeeId) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const address = (entry.address || '').toLowerCase();
        const description = (entry.description || '').toLowerCase();
        const employee = (entry.employeeName || '').toLowerCase();
        return address.includes(q) || description.includes(q) || employee.includes(q);
      }
      return true;
    });
  };

  // LOADING STATE
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#0F172A' : '#F3F4F6' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // EMPLOYER VIEW (role === 2)
  if (role === 2) {
    const currentMonthName = format(new Date(), 'LLLL', { locale: language === 'pl' ? pl : undefined });
    const totalHours = getMonthlyHoursSummary();
    const displayEntries = getFilteredEntries();
    return (
      <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <FlatList
          data={displayEntries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4F46E5"]}
              tintColor={isDark ? "#FFFFFF" : "#4F46E5"}
            />
          }
          ListHeaderComponent={
            <View className="mb-6">
              {/* Header */}
              <View className="mb-6 flex-row justify-between items-end">
                <View className="flex-1 mr-4">
                  <Text className={`text-lg font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t('goodMorning')} {userName || (language === 'pl' ? 'Pracodawco' : 'Employer')}!
                  </Text>
                  <Text className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {t('employerPanel')}
                  </Text>
                </View>
              </View>
              {/* Monthly Summary Card */}
              <View className={`rounded-3xl p-5 mb-6 border ${isDark ? 'bg-indigo-950/20 border-indigo-900/40' : 'bg-indigo-50 border-indigo-100'}`}>
                <Text className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-600'} mb-1`}>
                  {t('hoursSum')} ({currentMonthName})
                </Text>
                <Text className={`text-4xl font-extrabold ${isDark ? 'text-white' : 'text-indigo-900'}`}>
                  {totalHours} h
                </Text>
                <Text className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {selectedEmployeeId === 'all'
                    ? t('hoursSumDescAll')
                    : t('hoursSumDescOne')}
                </Text>
              </View>
              {/* Filters Section */}
              <View className="mb-6">
                <Text className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {t('filterEmployees')}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
                  <TouchableOpacity
                    onPress={() => setSelectedEmployeeId('all')}
                    className={`px-5 py-2.5 rounded-full mr-2 border ${selectedEmployeeId === 'all'
                      ? 'bg-indigo-600 border-indigo-600'
                      : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'
                      }`}
                  >
                    <Text className={`text-xs font-bold ${selectedEmployeeId === 'all' ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                      {t('filterAll')}
                    </Text>
                  </TouchableOpacity>
                  {employees.map(emp => (
                    <TouchableOpacity
                      key={emp.id}
                      onPress={() => setSelectedEmployeeId(emp.id)}
                      className={`px-5 py-2.5 rounded-full mr-2 border ${selectedEmployeeId === emp.id
                        ? 'bg-indigo-600 border-indigo-600'
                        : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'
                        }`}
                    >
                      <Text className={`text-xs font-bold ${selectedEmployeeId === emp.id ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                        {emp.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {/* Text Search (Where/What) */}
                <View className={`flex-row items-center border rounded-xl px-4 py-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'}`}>
                  <TextInput
                    className={`flex-1 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}
                    placeholder={t('searchPlaceholder')}
                    placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <IconSymbol name="xmark" size={18} color={isDark ? '#94A3B8' : '#9CA3AF'} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
              <Text className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {t('entriesHistory')} ({displayEntries.length})
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className={`rounded-2xl p-4 mb-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'}`}>
              <View className={`flex-row justify-between items-start mb-3 border-b pb-2 ${isDark ? 'border-slate-700' : 'border-gray-50'}`}>
                <View className="flex-1 mr-2">
                  <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={2}>
                    {item.address}
                  </Text>
                  <Text className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t('employeeLabel')}: {item.employeeName || t('unknownEmployee')} • {item.dateString}
                  </Text>
                </View>
              </View>
              <View className="mb-3">
                <Text className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-gray-500'} mb-1`}>
                  {t('descriptionLabel')}
                </Text>
                <TranslatedText
                  text={item.description || ''}
                  targetLang={language}
                  isDark={isDark}
                />
              </View>
              <View className="flex-row justify-between items-center bg-indigo-50/50 dark:bg-indigo-950/10 p-3 rounded-xl">
                <Text className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {t('durationLabel')}
                </Text>
                <Text className="text-sm font-extrabold text-indigo-600">
                  {item.hours}h
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View className="mt-12 items-center px-10">
              <Text className="text-center text-slate-400 text-base">
                {loadingDashboard ? t('loadingEntries') : t('noEntries')}
              </Text>
            </View>
          }
        />
      </View>
    );
  }
  // EMPLOYEE / DEV DASHBOARD VIEW (role === 3 or role === 1)
  const currentMonthName = format(new Date(), 'LLLL', { locale: language === 'pl' ? pl : undefined });
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
      <View className="mb-6">
        <Text className={`text-lg font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {t('hello')} {userName}!
        </Text>
        <Text className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('tabHome')}
        </Text>
      </View>
      {/* Monthly Hours Summary Card */}
      <View className={`rounded-3xl p-5 mb-6 border ${isDark ? 'bg-indigo-950/20 border-indigo-900/40' : 'bg-indigo-50 border-indigo-100'}`}>
        <Text className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-600'} mb-1`}>
          {t('monthlyHoursSummary')} ({currentMonthName})
        </Text>
        <Text className={`text-4xl font-extrabold ${isDark ? 'text-white' : 'text-indigo-900'}`}>
          {monthlyHours} h
        </Text>
      </View>
      {/* Employee Assignments */}
      <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-400' : 'text-gray-600'} mb-3`}>
        {t('tabAssignments')} ({todayAssignments.length})
      </Text>
      {todayAssignments.length > 0 ? (
        todayAssignments.map((assign: any) => {
          const user = auth.currentUser;
          const confirmations = assign.confirmations || {};
          const isConfirmed = user ? confirmations[user.uid]?.confirmed === true : false;
          const isConfirming = confirmingId === assign.id;
          return (
            <View
              key={assign.id}
              className={`rounded-2xl p-4 mb-3 border ${isConfirmed
                ? isDark ? 'bg-green-950/20 border-green-900/40' : 'bg-green-50 border-green-200'
                : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'
                }`}
            >
              {/* Address and Date */}
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-row items-center flex-1 mr-2">
                  <IconSymbol name="location.fill" size={18} color="#4F46E5" />
                  <Text className={`text-xl font-bold ml-2 flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={2}>
                    {assign.address}
                  </Text>
                </View>
                <Text className={`text-md ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {assign.dateString}
                </Text>
              </View>
              {/* Description */}
              <Text className={`text-lg leading-5 mb-4 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {assign.description}
              </Text>
              {/* Confirm Button */}
              {isConfirmed ? (
                <View className="flex-row items-center justify-center py-3 rounded-xl bg-green-600/10">
                  <IconSymbol name="checkmark.circle.fill" size={18} color="#22C55E" />
                  <Text className="text-green-500 font-bold text-sm ml-2">
                    {t('confirmed')}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  className="btn-primary flex-row py-3"
                  onPress={() => handleConfirmAssignment(assign.id)}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="btn-primary-text text-sm">{t('confirmAssignment')}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })
      ) : (
        <View className={`rounded-2xl p-6 items-center border mb-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`}>
          <IconSymbol name="checkmark.circle.fill" size={32} color={isDark ? '#334155' : '#D1D5DB'} />
          <Text className={`text-sm mt-3 text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {t('noAssignments')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}