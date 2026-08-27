import React from 'react';
import { View, Text, Pressable, ScrollView, Linking } from 'react-native';
import { AppModal } from '../modal';
import { useAppContext } from '@/lib/app-context';
import { useToast } from '../toast';
import {
  countDonePrivateSessions,
  countDoneInstituteStudentSessions,
  expectedThisMonth,
  paidInCurrentMonth,
  buildMonthlyReportMessage,
  getWhatsAppUrl,
  getThisMonthLabel,
} from '@/lib/storage';

interface MonthlyReportsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function MonthlyReportsModal({ visible, onClose }: MonthlyReportsModalProps) {
  const { data } = useAppContext();
  const { showToast } = useToast();

  const rows: { name: string; phone: string; message: string }[] = [];

  data.privateStudents.forEach(ps => {
    if (!ps.phone) return;
    const doneCount = countDonePrivateSessions(data, ps.id);
    const expected = expectedThisMonth(data, 'private', ps.id);
    const paid = paidInCurrentMonth(ps);
    rows.push({
      name: ps.name,
      phone: ps.phone,
      message: buildMonthlyReportMessage({
        studentName: ps.name,
        monthLabel: getThisMonthLabel(),
        doneCount,
        expected,
        paid,
      }),
    });
  });

  data.institutes.forEach(inst => {
    inst.students.forEach(st => {
      if (!st.parentPhone) return;
      const doneCount = countDoneInstituteStudentSessions(data, st.id);
      const expected = expectedThisMonth(data, 'institute', st.id);
      const paid = paidInCurrentMonth(st);
      rows.push({
        name: `${st.name} (${inst.name})`,
        phone: st.parentPhone,
        message: buildMonthlyReportMessage({
          studentName: st.name,
          monthLabel: getThisMonthLabel(),
          doneCount,
          expected,
          paid,
        }),
      });
    });
  });

  const send = (phone: string, message: string) => {
    Linking.openURL(getWhatsAppUrl(phone, message, data.settings?.waCountryCode)).catch(() => {
      showToast('تعذر فتح واتساب — تأكد من رقم الهاتف', 'error');
    });
  };

  return (
    <AppModal visible={visible} title="📤 إرسال تقارير الشهر" onClose={onClose}>
      {rows.length === 0 ? (
        <Text className="text-xs text-[#636685] text-center py-6">
          لا يوجد طلاب لديهم رقم واتساب محفوظ
        </Text>
      ) : (
        <ScrollView className="max-h-96">
          {rows.map(r => (
            <Pressable
              key={r.phone + r.name}
              onPress={() => send(r.phone, r.message)}
              className="flex-row items-center justify-between bg-[#181b2e] border border-[#25D366] rounded-lg px-4 py-3 mb-2 active:opacity-70"
            >
              <Text className="text-xs font-bold text-[#25D366]">إرسال ▶</Text>
              <Text className="text-sm text-[#eceef8]">{r.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </AppModal>
  );
}
