import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { AppModal, FormField, FormButton } from '../modal';
import { useAppContext } from '@/lib/app-context';
import { useToast } from '../toast';
import { getTodayDate } from '@/lib/storage';
import { scheduleSessionReminders } from '@/lib/notifications';

interface AddSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddSessionModal({ visible, onClose, onSuccess }: AddSessionModalProps) {
  const { data, addSession, addPrivateStudent, saveData } = useAppContext();
  const { showToast } = useToast();

  const [sessionType, setSessionType] = useState<'private' | 'institute'>('private');
  const [studentId, setStudentId] = useState('');
  const [addingNewStudent, setAddingNewStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [instituteId, setInstituteId] = useState('');
  const [instStudentPickerOpen, setInstStudentPickerOpen] = useState(false);
  const [instStudentId, setInstStudentId] = useState('');
  const [time, setTime] = useState('16:00');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<'pending' | 'done' | 'cancel'>('pending');

  useEffect(() => {
    if (!visible) return;
    setInstStudentId('');
  }, [instituteId]);

  const handleSave = async () => {
    if (sessionType === 'private' && !addingNewStudent && !studentId) {
      showToast('من فضلك اختر طالباً أو أضف طالباً جديداً', 'error');
      return;
    }
    if (sessionType === 'private' && addingNewStudent && !newStudentName.trim()) {
      showToast('من فضلك أدخل اسم الطالب الجديد', 'error');
      return;
    }
    if (sessionType === 'institute' && !instituteId) {
      showToast('من فضلك اختر معهداً', 'error');
      return;
    }
    if (!time) {
      showToast('من فضلك أدخل الوقت', 'error');
      return;
    }
    if (!price) {
      showToast('من فضلك أدخل السعر', 'error');
      return;
    }

    if (sessionType === 'private') {
      let resolvedStudentId = studentId;
      let resolvedStudentName = '';

      if (addingNewStudent) {
        resolvedStudentId = addPrivateStudent({
          name: newStudentName.trim(),
          grade: '',
          address: '',
          phone: '',
          price,
          target: 8,
          days: [],
          time: '',
          notes: '',
        });
        resolvedStudentName = newStudentName.trim();
      } else {
        const student = data.privateStudents.find(s => s.id === studentId);
        if (!student) return;
        resolvedStudentName = student.name;
      }

      const newSession = addSession({
        date: getTodayDate(),
        time,
        type: 'private',
        studentId: resolvedStudentId,
        studentName: resolvedStudentName,
        price,
        status,
      });
      if (data.settings?.notifySessions) scheduleSessionReminders(newSession);
    } else {
      const institute = data.institutes.find(i => i.id === instituteId);
      if (!institute) return;

      const pickedStudent = instStudentId ? institute.students.find(s => s.id === instStudentId) : undefined;

      const newSession = addSession({
        date: getTodayDate(),
        time,
        type: 'institute',
        instituteId,
        instituteName: institute.name,
        studentId: pickedStudent?.id,
        studentName: pickedStudent?.name,
        price,
        status,
      });
      if (data.settings?.notifySessions) scheduleSessionReminders(newSession);
    }

    await saveData();
    showToast('تمت إضافة الحصة بنجاح', 'success');
    resetForm();
    onClose();
    onSuccess?.();
  };

  const resetForm = () => {
    setSessionType('private');
    setStudentId('');
    setAddingNewStudent(false);
    setNewStudentName('');
    setInstituteId('');
    setInstStudentPickerOpen(false);
    setInstStudentId('');
    setTime('16:00');
    setPrice('');
    setStatus('pending');
  };

  return (
    <AppModal visible={visible} title="إضافة حصة" onClose={onClose}>
      <View className="pb-6">
        {/* Session Type */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-2">
            نوع الحصة
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setSessionType('private')}
              className={`flex-1 py-2 rounded-lg border ${
                sessionType === 'private'
                  ? 'bg-[#7c6efa] border-[#7c6efa]'
                  : 'bg-[#111320] border-[#1e2138]'
              }`}
            >
              <Text
                className={`text-center font-semibold text-sm ${
                  sessionType === 'private' ? 'text-white' : 'text-[#a0a4c0]'
                }`}
              >
                طالب خاص
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSessionType('institute')}
              className={`flex-1 py-2 rounded-lg border ${
                sessionType === 'institute'
                  ? 'bg-[#7c6efa] border-[#7c6efa]'
                  : 'bg-[#111320] border-[#1e2138]'
              }`}
            >
              <Text
                className={`text-center font-semibold text-sm ${
                  sessionType === 'institute' ? 'text-white' : 'text-[#a0a4c0]'
                }`}
              >
                معهد
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Student/Institute Selection */}
        {sessionType === 'private' ? (
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider">
                الطالب
              </Text>
              <Pressable onPress={() => setAddingNewStudent(v => !v)}>
                <Text className="text-xs font-bold text-[#b39dff]">
                  {addingNewStudent ? '↩️ اختيار من الموجودين' : '➕ طالب جديد'}
                </Text>
              </Pressable>
            </View>

            {addingNewStudent ? (
              <FormField
                label=""
                value={newStudentName}
                onChangeText={setNewStudentName}
                placeholder="اسم الطالب الجديد"
              />
            ) : (
              <ScrollView className="bg-[#111320] border border-[#1e2138] rounded-xl max-h-48">
                {data.privateStudents.length === 0 ? (
                  <View className="px-4 py-3">
                    <Text className="text-xs text-[#636685]">لا يوجد طلاب — أضف بالاسم أعلاه</Text>
                  </View>
                ) : (
                  data.privateStudents.map(student => (
                    <Pressable
                      key={student.id}
                      onPress={() => setStudentId(student.id)}
                      className={`px-4 py-3 border-b border-[#1e2138] ${
                        studentId === student.id ? 'bg-[#7c6efa] bg-opacity-20' : ''
                      }`}
                    >
                      <Text className="text-sm text-[#eceef8] font-semibold">{student.name}</Text>
                      <Text className="text-xs text-[#a0a4c0] mt-1">{student.grade}</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        ) : (
          <View className="mb-4">
            <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-2">
              المعهد
            </Text>
            <ScrollView className="bg-[#111320] border border-[#1e2138] rounded-xl max-h-48 mb-3">
              {data.institutes.map(institute => (
                <Pressable
                  key={institute.id}
                  onPress={() => setInstituteId(institute.id)}
                  className={`px-4 py-3 border-b border-[#1e2138] ${
                    instituteId === institute.id ? 'bg-[#7c6efa] bg-opacity-20' : ''
                  }`}
                >
                  <Text className="text-sm text-[#eceef8] font-semibold">{institute.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {instituteId ? (
              <>
                <Pressable
                  onPress={() => setInstStudentPickerOpen(v => !v)}
                  className="flex-row items-center gap-2 mb-2"
                >
                  <View className="w-7 h-7 rounded-full bg-[#111320] border border-[#1e2138] items-center justify-center">
                    <Text className="text-xs">👤</Text>
                  </View>
                  <Text className="text-xs font-bold text-[#b39dff]">
                    اختيار طالب معيّن من المعهد (اختياري)
                  </Text>
                </Pressable>

                {instStudentPickerOpen && (
                  <ScrollView className="bg-[#111320] border border-[#1e2138] rounded-xl max-h-40 mb-2">
                    <Pressable
                      onPress={() => setInstStudentId('')}
                      className={`px-4 py-3 border-b border-[#1e2138] ${
                        instStudentId === '' ? 'bg-[#7c6efa] bg-opacity-20' : ''
                      }`}
                    >
                      <Text className="text-xs text-[#a0a4c0]">— بدون طالب محدد (حصة جماعية) —</Text>
                    </Pressable>
                    {data.institutes
                      .find(i => i.id === instituteId)
                      ?.students.map(st => (
                        <Pressable
                          key={st.id}
                          onPress={() => setInstStudentId(st.id)}
                          className={`px-4 py-3 border-b border-[#1e2138] ${
                            instStudentId === st.id ? 'bg-[#7c6efa] bg-opacity-20' : ''
                          }`}
                        >
                          <Text className="text-sm text-[#eceef8] font-semibold">{st.name}</Text>
                        </Pressable>
                      ))}
                  </ScrollView>
                )}
              </>
            ) : null}
          </View>
        )}

        <FormField
          label="الوقت"
          value={time}
          onChangeText={setTime}
          placeholder="مثال: 16:00"
        />

        <FormField
          label="السعر (د.ك)"
          value={price}
          onChangeText={setPrice}
          placeholder="مثال: 15.000"
          keyboardType="numeric"
        />

        {/* Status */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-2">
            الحالة
          </Text>
          <View className="flex-row gap-2">
            {(['pending', 'done', 'cancel'] as const).map(s => (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                className={`flex-1 py-2 rounded-lg border ${
                  status === s
                    ? 'bg-[#7c6efa] border-[#7c6efa]'
                    : 'bg-[#111320] border-[#1e2138]'
                }`}
              >
                <Text
                  className={`text-center font-semibold text-xs ${
                    status === s ? 'text-white' : 'text-[#a0a4c0]'
                  }`}
                >
                  {s === 'pending' ? 'قادمة' : s === 'done' ? 'مكتملة' : 'ملغاة'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <FormButton title="حفظ" onPress={handleSave} variant="primary" />
        <FormButton title="إلغاء" onPress={onClose} variant="secondary" />
      </View>
    </AppModal>
  );
}
