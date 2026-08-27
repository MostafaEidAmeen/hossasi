import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Linking } from 'react-native';
import { AppModal, FormButton } from '../modal';
import { useAppContext } from '@/lib/app-context';
import { useToast } from '../toast';
import {
  Institute,
  InstituteStudent,
  dayEnToAr,
  expectedThisMonth,
  paidInCurrentMonth,
  countDoneInstituteStudentSessions,
  buildMonthlyReportMessage,
  getWhatsAppUrl,
  getThisMonthLabel,
} from '@/lib/storage';
import { AddInstituteStudentModal } from './add-institute-student';
import { AddInstituteModal } from './add-institute';
import { RecordPaymentModal } from './record-payment';
import { HomeworkModal } from './homework';

interface InstituteDetailModalProps {
  visible: boolean;
  onClose: () => void;
  institute: Institute | undefined;
}

export function InstituteDetailModal({ visible, onClose, institute }: InstituteDetailModalProps) {
  const { data, deleteInstitute, saveData } = useAppContext();
  const { showToast } = useToast();

  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<InstituteStudent | undefined>(undefined);
  const [editInstituteVisible, setEditInstituteVisible] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{ type: 'private' | 'institute'; id: string; name: string } | null>(null);
  const [homeworkTarget, setHomeworkTarget] = useState<{ type: 'private' | 'institute'; id: string; name: string; phone?: string } | null>(null);

  if (!institute) return null;

  // Always read the freshest copy of the institute from context, since the
  // prop passed in can go stale after an edit/delete inside this modal.
  const liveInstitute = data.institutes.find(i => i.id === institute.id) || institute;

  const shouldShowReportsButton = () => {
    const s = data.settings;
    if (!s || !s.reportsButtonEnabled) return false;
    return new Date().getDate() >= (s.reportsButtonDay || 1);
  };

  const sendReport = (student: InstituteStudent) => {
    if (!student.parentPhone) {
      showToast('لا يوجد رقم واتساب محفوظ', 'error');
      return;
    }
    const doneCount = countDoneInstituteStudentSessions(data, student.id);
    const expected = expectedThisMonth(data, 'institute', student.id);
    const paid = paidInCurrentMonth(student);
    const message = buildMonthlyReportMessage({
      studentName: student.name,
      monthLabel: getThisMonthLabel(),
      doneCount,
      expected,
      paid,
    });
    Linking.openURL(getWhatsAppUrl(student.parentPhone, message, data.settings?.waCountryCode)).catch(() => {
      showToast('تعذر فتح واتساب', 'error');
    });
  };

  const openAddStudent = () => {
    setEditingStudent(undefined);
    setStudentModalVisible(true);
  };

  const openEditStudent = (student: InstituteStudent) => {
    setEditingStudent(student);
    setStudentModalVisible(true);
  };

  const handleDeleteInstitute = () => {
    Alert.alert('حذف المعهد', `هل تريد حذف "${liveInstitute.name}"؟ سيتم حذف كل الحصص المرتبطة به.`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          deleteInstitute(liveInstitute.id);
          await saveData();
          showToast('تم حذف المعهد', 'success');
          onClose();
        },
      },
    ]);
  };

  return (
    <>
      <AppModal visible={visible} title={liveInstitute.name} onClose={onClose}>
        <View className="pb-6">
          <View className="flex-row gap-2 mb-4">
            <Text className="text-xs text-[#a0a4c0]">
              {liveInstitute.defaultPrice} د.ك/حصة · {liveInstitute.students.length} طالب
            </Text>
          </View>

          {liveInstitute.days && liveInstitute.days.length > 0 && (
            <View className="flex-row gap-2 mb-4 flex-wrap">
              {liveInstitute.days.map((day, i) => (
                <View key={i} className="bg-[#252944] rounded-full px-2 py-1">
                  <Text className="text-xs text-[#a0a4c0]">{dayEnToAr(day)}</Text>
                </View>
              ))}
            </View>
          )}

          <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-2">
            الطلاب
          </Text>

          {liveInstitute.students.length === 0 ? (
            <View className="bg-[#111320] border border-[#1e2138] rounded-xl p-4 items-center mb-3">
              <Text className="text-xs text-[#a0a4c0]">لا يوجد طلاب بهذا المعهد بعد</Text>
            </View>
          ) : (
            <View className="mb-3">
              {liveInstitute.students.map(student => (
                <Pressable
                  key={student.id}
                  onPress={() => openEditStudent(student)}
                  className="bg-[#111320] border border-[#1e2138] rounded-xl p-3 mb-2 flex-row items-center justify-between active:border-[#7c6efa]"
                >
                  <View>
                    <Text className="text-sm font-semibold text-[#eceef8]">{student.name}</Text>
                    {(student.grade || student.phone) && (
                      <Text className="text-xs text-[#a0a4c0] mt-1">
                        {[student.grade, student.phone].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                    {student.days && student.days.length > 0 && (
                      <Text className="text-[11px] text-[#7c6efa] mt-1">
                        🗓️ {student.days.map(d => dayEnToAr(d)).join(' · ')}
                        {student.time ? ` — ${student.time}` : ''}
                      </Text>
                    )}
                    {student.notes && (
                      <Text className="text-[11px] text-[#636685] mt-1">📝 {student.notes}</Text>
                    )}
                    <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-[#1e2138]">
                      <Text className="text-[10px] text-[#a0a4c0]">
                        💰 {paidInCurrentMonth(student).toFixed(3)} / {expectedThisMonth(data, 'institute', student.id).toFixed(3)} د.ك
                      </Text>
                      <View className="flex-row gap-2">
                        {shouldShowReportsButton() && student.parentPhone && (
                          <Pressable
                            onPress={() => sendReport(student)}
                            className="bg-[#25D366] bg-opacity-20 border border-[#25D366] rounded-full px-2 py-1"
                          >
                            <Text className="text-[10px] font-bold text-[#25D366]">📤 تقرير</Text>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => setPaymentTarget({ type: 'institute', id: student.id, name: student.name })}
                          className="bg-[#34d399] bg-opacity-20 border border-[#34d399] rounded-full px-2 py-1"
                        >
                          <Text className="text-[10px] font-bold text-[#34d399]">💳 دفع</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View className="flex-row justify-end mt-2">
                      <Pressable
                        onPress={() =>
                          setHomeworkTarget({
                            type: 'institute',
                            id: student.id,
                            name: student.name,
                            phone: student.parentPhone,
                          })
                        }
                        className="bg-[#7c6efa] bg-opacity-20 border border-[#7c6efa] rounded-full px-3 py-1"
                      >
                        <Text className="text-[10px] font-bold text-[#b39dff]">📝 واجب</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text className="text-xs text-[#636685]">تعديل ›</Text>
                </Pressable>
              ))}
            </View>
          )}

          <FormButton title="+ إضافة طالب للمعهد" onPress={openAddStudent} variant="secondary" />

          <View className="h-4" />

          <FormButton title="✏️ تعديل بيانات المعهد" onPress={() => setEditInstituteVisible(true)} variant="secondary" />
          <FormButton title="🗑 حذف المعهد" onPress={handleDeleteInstitute} variant="danger" />
        </View>
      </AppModal>

      <AddInstituteStudentModal
        visible={studentModalVisible}
        onClose={() => setStudentModalVisible(false)}
        instituteId={liveInstitute.id}
        student={editingStudent}
      />

      <AddInstituteModal
        visible={editInstituteVisible}
        onClose={() => setEditInstituteVisible(false)}
        institute={liveInstitute}
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
    </>
  );
}
