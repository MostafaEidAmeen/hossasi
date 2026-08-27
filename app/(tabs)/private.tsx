import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, FlatList, Linking } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useAppContext } from '@/lib/app-context';
import {
  PrivateStudent,
  isThisMonth,
  expectedThisMonth,
  paidInCurrentMonth,
  countDonePrivateSessions,
  buildMonthlyReportMessage,
  getWhatsAppUrl,
  getThisMonthLabel,
} from '@/lib/storage';
import { AddPrivateStudentModal } from '@/components/modals/add-private-student';
import { RecordPaymentModal } from '@/components/modals/record-payment';
import { HomeworkModal } from '@/components/modals/homework';
import { ToastContainer, useToast } from '@/components/toast';

export default function PrivateStudentsScreen() {
  const { data } = useAppContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<PrivateStudent | undefined>(undefined);
  const [paymentTarget, setPaymentTarget] = useState<{ type: 'private' | 'institute'; id: string; name: string } | null>(null);
  const [homeworkTarget, setHomeworkTarget] = useState<{ type: 'private' | 'institute'; id: string; name: string; phone?: string } | null>(null);
  const { toasts, showToast, removeToast } = useToast();

  const shouldShowReportsButton = () => {
    const s = data.settings;
    if (!s || !s.reportsButtonEnabled) return false;
    return new Date().getDate() >= (s.reportsButtonDay || 1);
  };

  const sendReport = (student: PrivateStudent) => {
    if (!student.phone) {
      showToast('لا يوجد رقم واتساب محفوظ', 'error');
      return;
    }
    const doneCount = countDonePrivateSessions(data, student.id);
    const expected = expectedThisMonth(data, 'private', student.id);
    const paid = paidInCurrentMonth(student);
    const message = buildMonthlyReportMessage({
      studentName: student.name,
      monthLabel: getThisMonthLabel(),
      doneCount,
      expected,
      paid,
    });
    Linking.openURL(getWhatsAppUrl(student.phone, message, data.settings?.waCountryCode)).catch(() => {
      showToast('تعذر فتح واتساب', 'error');
    });
  };

  const studentStats = useMemo(() => {
    return data.privateStudents.map(student => {
      const completedSessions = data.sessions.filter(
        s => s.type === 'private' && s.studentId === student.id && isThisMonth(s.date) && s.status === 'done' && !s.archived
      ).length;
      const target = student.target || 8;
      const isCompleted = completedSessions >= target;
      return { student, completedSessions, target, isCompleted };
    });
  }, [data]);

  const openAddModal = () => {
    setEditingStudent(undefined);
    setModalVisible(true);
  };

  const openEditModal = (student: PrivateStudent) => {
    setEditingStudent(student);
    setModalVisible(true);
  };

  const renderStudent = ({ item }: { item: typeof studentStats[0] }) => {
    const { student, completedSessions, target, isCompleted } = item;
    const dots = Array.from({ length: target }, (_, i) => i);

    return (
      <Pressable
        onPress={() => openEditModal(student)}
        className="bg-[#181b2e] border border-[#1e2138] rounded-2xl p-4 mb-3 active:border-[#7c6efa] active:scale-98"
      >
        <View className="flex-row items-center gap-3 mb-3">
          <View className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7c6efa] to-[#b39dff] items-center justify-center">
            <Text className="text-lg font-bold text-white">{student.name.charAt(0)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-[#eceef8]">{student.name}</Text>
            <Text className="text-xs text-[#a0a4c0] mt-1">
              {student.grade} · {student.price} د.ك/حصة
            </Text>
          </View>
          <View className="items-center">
            <Text className={`text-2xl font-bold ${isCompleted ? 'text-[#34d399]' : 'text-[#b39dff]'}`}>
              {completedSessions}
            </Text>
            <Text className="text-xs text-[#a0a4c0]">/ {target}</Text>
            <Text className="text-xs text-[#636685]">حصة</Text>
          </View>
        </View>

        <View className="flex-row gap-1 mb-3 flex-wrap">
          {dots.map((i) => (
            <View
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i < completedSessions
                  ? 'bg-[#34d399]'
                  : i === completedSessions && !isCompleted
                  ? 'bg-[#7c6efa]'
                  : 'bg-[#252944]'
              }`}
              style={{ maxWidth: `${100 / target}%` }}
            />
          ))}
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-[#a0a4c0]">
            {student.phone ? `📞 ${student.phone}` : 'اضغط لتعديل البيانات'}
          </Text>
          {isCompleted ? (
            <View className="bg-[#34d399] rounded-lg px-3 py-1">
              <Text className="text-xs font-bold text-white">✅ اكتمل الهدف</Text>
            </View>
          ) : (
            <View className="bg-[#7c6efa] bg-opacity-25 rounded-lg px-3 py-1">
              <Text className="text-xs font-bold text-[#b39dff]">
                باقي {target - completedSessions}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-[#1e2138]">
          <Text className="text-[11px] text-[#a0a4c0]">
            💰 مدفوع: {paidInCurrentMonth(student).toFixed(3)} / {expectedThisMonth(data, 'private', student.id).toFixed(3)} د.ك
          </Text>
          <View className="flex-row gap-2">
            {shouldShowReportsButton() && student.phone && (
              <Pressable
                onPress={() => sendReport(student)}
                className="bg-[#25D366] bg-opacity-20 border border-[#25D366] rounded-full px-2 py-1"
              >
                <Text className="text-[10px] font-bold text-[#25D366]">📤 تقرير</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setPaymentTarget({ type: 'private', id: student.id, name: student.name })}
              className="bg-[#34d399] bg-opacity-20 border border-[#34d399] rounded-full px-2 py-1"
            >
              <Text className="text-[10px] font-bold text-[#34d399]">💳 تسجيل دفع</Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-row justify-end mt-2">
          <Pressable
            onPress={() =>
              setHomeworkTarget({ type: 'private', id: student.id, name: student.name, phone: student.phone })
            }
            className="bg-[#7c6efa] bg-opacity-20 border border-[#7c6efa] rounded-full px-3 py-1"
          >
            <Text className="text-[10px] font-bold text-[#b39dff]">📝 واجب</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer className="bg-[#0d0f1a]">
      <View className="bg-gradient-to-br from-[#181b2e] to-[#1e2138] border-b border-[#1e2138] px-4 py-4">
        <Text className="text-2xl font-bold text-[#eceef8]">الطلاب الخصوصيين</Text>
        <Text className="text-xs text-[#a0a4c0] mt-1">
          {data.privateStudents.length} طالب
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {studentStats.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-4xl mb-3">👤</Text>
            <Text className="text-base font-bold text-[#eceef8]">لا يوجد طلاب خصوصيين</Text>
            <Text className="text-xs text-[#a0a4c0] mt-2">أضف طالب بالضغط على الزر +</Text>
          </View>
        ) : (
          <FlatList
            data={studentStats}
            renderItem={renderStudent}
            keyExtractor={item => item.student.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </ScrollView>

      <View className="px-4 pb-4">
        <Pressable
          onPress={openAddModal}
          className="bg-[#7c6efa] rounded-2xl py-4 items-center active:bg-[#6457e0] active:scale-95"
        >
          <Text className="text-white font-bold text-lg">+ إضافة طالب</Text>
        </Pressable>
      </View>

      <AddPrivateStudentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        student={editingStudent}
        onSuccess={() => {}}
      />

      <RecordPaymentModal
        visible={!!paymentTarget}
        target={paymentTarget}
        onClose={() => setPaymentTarget(null)}
      />

      <HomeworkModal
        visible={!!homeworkTarget}
        target={homeworkTarget}
        onClose={() => setHomeworkTarget(null)}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ScreenContainer>
  );
}
