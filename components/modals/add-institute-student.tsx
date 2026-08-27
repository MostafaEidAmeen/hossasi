import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { AppModal, FormField, FormButton } from '../modal';
import { useAppContext } from '@/lib/app-context';
import { useToast } from '../toast';
import { InstituteStudent, dayEnToAr } from '@/lib/storage';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AddInstituteStudentModalProps {
  visible: boolean;
  onClose: () => void;
  instituteId: string;
  student?: InstituteStudent;
  onSuccess?: () => void;
}

export function AddInstituteStudentModal({
  visible,
  onClose,
  instituteId,
  student,
  onSuccess,
}: AddInstituteStudentModalProps) {
  const { addInstituteStudent, updateInstituteStudent, deleteInstituteStudent, saveData } = useAppContext();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [phone, setPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (student) {
      setName(student.name);
      setGrade(student.grade || '');
      setPhone(student.phone || '');
      setParentPhone(student.parentPhone || '');
      setSelectedDays(student.days || []);
      setTime(student.time || '');
      setNotes(student.notes || '');
    } else {
      resetForm();
    }
  }, [visible, student]);

  const resetForm = () => {
    setName('');
    setGrade('');
    setPhone('');
    setParentPhone('');
    setSelectedDays([]);
    setTime('');
    setNotes('');
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('من فضلك أدخل اسم الطالب', 'error');
      return;
    }

    if (student) {
      updateInstituteStudent(instituteId, student.id, {
        name,
        grade,
        phone,
        parentPhone,
        days: selectedDays,
        time,
        notes,
      });
      showToast('تم تحديث بيانات الطالب', 'success');
    } else {
      addInstituteStudent(instituteId, {
        name,
        grade,
        phone,
        parentPhone,
        days: selectedDays,
        time,
        notes,
      });
      showToast('تمت إضافة الطالب بنجاح', 'success');
    }

    await saveData();
    resetForm();
    onClose();
    onSuccess?.();
  };

  const handleDelete = () => {
    if (!student) return;
    Alert.alert(
      'حذف الطالب',
      `هل تريد حذف ${student.name} من المعهد؟ سيتم حذف أي حصص خاصة به مربوطة بيه (حصص المجموعة العامة مش هتتأثر).`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            deleteInstituteStudent(instituteId, student.id);
            await saveData();
            showToast('تم حذف الطالب', 'success');
            onClose();
            onSuccess?.();
          },
        },
      ]
    );
  };

  return (
    <AppModal
      visible={visible}
      title={student ? 'تعديل بيانات الطالب' : 'إضافة طالب للمعهد'}
      onClose={onClose}
    >
      <View className="pb-6">
        <FormField label="اسم الطالب" value={name} onChangeText={setName} placeholder="أدخل اسم الطالب" />
        <FormField label="المرحلة الدراسية" value={grade} onChangeText={setGrade} placeholder="مثال: الصف الخامس" />
        <FormField label="رقم الهاتف (اختياري)" value={phone} onChangeText={setPhone} placeholder="أدخل رقم الهاتف" keyboardType="phone-pad" />
        <FormField
          label="رقم واتساب ولي الأمر (لإشعارات التأجيل/الإلغاء)"
          value={parentPhone}
          onChangeText={setParentPhone}
          placeholder="مثال: 966500000000"
          keyboardType="phone-pad"
        />

        <View className="mb-4">
          <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-2">
            أيام حصص الطالب (اختياري)
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {DAYS.map(day => (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                className={`px-3 py-2 rounded-lg border ${
                  selectedDays.includes(day)
                    ? 'bg-[#7c6efa] border-[#7c6efa]'
                    : 'bg-[#111320] border-[#1e2138]'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    selectedDays.includes(day) ? 'text-white' : 'text-[#a0a4c0]'
                  }`}
                >
                  {dayEnToAr(day)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <FormField label="وقت الحصة (اختياري)" value={time} onChangeText={setTime} placeholder="مثال: 17:00" />

        <FormField
          label="ملاحظات (اختياري)"
          value={notes}
          onChangeText={setNotes}
          placeholder="أي ملاحظات عن الطالب أو الحصص..."
          multiline
        />

        <FormButton title="حفظ" onPress={handleSave} variant="primary" />
        {student && <FormButton title="حذف الطالب" onPress={handleDelete} variant="danger" />}
        <FormButton title="إلغاء" onPress={onClose} variant="secondary" />
      </View>
    </AppModal>
  );
}
