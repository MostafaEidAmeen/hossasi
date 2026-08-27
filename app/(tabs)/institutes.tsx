import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useAppContext } from '@/lib/app-context';
import { Institute, isThisMonth, dayEnToAr } from '@/lib/storage';
import { AddInstituteModal } from '@/components/modals/add-institute';
import { InstituteDetailModal } from '@/components/modals/institute-detail';
import { ExcelImportModal } from '@/components/modals/excel-import';
import { ToastContainer, useToast } from '@/components/toast';

export default function InstitutesScreen() {
  const { data } = useAppContext();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [detailInstitute, setDetailInstitute] = useState<Institute | undefined>(undefined);
  const { toasts, showToast, removeToast } = useToast();

  const instituteStats = useMemo(() => {
    return data.institutes.map(institute => {
      const completedSessions = data.sessions.filter(
        s => s.type === 'institute' && s.instituteId === institute.id && isThisMonth(s.date) && s.status === 'done'
      );
      const cancelledSessions = data.sessions.filter(
        s => s.type === 'institute' && s.instituteId === institute.id && isThisMonth(s.date) && s.status === 'cancel'
      );
      const totalRevenue = completedSessions.reduce(
        (sum, s) => sum + parseFloat(s.price || institute.defaultPrice || '0'),
        0
      );
      return { institute, completedSessions, cancelledSessions, totalRevenue };
    });
  }, [data]);

  const renderInstitute = ({ item }: { item: typeof instituteStats[0] }) => {
    const { institute, completedSessions, cancelledSessions, totalRevenue } = item;

    return (
      <Pressable
        onPress={() => setDetailInstitute(institute)}
        className="bg-[#181b2e] border border-[#1e2138] rounded-2xl p-4 mb-3 active:border-[#7c6efa] active:scale-98"
      >
        <View className="flex-row items-center gap-3 mb-3">
          <View className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7c6efa] to-[#b39dff] items-center justify-center">
            <Text className="text-2xl">{institute.groupType === 'own' ? '👥' : '🏫'}</Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-bold text-[#eceef8]">{institute.name}</Text>
              <View className={`rounded-full px-2 py-0.5 ${institute.groupType === 'own' ? 'bg-[#60a5fa] bg-opacity-20' : 'bg-[#7c6efa] bg-opacity-20'}`}>
                <Text className={`text-[10px] font-bold ${institute.groupType === 'own' ? 'text-[#60a5fa]' : 'text-[#b39dff]'}`}>
                  {institute.groupType === 'own' ? 'مجموعتي' : 'معهد'}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-[#a0a4c0] mt-1">
              {institute.defaultPrice} د.ك/حصة · {institute.students.length} طالب
            </Text>
          </View>
          <Text className="text-xs text-[#636685]">التفاصيل ›</Text>
        </View>

        {institute.days && institute.days.length > 0 && (
          <View className="flex-row gap-2 mb-3 flex-wrap">
            {institute.days.map((day, i) => (
              <View key={i} className="bg-[#252944] rounded-full px-2 py-1">
                <Text className="text-xs text-[#a0a4c0]">{dayEnToAr(day)}</Text>
              </View>
            ))}
          </View>
        )}

        <View className="flex-row gap-3">
          <View className="flex-1 bg-[#111320] rounded-lg p-2 items-center">
            <Text className="text-lg font-bold text-[#34d399]">{completedSessions.length}</Text>
            <Text className="text-xs text-[#a0a4c0] mt-1">مكتملة</Text>
          </View>
          <View className="flex-1 bg-[#111320] rounded-lg p-2 items-center">
            <Text className="text-lg font-bold text-[#f87171]">{cancelledSessions.length}</Text>
            <Text className="text-xs text-[#a0a4c0] mt-1">ملغاة</Text>
          </View>
          <View className="flex-1 bg-[#111320] rounded-lg p-2 items-center">
            <Text className="text-lg font-bold text-[#b39dff]">{totalRevenue.toFixed(2)}</Text>
            <Text className="text-xs text-[#a0a4c0] mt-1">د.ك</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer className="bg-[#0d0f1a]">
      <View className="bg-gradient-to-br from-[#181b2e] to-[#1e2138] border-b border-[#1e2138] px-4 py-4">
        <Text className="text-2xl font-bold text-[#eceef8]">المعاهد والمجموعات</Text>
        <Text className="text-xs text-[#a0a4c0] mt-1">
          {data.institutes.length} مجموعة
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {instituteStats.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-4xl mb-3">🏫</Text>
            <Text className="text-base font-bold text-[#eceef8]">لا يوجد معاهد أو مجموعات</Text>
            <Text className="text-xs text-[#a0a4c0] mt-2">أضف واحدة يدويًا أو استوردها من إكسل</Text>
          </View>
        ) : (
          <FlatList
            data={instituteStats}
            renderItem={renderInstitute}
            keyExtractor={item => item.institute.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </ScrollView>

      <View className="px-4 pb-4 gap-2">
        <Pressable
          onPress={() => setAddModalVisible(true)}
          className="bg-[#7c6efa] rounded-2xl py-4 items-center active:bg-[#6457e0] active:scale-95"
        >
          <Text className="text-white font-bold text-lg">+ إضافة معهد أو مجموعة</Text>
        </Pressable>
        <Pressable
          onPress={() => setImportModalVisible(true)}
          className="bg-[#181b2e] border border-[#1e2138] rounded-2xl py-3 items-center active:opacity-80"
        >
          <Text className="text-[#a0a4c0] font-bold text-sm">📥 استيراد مجموعات من إكسل</Text>
        </Pressable>
      </View>

      <AddInstituteModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSuccess={() => {}}
      />

      <InstituteDetailModal
        visible={!!detailInstitute}
        onClose={() => setDetailInstitute(undefined)}
        institute={detailInstitute}
      />

      <ExcelImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ScreenContainer>
  );
}
