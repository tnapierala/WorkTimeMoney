import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, doc, where, query, onSnapshot, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View, Modal, RefreshControl } from 'react-native';
import { format } from 'date-fns';
import { auth, db } from '../../config/firebaseConfig';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { notifyUser } from '../../config/notificationService';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useToast } from '../../context/ToastContext';
import { CustomDatePicker } from '../../components/CustomDatePicker';

export default function AssignmentsScreen() {
  const { isDark } = useAppTheme();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [dateText, setDateText] = useState(format(new Date(), 'dd.MM.yyyy'));
  const [dateVal, setDateVal] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // Edit Assignment State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDateText, setEditDateText] = useState('');
  const [editDateVal, setEditDateVal] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editSelectedEmployeeIds, setEditSelectedEmployeeIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  // Fetch employees and assignments with live updates
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const unsubscribes: (() => void)[] = [];
      const setup = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
          // Live employees list
          const empQuery = query(collection(db, 'users'), where('employerId', '==', user.uid));
          const unsubEmp = onSnapshot(empQuery, (snap) => {
            if (!active) return;
            const empList = snap.docs.map(d => ({
              id: d.id,
              name: `${d.data().firstName || ''} ${d.data().lastName || ''}`.trim() || d.data().email || 'Employee',
              email: d.data().email || '',
            }));
            setEmployees(empList);
          });
          unsubscribes.push(unsubEmp);
          // Live assignments list
          const assignQuery = query(
            collection(db, 'assignments'),
            where('employerId', '==', user.uid)
          );
          const unsubAssign = onSnapshot(assignQuery, (snap) => {
            if (!active) return;
            const list = snap.docs.map(d => {
              const data = d.data();
              const dateObj = data.date?.toDate ? data.date.toDate() : new Date();
              return { id: d.id, ...data, dateObject: dateObj };
            });
            list.sort((a, b) => b.dateObject.getTime() - a.dateObject.getTime());
            setAssignments(list);
            setLoading(false);
          });
          unsubscribes.push(unsubAssign);
        } catch (error) {
          console.error('Error setting up assignments:', error);
          if (active) setLoading(false);
        }
      };
      setup();
      return () => {
        active = false;
        unsubscribes.forEach(u => u());
      };
    }, [])
  );
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // onSnapshot handles live data, just toggle refresh indicator
    setTimeout(() => setRefreshing(false), 500);
  }, []);
  const parseDateString = (dateStr: string): Date => {
    try {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        const parsed = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (!isNaN(parsed.getTime())) return parsed;
      }
    } catch (e) { /* fallback */ }
    return new Date();
  };
  const toggleEmployee = (empId: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };
  // Send assignment
  const handleSendAssignment = async () => {
    if (selectedEmployeeIds.length === 0) {
      showToast({ message: t('noEmployeesSelected'), type: 'error' });
      return;
    }
    if (!address.trim() || !description.trim()) {
      showToast({ message: t('fillAssignmentFields'), type: 'error' });
      return;
    }
    setSending(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');
      const selectedDate = parseDateString(dateText);
      // Build employee names map for display
      const employeeNames: Record<string, string> = {};
      selectedEmployeeIds.forEach(eid => {
        const emp = employees.find(e => e.id === eid);
        if (emp) employeeNames[eid] = emp.name;
      });
      await addDoc(collection(db, 'assignments'), {
        employerId: user.uid,
        employeeIds: selectedEmployeeIds,
        employeeNames: employeeNames,
        address: address.trim(),
        description: description.trim(),
        date: selectedDate,
        dateString: format(selectedDate, 'dd.MM.yyyy'),
        createdAt: serverTimestamp(),
        confirmations: {},
      });
      // Send push notifications to each selected employee
      const title = t('newAssignmentNotifTitle') || 'Nowy adres i zadanie!';
      const body = (t('newAssignmentNotifBody') || 'Masz nowe zadanie na {date} pod adresem {address}')
        .replace('{date}', format(selectedDate, 'dd.MM.yyyy'))
        .replace('{address}', address.trim());
      selectedEmployeeIds.forEach(eid => {
        notifyUser(eid, title, body, { url: '/(tabs)' });
      });
      showToast({ message: t('assignmentSentSuccess'), type: 'success' });
      setAddress('');
      setDescription('');
      setSelectedEmployeeIds([]);
      setDateText(format(new Date(), 'dd.MM.yyyy'));
      setDateVal(new Date());
    } catch (error) {
      console.error('Error sending assignment:', error);
      showToast({ message: t('assignmentSendError'), type: 'error' });
    } finally {
      setSending(false);
    }
  };
  // Delete assignment handler
  const handleDeleteAssignment = (assignId: string) => {
    Alert.alert(
      t('deleteAssignmentTitle'),
      t('deleteAssignmentConfirm'),
      [
        { text: t('cancelBtn'), style: 'cancel' },
        {
          text: t('deleteAssignmentTitle'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'assignments', assignId));
              showToast({ message: t('deleteAssignmentSuccess'), type: 'success' });
            } catch (err) {
              console.error('Error deleting assignment:', err);
              showToast({ message: t('error'), type: 'error' });
            }
          }
        }
      ]
    );
  };
  // Open edit modal handler
  const openEditModal = (assign: any) => {
    setEditingAssignmentId(assign.id);
    setEditAddress(assign.address || '');
    setEditDescription(assign.description || '');
    setEditDateText(assign.dateString || format(new Date(), 'dd.MM.yyyy'));
    setEditDateVal(assign.dateObject || new Date());
    setEditSelectedEmployeeIds(assign.employeeIds || []);
    setIsEditModalVisible(true);
  };
  // Toggle employee in edit list
  const toggleEditEmployee = (empId: string) => {
    setEditSelectedEmployeeIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };
  // Save edited assignment
  const handleSaveEditAssignment = async () => {
    if (!editingAssignmentId) return;
    if (editSelectedEmployeeIds.length === 0) {
      showToast({ message: t('noEmployeesSelected'), type: 'error' });
      return;
    }
    if (!editAddress.trim() || !editDescription.trim()) {
      showToast({ message: t('fillAssignmentFields'), type: 'error' });
      return;
    }
    setSavingEdit(true);
    try {
      const selectedDate = parseDateString(editDateText);
      const employeeNames: Record<string, string> = {};
      editSelectedEmployeeIds.forEach(eid => {
        const emp = employees.find(e => e.id === eid);
        if (emp) employeeNames[eid] = emp.name;
      });
      const assignRef = doc(db, 'assignments', editingAssignmentId);
      await updateDoc(assignRef, {
        employeeIds: editSelectedEmployeeIds,
        employeeNames: employeeNames,
        address: editAddress.trim(),
        description: editDescription.trim(),
        date: selectedDate,
        dateString: format(selectedDate, 'dd.MM.yyyy'),
      });
      setIsEditModalVisible(false);
      showToast({ message: t('editAssignmentSuccess'), type: 'success' });
    } catch (error) {
      console.error('Error updating assignment:', error);
      showToast({ message: t('editAssignmentError'), type: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#0F172A' : '#F3F4F6' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }
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
          {t('tabAssignments')}
        </Text>
        <Text className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('assignmentTitle')}
        </Text>
      </View>
      {/* Assignment Form Card */}
      <View className={`card-premium mb-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`}>
        {/* Employee Selection */}
        <Text className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-700'}`}>
          {t('selectEmployees')}
        </Text>
        <View className="mb-5">
          {employees.length > 0 ? (
            employees.map(emp => {
              const isSelected = selectedEmployeeIds.includes(emp.id);
              return (
                <TouchableOpacity
                  key={emp.id}
                  onPress={() => toggleEmployee(emp.id)}
                  className={`flex-row items-center p-3 rounded-xl mb-2 border ${isSelected
                    ? 'bg-indigo-600 border-indigo-600'
                    : isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-300'
                    }`}
                >
                  <View className={`w-5 h-5 rounded-md border-2 mr-3 items-center justify-center ${isSelected
                    ? 'bg-white border-white'
                    : isDark ? 'border-slate-500' : 'border-gray-400'
                    }`}>
                    {isSelected && (
                      <IconSymbol name="checkmark.circle.fill" size={14} color="#4F46E5" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-bold ${isSelected ? 'text-white' : isDark ? 'text-white' : 'text-gray-800'}`}>
                      {emp.name}
                    </Text>
                    <Text className={`text-xs ${isSelected ? 'text-indigo-200' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {emp.email}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text className={`text-sm text-center py-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('noEmployeesPlaceholder')}
            </Text>
          )}
        </View>
        {/* Address */}
        <View className="mb-5">
          <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
            {t('assignmentAddress')}
          </Text>
          <TextInput
            className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
            placeholder={t('assignmentAddressPlaceholder')}
            placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
            value={address}
            onChangeText={setAddress}
          />
        </View>
        {/* Description */}
        <View className="mb-5">
          <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
            {t('assignmentDesc')}
          </Text>
          <TextInput
            className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
            placeholder={t('assignmentDescPlaceholder')}
            placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{ height: 100 }}
            value={description}
            onChangeText={setDescription}
          />
        </View>
        {/* Date */}
        <View className="mb-6">
          <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
            {t('assignmentDate')}
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
        {/* DatePicker Modals */}
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
        {/* Send Button */}
        <TouchableOpacity
          className="btn-primary mt-2 flex-row"
          onPress={handleSendAssignment}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="btn-primary-text">{t('sendAssignment')}</Text>
          )}
        </TouchableOpacity>
      </View>
      {/* Assignment History */}
      <Text className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'text-slate-400' : 'text-gray-600'} mb-3`}>
        {t('assignmentHistory')} ({assignments.length})
      </Text>
      {assignments.length > 0 ? (
        assignments.map((assign) => {
          const empIds = assign.employeeIds || [];
          const empNames = assign.employeeNames || {};
          const confirmations = assign.confirmations || {};
          return (
            <View
              key={assign.id}
              className={`rounded-2xl p-4 mb-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300 shadow-sm'}`}
            >
              {/* Header: Address + Date */}
              <View className={`flex-row justify-between items-start mb-3 border-b pb-2 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center mb-1">
                    <IconSymbol name="location.fill" size={14} color="#4F46E5" />
                    <Text className={`text-lg font-bold ml-1 ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={2}>
                      {assign.address}
                    </Text>
                  </View>
                  <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {assign.dateString}
                  </Text>
                </View>
                {/* Actions: Edit & Delete */}
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => openEditModal(assign)}
                    className={`p-2 rounded-lg ${isDark ? 'bg-indigo-950/50' : 'bg-indigo-100'}`}
                  >
                    <IconSymbol name="pencil" size={16} color="#4F46E5" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteAssignment(assign.id)}
                    className={`p-2 rounded-lg ${isDark ? 'bg-red-950/50' : 'bg-red-100'}`}
                  >
                    <IconSymbol name="trash.fill" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              {/* Description */}
              <Text className={`text-sm leading-5 mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {assign.description}
              </Text>
              {/* Employee confirmations */}
              <View className={`p-3 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                {empIds.map((eid: string) => {
                  const isConfirmed = confirmations[eid]?.confirmed === true;
                  return (
                    <View key={eid} className="flex-row items-center justify-between py-1.5">
                      <Text className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        {empNames[eid] || eid}
                      </Text>
                      <View className="flex-row items-center">
                        <IconSymbol
                          name={isConfirmed ? "checkmark.circle.fill" : "clock"}
                          size={14}
                          color={isConfirmed ? '#22C55E' : '#F59E0B'}
                        />
                        <Text
                          className={`text-xs font-bold ml-1 ${isConfirmed ? 'text-green-500' : 'text-amber-500'}`}
                        >
                          {isConfirmed ? t('confirmed') : t('awaitingConfirmation')}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })
      ) : (
        <View className={`rounded-2xl p-6 items-center border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`}>
          <Text className="text-sm text-slate-400 text-center">{t('noAssignments')}</Text>
        </View>
      )}
      {/* Edit Assignment Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className={`p-6 pb-10 rounded-t-3xl max-h-[85%] ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('editAssignmentTitle')}
              </Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <IconSymbol name="xmark" size={24} color={isDark ? '#FFFFFF' : '#0F172A'} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Employee Selection */}
              <Text className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                {t('selectEmployees')}
              </Text>
              <View className="mb-5">
                {employees.length > 0 ? (
                  employees.map(emp => {
                    const isSelected = editSelectedEmployeeIds.includes(emp.id);
                    return (
                      <TouchableOpacity
                        key={emp.id}
                        onPress={() => toggleEditEmployee(emp.id)}
                        className={`flex-row items-center p-3 rounded-xl mb-2 border ${isSelected
                          ? 'bg-indigo-600 border-indigo-600'
                          : isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-300'
                          }`}
                      >
                        <View className={`w-5 h-5 rounded-md border-2 mr-3 items-center justify-center ${isSelected
                          ? 'bg-white border-white'
                          : isDark ? 'border-slate-500' : 'border-gray-400'
                          }`}>
                          {isSelected && (
                            <IconSymbol name="checkmark.circle.fill" size={14} color="#4F46E5" />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className={`text-sm font-bold ${isSelected ? 'text-white' : isDark ? 'text-white' : 'text-gray-800'}`}>
                            {emp.name}
                          </Text>
                          <Text className={`text-xs ${isSelected ? 'text-indigo-200' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {emp.email}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text className={`text-sm text-center py-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t('noEmployeesPlaceholder')}
                  </Text>
                )}
              </View>
              {/* Address */}
              <View className="mb-5">
                <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                  {t('assignmentAddress')}
                </Text>
                <TextInput
                  className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                  placeholder={t('assignmentAddressPlaceholder')}
                  placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                  value={editAddress}
                  onChangeText={setEditAddress}
                />
              </View>
              {/* Description */}
              <View className="mb-5">
                <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                  {t('assignmentDesc')}
                </Text>
                <TextInput
                  className={`border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                  placeholder={t('assignmentDescPlaceholder')}
                  placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ height: 100 }}
                  value={editDescription}
                  onChangeText={setEditDescription}
                />
              </View>
              {/* Date */}
              <View className="mb-6">
                <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                  {t('assignmentDate')}
                </Text>
                <View className="flex-row items-center">
                  <TextInput
                    className={`flex-1 border rounded-xl p-4 text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    placeholder="DD.MM.YYYY"
                    placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
                    value={editDateText}
                    onChangeText={setEditDateText}
                  />
                  <TouchableOpacity
                    onPress={() => setShowEditDatePicker(true)}
                    className={`ml-3 p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-300'}`}
                  >
                    <IconSymbol name="calendar" size={20} color="#4F46E5" />
                  </TouchableOpacity>
                </View>
              </View>
              {/* Custom Edit DatePicker Modal */}
              <CustomDatePicker
                visible={showEditDatePicker}
                value={editDateVal}
                onClose={() => setShowEditDatePicker(false)}
                onChange={(selectedDate) => {
                  setEditDateVal(selectedDate);
                  setEditDateText(format(selectedDate, 'dd.MM.yyyy'));
                }}
              />
              {/* Save / Cancel Buttons */}
              <View className="flex-row justify-between items-center mt-2 gap-3">
                <TouchableOpacity
                  className={`flex-1 py-4 rounded-2xl items-center border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-300'}`}
                  onPress={() => setIsEditModalVisible(false)}
                >
                  <Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-700'}`}>
                    {t('cancelBtn')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-4 bg-indigo-600 rounded-2xl items-center"
                  onPress={handleSaveEditAssignment}
                  disabled={savingEdit}
                >
                  {savingEdit ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-bold text-base">
                      {t('saveBtn')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView >
  );
}