import { ScrollView, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAppContext } from '@/lib/app-context';
import { isThisMonth, getQuickSummary } from '@/lib/storage';

export default function HomeScreen() {
  const { data } = useAppContext();
  // Note: autosave is handled centrally in AppProvider (lib/app-context.tsx).

  const quickSummary = getQuickSummary(data);

  const totalRevenue = data.privateStudents.reduce((sum, student) => {
    const sessions = data.sessions.filter(
      s => s.type === 'private' && s.studentId === student.id && isThisMonth(s.date) && s.status === 'done' && !s.archived
    );
    return sum + sessions.reduce((sSum, s) => sSum + parseFloat(s.price || student.price || '0'), 0);
  }, 0) + data.institutes.reduce((sum, institute) => {
    const sessions = data.sessions.filter(
      s => s.type === 'institute' && s.instituteId === institute.id && isThisMonth(s.date) && s.status === 'done'
    );
    return sum + sessions.reduce((instSum, s) => instSum + parseFloat(s.price || institute.defaultPrice || '0'), 0);
  }, 0);

  const chartData = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const date = day.toISOString().slice(0, 10);
    const value = data.sessions
      .filter((session) => session.date === date && session.status === 'done' && !session.archived)
      .reduce((sum, session) => sum + Number(session.price || 0), 0);
    return { label: day.toLocaleDateString('ar', { weekday: 'short' }).replace('،', ''), value };
  });
  const maxChartValue = Math.max(...chartData.map((item) => item.value), 1);

  return (
    <ScreenContainer className="bg-[#0d0f1a]">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-4 pt-6 pb-8">
          {/* Welcome Header */}
          <View className="mb-6 flex-row items-start justify-between">
            <View>
              <Text className="text-3xl font-bold text-[#eceef8]">أهلاً بك</Text>
              <Text className="text-sm text-[#a0a4c0] mt-2">
                تابع حصصك وأرباحك من هنا
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/settings' as any)}
              className="w-11 h-11 rounded-full bg-[#181b2e] border border-[#1e2138] items-center justify-center active:opacity-70"
            >
              <Text className="text-lg">⚙️</Text>
            </Pressable>
          </View>

          {/* Quick Summary */}
          <View className="flex-row gap-2 mb-6">
            <View className="flex-1 bg-[#181b2e] border border-[#1e2138] rounded-xl py-3 items-center">
              <Text className="text-lg font-bold text-[#b39dff]">{quickSummary.totalStudents}</Text>
              <Text className="text-[10px] text-[#636685] mt-1">الطلاب</Text>
            </View>
            <View className="flex-1 bg-[#181b2e] border border-[#1e2138] rounded-xl py-3 items-center">
              <Text className="text-lg font-bold text-[#b39dff]">{quickSummary.totalGroups}</Text>
              <Text className="text-[10px] text-[#636685] mt-1">المجموعات</Text>
            </View>
            <View className="flex-1 bg-[#181b2e] border border-[#1e2138] rounded-xl py-3 items-center">
              <Text
                className="text-lg font-bold"
                style={{
                  color:
                    quickSummary.paidPercent >= 80
                      ? '#34d399'
                      : quickSummary.paidPercent >= 40
                      ? '#fbbf24'
                      : '#f87171',
                }}
              >
                {quickSummary.paidPercent}%
              </Text>
              <Text className="text-[10px] text-[#636685] mt-1">تحصيل الشهر</Text>
            </View>
            <View className="flex-1 bg-[#181b2e] border border-[#1e2138] rounded-xl py-3 items-center">
              <Text className="text-lg font-bold text-[#b39dff]">
                {quickSummary.todayAttendancePercent !== null ? `${quickSummary.todayAttendancePercent}%` : '—'}
              </Text>
              <Text className="text-[10px] text-[#636685] mt-1">حضور اليوم</Text>
            </View>
          </View>

          {/* Total Revenue Highlight */}
          <View className="bg-gradient-to-br from-[#1e1650] to-[#1a2040] border border-[#7c6efa] rounded-2xl p-4 flex-row items-center gap-4 mb-6">
            <View className="w-14 h-14 rounded-xl bg-[#b39dff] bg-opacity-20 items-center justify-center">
              <Text className="text-2xl">💰</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-[#b39dff]">إجمالي هذا الشهر</Text>
              <Text className="text-2xl font-bold text-white mt-1">{totalRevenue.toFixed(3)} د.ك</Text>
            </View>
          </View>

          {/* Interactive Weekly Revenue Chart */}
          <View className="bg-[#15182a] border border-[#282d4a] rounded-2xl p-4 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-sm font-bold text-white">أداء الإيرادات</Text>
                <Text className="text-xs text-[#8f95b5] mt-1">آخر 7 أيام — اضغط على اليوم للتفاصيل</Text>
              </View>
              <View className="w-10 h-10 rounded-xl bg-[#7c6efa]/20 items-center justify-center">
                <Text className="text-lg">📈</Text>
              </View>
            </View>
            <View className="h-32 flex-row items-end justify-between gap-2">
              {chartData.map((item) => (
                <Pressable key={item.label} className="flex-1 items-center justify-end" style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}>
                  <View className="w-full items-center justify-end h-24">
                    <View className="w-5 rounded-t-lg bg-[#7c6efa]" style={{ height: Math.max(item.value > 0 ? (item.value / maxChartValue) * 88 : 5, 5) }} />
                  </View>
                  <Text className="text-[10px] text-[#8f95b5] mt-2">{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Weekly Schedule Shortcut */}
          <Pressable
            onPress={() => router.push('/schedule' as any)}
            className="bg-gradient-to-br from-[#181b2e] to-[#1e2138] border border-[#1e2138] rounded-2xl p-4 flex-row items-center gap-4 active:opacity-80"
          >
            <View className="w-14 h-14 rounded-xl bg-[#60a5fa] bg-opacity-20 items-center justify-center">
              <Text className="text-2xl">📅</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-white">الجدول الأسبوعي</Text>
              <Text className="text-xs text-[#a0a4c0] mt-1">اعرض كل المواعيد المتكررة حسب اليوم</Text>
            </View>
            <Text className="text-[#a0a4c0] text-lg">←</Text>
          </Pressable>

          {/* Daily Tracking Shortcut */}
          <Pressable
            onPress={() => router.push('/daily-tracking' as any)}
            className="bg-gradient-to-br from-[#181b2e] to-[#1e2138] border border-[#1e2138] rounded-2xl p-4 flex-row items-center gap-4 active:opacity-80 mt-3"
          >
            <View className="w-14 h-14 rounded-xl bg-[#34d399] bg-opacity-20 items-center justify-center">
              <Text className="text-2xl">📋</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-white">المتابعة اليومية</Text>
              <Text className="text-xs text-[#a0a4c0] mt-1">حضور، واجب، تسميع، امتحانات، وتفاعل لكل الطلاب</Text>
            </View>
            <Text className="text-[#a0a4c0] text-lg">←</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
