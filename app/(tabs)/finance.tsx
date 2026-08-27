import React, { useMemo } from 'react';
import { View, Text, ScrollView, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useAppContext } from '@/lib/app-context';
import { isThisMonth } from '@/lib/storage';

export default function FinanceScreen() {
  const { data } = useAppContext();

  const stats = useMemo(() => {
    // Private students revenue — uses each session's own recorded price first,
    // falling back to the student's current price only if a session has none.
    const privateRevenue = data.privateStudents.reduce((sum, student) => {
      const sessions = data.sessions.filter(
        s => s.type === 'private' && s.studentId === student.id && isThisMonth(s.date) && s.status === 'done' && !s.archived
      );
      return sum + sessions.reduce((sSum, s) => sSum + parseFloat(s.price || student.price || '0'), 0);
    }, 0);

    // Institutes revenue
    const institutesRevenue = data.institutes.reduce((sum, institute) => {
      const sessions = data.sessions.filter(
        s => s.type === 'institute' && s.instituteId === institute.id && isThisMonth(s.date) && s.status === 'done'
      );
      return sum + sessions.reduce((instSum, s) => instSum + parseFloat(s.price || institute.defaultPrice || '0'), 0);
    }, 0);

    const totalRevenue = privateRevenue + institutesRevenue;

    // Private students breakdown
    const privateBreakdown = data.privateStudents.map(student => {
      const sessions = data.sessions.filter(
        s => s.type === 'private' && s.studentId === student.id && isThisMonth(s.date) && s.status === 'done' && !s.archived
      );
      const revenue = sessions.reduce((sum, s) => sum + parseFloat(s.price || student.price || '0'), 0);
      return { student, sessions: sessions.length, revenue };
    }).filter(item => item.revenue > 0);

    // Institutes breakdown
    const institutesBreakdown = data.institutes.map(institute => {
      const sessions = data.sessions.filter(
        s => s.type === 'institute' && s.instituteId === institute.id && isThisMonth(s.date) && s.status === 'done'
      );
      const cancelledSessions = data.sessions.filter(
        s => s.type === 'institute' && s.instituteId === institute.id && isThisMonth(s.date) && s.status === 'cancel'
      );
      const revenue = sessions.reduce((sum, s) => sum + parseFloat(s.price || institute.defaultPrice || '0'), 0);
      return { institute, sessions: sessions.length, cancelledSessions: cancelledSessions.length, revenue };
    }).filter(item => item.revenue > 0 || item.sessions > 0);

    return { privateRevenue, institutesRevenue, totalRevenue, privateBreakdown, institutesBreakdown };
  }, [data]);

  return (
    <ScreenContainer className="bg-[#0d0f1a]">
      <ScrollView className="flex-1">
        {/* Header with Total */}
        <View className="bg-gradient-to-br from-[#1e1650] to-[#1a2040] border border-[#7c6efa] rounded-2xl mx-4 mt-4 p-6 items-center">
          <Text className="text-xs text-[#b39dff] mb-2">إجمالي هذا الشهر</Text>
          <Text className="text-4xl font-bold text-white">{stats.totalRevenue.toFixed(3)}</Text>
          <Text className="text-sm text-[#a0a4c0] mt-2">دينار كويتي</Text>
        </View>

        {/* Private Students Section */}
        <View className="px-4 mt-6">
          <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-3">
            الطلاب الخصوصيين
          </Text>

          {stats.privateBreakdown.length === 0 ? (
            <View className="bg-[#181b2e] border border-[#1e2138] rounded-2xl p-4 items-center">
              <Text className="text-xs text-[#a0a4c0]">لا يوجد طلاب خصوصيين هذا الشهر</Text>
            </View>
          ) : (
            <View className="bg-[#181b2e] border border-[#1e2138] rounded-2xl overflow-hidden">
              {stats.privateBreakdown.map((item, index) => (
                <View
                  key={item.student.id}
                  className={`px-4 py-3 flex-row items-center justify-between ${
                    index !== stats.privateBreakdown.length - 1 ? 'border-b border-[#1e2138]' : ''
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-sm text-[#eceef8]">{item.student.name}</Text>
                    <Text className="text-xs text-[#a0a4c0] mt-1">
                      {item.sessions} حصة × {item.student.price} د.ك
                    </Text>
                  </View>
                  <Text className="text-sm font-bold text-[#34d399]">{item.revenue.toFixed(3)} د.ك</Text>
                </View>
              ))}

              {/* Private Total */}
              <View className="px-4 py-3 bg-[#111320] flex-row items-center justify-between border-t border-[#1e2138]">
                <Text className="text-sm font-bold text-[#eceef8]">إجمالي الخصوصي</Text>
                <Text className="text-sm font-bold text-[#b39dff]">{stats.privateRevenue.toFixed(3)} د.ك</Text>
              </View>
            </View>
          )}
        </View>

        {/* Institutes Section */}
        <View className="px-4 mt-6 pb-6">
          <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-3">
            المعاهد
          </Text>

          {stats.institutesBreakdown.length === 0 ? (
            <View className="bg-[#181b2e] border border-[#1e2138] rounded-2xl p-4 items-center">
              <Text className="text-xs text-[#a0a4c0]">لا يوجد معاهد هذا الشهر</Text>
            </View>
          ) : (
            <View>
              {stats.institutesBreakdown.map((item) => (
                <View key={item.institute.id} className="bg-[#181b2e] border border-[#1e2138] rounded-2xl p-4 mb-3">
                  <Text className="text-sm font-bold text-[#eceef8] mb-3">🏫 {item.institute.name}</Text>

                  <View className="flex-row gap-3 mb-3">
                    <View className="flex-1 bg-[#111320] rounded-lg p-2 items-center">
                      <Text className="text-lg font-bold text-[#34d399]">{item.sessions}</Text>
                      <Text className="text-xs text-[#a0a4c0] mt-1">مكتملة</Text>
                    </View>
                    <View className="flex-1 bg-[#111320] rounded-lg p-2 items-center">
                      <Text className="text-lg font-bold text-[#f87171]">{item.cancelledSessions}</Text>
                      <Text className="text-xs text-[#a0a4c0] mt-1">ملغاة</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between border-t border-[#1e2138] pt-3">
                    <Text className="text-xs text-[#a0a4c0]">الإجمالي المستحق</Text>
                    <Text className="text-sm font-bold text-[#b39dff]">{item.revenue.toFixed(3)} د.ك</Text>
                  </View>
                </View>
              ))}

              {/* Institutes Total */}
              <View className="bg-[#111320] border border-[#1e2138] rounded-2xl px-4 py-3 flex-row items-center justify-between">
                <Text className="text-sm font-bold text-[#eceef8]">إجمالي المعاهد</Text>
                <Text className="text-sm font-bold text-[#b39dff]">{stats.institutesRevenue.toFixed(3)} د.ك</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
