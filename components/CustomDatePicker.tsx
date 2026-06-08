import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getYear, getMonth, getDate, setMonth, setYear } from 'date-fns';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { IconSymbol } from './ui/icon-symbol';
interface CustomDatePickerProps {
  visible: boolean;
  value: Date;
  onClose: () => void;
  onChange: (date: Date) => void;
}
export function CustomDatePicker({ visible, value, onClose, onChange }: CustomDatePickerProps) {
  const { isDark } = useAppTheme();
  const { language, t } = useLanguage();
  const [pickerDate, setPickerDate] = useState<Date>(value || new Date());
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
  const scrollViewRef = useRef<ScrollView>(null);
  // Sync internal state when visibility changes
  useEffect(() => {
    if (visible && value) {
      setPickerDate(value);
      setViewMode('days');
    }
  }, [visible, value]);
  // Handle year list scroll position to focus current selected year
  useEffect(() => {
    if (viewMode === 'years' && scrollViewRef.current) {
      const selectedYear = getYear(pickerDate);
      const currentYear = new Date().getFullYear();
      const endYear = currentYear + 20;
      const index = endYear - selectedYear;
      if (index >= 0) {
        // Approximate height of year tile is 54px, 3 items per row
        const row = Math.floor(index / 3);
        const yOffset = row * 54;
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: yOffset, animated: false });
        }, 50);
      }
    }
  }, [viewMode, pickerDate]);
  const daysOfWeek = language === 'pl'
    ? ['pn', 'wt', 'śr', 'cz', 'pt', 'so', 'nd']
    : ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'];
  const monthNames = language === 'pl'
    ? ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const shortMonthNames = language === 'pl'
    ? ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const getMonthLabel = () => {
    const m = getMonth(pickerDate);
    return monthNames[m];
  };
  const getYearLabel = () => {
    return getYear(pickerDate).toString();
  };
  // Generate Year range (currentYear - 80 to currentYear + 20)
  const getYearsList = () => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 80;
    const endYear = currentYear + 20;
    const list = [];
    for (let y = endYear; y >= startYear; y--) {
      list.push(y);
    }
    return list;
  };
  const handleSelectDay = (day: Date) => {
    setPickerDate(day);
  };
  const handleConfirm = () => {
    onChange(pickerDate);
    onClose();
  };
  // Aesthetics setup
  const bgMain = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-500';
  const bgHeader = isDark ? 'bg-slate-800/80 border-b border-slate-700/50' : 'bg-gray-50/80 border-b border-gray-100';
  const bgTile = isDark ? 'bg-slate-800' : 'bg-gray-100';
  const textTile = isDark ? 'text-slate-300' : 'text-gray-700';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View className={`w-full max-w-[340px] rounded-[28px] overflow-hidden shadow-2xl border ${bgMain}`}>
          {/* Header */}
          <View className={`px-5 py-4 flex-row justify-between items-center ${bgHeader}`}>
            <View className="flex-row items-center gap-1.5">
              <TouchableOpacity
                onPress={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                className={`flex-row items-center px-2 py-1.5 rounded-xl ${viewMode === 'months' ? 'bg-indigo-600/10' : ''}`}
              >
                <Text className={`font-bold text-base mr-1 ${viewMode === 'months' ? 'text-indigo-500' : textPrimary}`}>
                  {getMonthLabel()}
                </Text>
                <IconSymbol name="chevron.down" size={12} color={viewMode === 'months' ? '#4F46E5' : (isDark ? '#94A3B8' : '#6B7280')} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                className={`flex-row items-center px-2 py-1.5 rounded-xl ${viewMode === 'years' ? 'bg-indigo-600/10' : ''}`}
              >
                <Text className={`font-bold text-base mr-1 ${viewMode === 'years' ? 'text-indigo-500' : textPrimary}`}>
                  {getYearLabel()}
                </Text>
                <IconSymbol name="chevron.down" size={12} color={viewMode === 'years' ? '#4F46E5' : (isDark ? '#94A3B8' : '#6B7280')} />
              </TouchableOpacity>
            </View>
            {viewMode === 'days' && (
              <View className="flex-row items-center gap-1">
                <TouchableOpacity onPress={() => setPickerDate(subMonths(pickerDate, 1))} className="p-2 hover:bg-slate-700/20 rounded-full">
                  <IconSymbol name="chevron.left" size={20} color={isDark ? '#94A3B8' : '#4B5563'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPickerDate(addMonths(pickerDate, 1))} className="p-2 hover:bg-slate-700/20 rounded-full">
                  <IconSymbol name="chevron.right" size={20} color={isDark ? '#94A3B8' : '#4B5563'} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          {/* Body */}
          <View className="p-4 min-h-[305px] justify-center">
            {viewMode === 'days' && (
              <View className="w-full">
                {/* Week Day Labels */}
                <View className="flex-row justify-between mb-2">
                  {daysOfWeek.map(d => (
                    <Text key={d} className={`w-[40px] text-center text-xs font-bold ${textSecondary}`}>
                      {d.toUpperCase()}
                    </Text>
                  ))}
                </View>
                {/* Day Grid */}
                <View className="flex-row flex-wrap justify-start">
                  {(() => {
                    const start = startOfWeek(startOfMonth(pickerDate), { weekStartsOn: 1 });
                    const end = endOfWeek(endOfMonth(pickerDate), { weekStartsOn: 1 });
                    return eachDayOfInterval({ start, end }).map(day => {
                      const isCurrentMonth = isSameMonth(day, pickerDate);
                      const isSelected = isSameDay(day, pickerDate);
                      return (
                        <TouchableOpacity
                          key={day.toISOString()}
                          onPress={() => handleSelectDay(day)}
                          className={`w-[40px] h-[40px] items-center justify-center rounded-2xl my-0.5 ${isSelected ? 'bg-indigo-600 shadow-md shadow-indigo-600/30' : ''}`}
                        >
                          <Text className={`text-sm ${isSelected
                            ? 'text-white font-bold'
                            : isCurrentMonth
                              ? (isDark ? 'text-slate-200 font-medium' : 'text-gray-800 font-medium')
                              : (isDark ? 'text-slate-700' : 'text-gray-300')
                            }`}>
                            {getDate(day)}
                          </Text>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </View>
              </View>
            )}
            {viewMode === 'months' && (
              <View className="flex-row flex-wrap justify-between w-full px-1">
                {shortMonthNames.map((m, i) => {
                  const isSelected = getMonth(pickerDate) === i;
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => {
                        setPickerDate(setMonth(pickerDate, i));
                        setViewMode('days');
                      }}
                      className={`w-[30%] py-3.5 items-center rounded-2xl mb-3 border ${isSelected
                        ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-600/20'
                        : `${bgTile} ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`
                        }`}
                    >
                      <Text className={`font-semibold text-sm ${isSelected ? 'text-white' : textTile}`}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {viewMode === 'years' && (
              <ScrollView
                ref={scrollViewRef}
                className="max-h-[280px] w-full px-1"
                showsVerticalScrollIndicator={false}
              >
                <View className="flex-row flex-wrap justify-between pb-2">
                  {getYearsList().map(year => {
                    const isSelected = getYear(pickerDate) === year;
                    return (
                      <TouchableOpacity
                        key={year}
                        onPress={() => {
                          setPickerDate(setYear(pickerDate, year));
                          setViewMode('days');
                        }}
                        className={`w-[30%] py-3.5 items-center rounded-2xl mb-3 border ${isSelected
                          ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-600/20'
                          : `${bgTile} ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`
                          }`}
                      >
                        <Text className={`font-semibold text-sm ${isSelected ? 'text-white' : textTile}`}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
          {/* Footer Actions */}
          <View className={`p-4 flex-row justify-end gap-2 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
            <TouchableOpacity onPress={onClose} className="px-5 py-2.5 rounded-xl hover:bg-slate-700/15">
              <Text className="text-red-500 font-bold text-sm uppercase tracking-wider">{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} className="px-6 py-2.5 bg-indigo-600 rounded-xl shadow-md shadow-indigo-600/20">
              <Text className="text-white font-bold text-sm uppercase tracking-wider">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});