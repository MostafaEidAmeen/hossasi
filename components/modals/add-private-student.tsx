import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { AppModal, FormField, FormButton } from '../modal';
import { useAppContext } from '@/lib/app-context';
import { useToast } from '../toast';
import { PrivateStudent, dayEnToAr } from '@/lib/storage';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AddPrivateStudentModalProps {
  visible: boolean;
  onClose: () => void;
  student?: PrivateStudent;
  onSuccess?: () => void;
  onDeleted?: () => void;
}

export function AddPrivateStudentModal({
  visible,
  onClose,
  student,
  onSuccess,
  onDeleted,
}: AddPrivateStudentModalProps) {
  const { addPrivateStudent, updatePrivateStudent, deletePrivateStudent, saveData } = useAppContext();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [price, setPrice] = useState('');
  const [target, setTarget] = useState('8');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (student) {
      setName(student.name);
      setGrade(student.grade || '');
      setAddress(student.address || '');
      setPhone(student.phone || '');
      setPrice(student.price || '');
      setTarget(String(student.target || 8));
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
    setAddress('');
    setPhone('');
    setPrice('');
    setTarget('8');
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
    if (!price.trim()) {
      showToast('من فضلك أدخل سعر الحصة', 'error');
      return;
    }

    const targetNum = parseInt(target, 10) || 8;

    if (student) {
      updatePrivateStudent(student.id, {
        name,
        grade,
        address,
        phone,
        price,
        target: targetNum,
        days: selectedDays,
        time,
        notes,
      });
      showToast('تم تحديث بيانات الطالب', 'success');
    } else {
      addPrivateStudent({
        name,
        grade,
        address,
        phone,
        price,
        target: targetNum,
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
    Alert.alert('حذف الطالب', `هل تريد حذف ${student.name}؟ سيتم حذف كل الحصص المرتبطة به.`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          deletePrivateStudent(student.id);
          await saveData();
          showToast('تم حذف الطالب', 'success');
          onClose();
          onDeleted?.();
        },
      },
    ]);
  };

  return (
    <AppModal
      visible={visible}
      title={student ? 'تعديل بيانات الطالب' : 'إضافة طالب خاص'}
      onClose={onClose}
    >
      <View className="pb-6">
        <FormField
          label="اسم الطالب"
          value={name}
          onChangeText={setName}
          placeholder="أدخل اسم الطالب"
        />

        <FormField
          label="المرحلة الدراسية"
          value={grade}
          onChangeText={setGrade}
          placeholder="مثال: الصف الخامس"
        />

        <FormField
          label="العنوان (اختياري)"
          value={address}
          onChangeText={setAddress}
          placeholder="أدخل العنوان"
        />

        <FormField
          label="رقم الهاتف (اختياري)"
          value={phone}
          onChangeText={setPhone}
          placeholder="أدخل رقم الهاتف"
          keyboardType="phone-pad"
        />

        <FormField
          label="سعر الحصة (د.ك)"
          value={price}
          onChangeText={setPrice}
          placeholder="مثال: 10.000"
          keyboardType="numeric"
        />

        <FormField
          label="عدد الحصص الشهري (الهدف)"
          value={target}
          onChangeText={setTarget}
          placeholder="مثال: 8"
          keyboardType="numeric"
        />

        <View className="mb-4">
          <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-2">
            أيام الحصص الأسبوعية (اختياري — لعرضها في الجدول)
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

        <FormField
          label="وقت الحصة الأسبوعي (اختياري)"
          value={time}
          onChangeText={setTime}
          placeholder="مثال: 17:00"
        />

        <FormField
          label="ملاحظات (اختياري)"
          value={notes}
          onChangeText={setNotes}
          placeholder="أي ملاحظات عن الطالب أو الحصص..."
          multiline
        />

        <FormButton title="حفظ" onPress={handleSave} variant="primary" />
        {student && (
          <FormButton title="حذف الطالب" onPress={handleDelete} variant="danger" />
        )}
        <FormButton title="إلغاء" onPress={onClose} variant="secondary" />
      </View>
    </AppModal>
  );
}
