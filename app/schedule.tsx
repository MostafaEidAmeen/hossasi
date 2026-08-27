import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAppContext } from '@/lib/app-context';
import { WEEK_DAYS_EN, dayEnToAr } from '@/lib/storage';

interface ScheduleItem {
  id: string;
  name: string;
  time: string;
  type: 'private' | 'institute';
  meta: string;
}

export default function ScheduleScreen() {
  const { data } = useAppContext();

  const byDay = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};
    WEEK_DAYS_EN.forEach(d => (map[d] = []));

    data.institutes.forEach(inst => {
      (inst.days || []).forEach(day => {
        if (!map[day]) map[day] = [];
        map[day].push({
          id: `inst-${inst.id}-${day}`,
          name: inst.name,
          time: inst.time || '',
          type: 'institute',
          meta: `🏫 معهد · ${inst.students.length} طالب`,
        });
      });
      inst.students.forEach(student => {
        (student.days || []).forEach(day => {
          if (!map[day]) map[day] = [];
          map[day].push({
            id: `inst-student-${student.id}-${day}`,
            name: `${student.name} (${inst.name})`,
            time: student.time || '',
            type: 'institute',
            meta: `👤 طالب معهد${student.notes ? ' · 📝 ' + student.notes : ''}`,
          });
        });
      });
    });

    data.privateStudents.forEach(student => {
      (student.days || []).forEach(day => {
        if (!map[day]) map[day] = [];
        map[day].push({
          id: `priv-${student.id}-${day}`,
          name: student.name,
          time: student.time || '',
          type: 'private',
          meta: `👤 خاص · ${student.grade || ''}${student.notes ? ' · 📝 ' + student.notes : ''}`,
        });
      });
    });

    Object.keys(map).forEach(day => {
      map[day].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    });

    return map;
  }, [data.institutes, data.privateStudents]);

  const totalItems = Object.values(byDay).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <ScreenContainer className="bg-[#0d0f1a]">
      {/* Header */}
      <View className="bg-gradient-to-br from-[#181b2e] to-[#1e2138] border-b border-[#1e2138] px-4 py-4 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-[#111320] border border-[#1e2138] items-center justify-center active:opacity-70"
        >
          <Text className="text-[#a0a4c0] text-lg">→</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-[#eceef8]">📅 الجدول الأسبوعي</Text>
          <Text className="text-xs text-[#a0a4c0] mt-1">
            {totalItems > 0 ? `${totalItems} موعد متكرر` : 'حسب الأيام المحفوظة لكل معهد/طالب'}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        {totalItems === 0 ? (
          <View className="items-center justify-center py-16">
            <Text className="text-4xl mb-3">🗓️</Text>
            <Text className="text-base font-bold text-[#eceef8]">لا يوجد جدول متكرر بعد</Text>
            <Text className="text-xs text-[#a0a4c0] mt-2 text-center px-6">
              أضف أيام الحصص عند إنشاء أو تعديل معهد أو طالب خاص ليظهر هنا تلقائيًا
            </Text>
          </View>
        ) : (
          WEEK_DAYS_EN.map(day => {
            const items = byDay[day] || [];
            return (
              <View key={day} className="mb-5">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-bold text-[#b39dff]">{dayEnToAr(day)}</Text>
                  {items.length > 0 && (
                    <View className="bg-[#7c6efa] bg-opacity-20 rounded-full px-2 py-0.5">
                      <Text className="text-[10px] font-bold text-[#b39dff]">{items.length}</Text>
                    </View>
                  )}
                </View>

                {items.length === 0 ? (
                  <View className="bg-[#111320] border border-[#1e2138] rounded-xl px-4 py-3">
                    <Text className="text-xs text-[#636685]">لا توجد مواعيد</Text>
                  </View>
                ) : (
                  items.map(item => (
                    <View
                      key={item.id}
                      className="bg-[#181b2e] border border-[#1e2138] rounded-xl mb-2 p-3 flex-row items-center gap-3"
                    >
                      <View className="bg-[#111320] rounded-lg px-3 py-2 items-center min-w-[64px]">
                        <Text className="text-sm font-bold text-[#b39dff]">{item.time || '—'}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-[#eceef8]">{item.name}</Text>
                        <Text className="text-[11px] text-[#a0a4c0] mt-0.5">{item.meta}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
