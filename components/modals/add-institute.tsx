import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { AppModal, FormField, FormButton } from '../modal';
import { useAppContext } from '@/lib/app-context';
import { useToast } from '../toast';
import { Institute, GroupType, dayEnToAr } from '@/lib/storage';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AddInstituteModalProps {
  visible: boolean;
  onClose: () => void;
  institute?: Institute;
  onSuccess?: () => void;
}

export function AddInstituteModal({
  visible,
  onClose,
  institute,
  onSuccess,
}: AddInstituteModalProps) {
  const { addInstitute, updateInstitute, saveData } = useAppContext();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [groupType, setGroupType] = useState<GroupType>('institute');

  useEffect(() => {
    if (institute) {
      setName(institute.name);
      setDefaultPrice(institute.defaultPrice);
      setSelectedDays(institute.days || []);
      setTime(institute.time || '');
      setGroupType(institute.groupType || 'institute');
    } else {
      resetForm();
    }
  }, [visible, institute]);

  const resetForm = () => {
    setName('');
    setDefaultPrice('');
    setSelectedDays([]);
    setTime('');
    setGroupType('institute');
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('من فضلك أدخل اسم المعهد', 'error');
      return;
    }
    if (!defaultPrice.trim()) {
      showToast('من فضلك أدخل السعر الافتراضي', 'error');
      return;
    }

    if (institute) {
      updateInstitute(institute.id, {
        name,
        defaultPrice,
        days: selectedDays,
        time,
        groupType,
      });
      showToast('تم تحديث بيانات المعهد', 'success');
    } else {
      addInstitute({
        name,
        defaultPrice,
        days: selectedDays,
        time,
        groupType,
      });
      showToast('تمت إضافة المعهد بنجاح', 'success');
    }

    await saveData();
    resetForm();
    onClose();
    onSuccess?.();
  };

  return (
    <AppModal
      visible={visible}
      title={institute ? 'تعديل بيانات المجموعة' : 'إضافة معهد أو مجموعة'}
      onClose={onClose}
    >
      <View className="pb-6">
        <View className="mb-4">
          <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-2">
            نوع المجموعة
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setGroupType('institute')}
              className={`flex-1 py-2 rounded-lg border items-center ${
                groupType === 'institute' ? 'bg-[#7c6efa] border-[#7c6efa]' : 'bg-[#111320] border-[#1e2138]'
              }`}
            >
              <Text className={`text-xs font-bold ${groupType === 'institute' ? 'text-white' : 'text-[#a0a4c0]'}`}>
                🏫 معهد خارجي
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setGroupType('own')}
              className={`flex-1 py-2 rounded-lg border items-center ${
                groupType === 'own' ? 'bg-[#7c6efa] border-[#7c6efa]' : 'bg-[#111320] border-[#1e2138]'
              }`}
            >
              <Text className={`text-xs font-bold ${groupType === 'own' ? 'text-white' : 'text-[#a0a4c0]'}`}>
                👥 مجموعتي الخاصة
              </Text>
            </Pressable>
          </View>
        </View>

        <FormField
          label="اسم المعهد أو المجموعة"
          value={name}
          onChangeText={setName}
          placeholder="أدخل الاسم"
        />

        <FormField
          label="سعر الحصة الافتراضي (د.ك)"
          value={defaultPrice}
          onChangeText={setDefaultPrice}
          placeholder="مثال: 10.000"
          keyboardType="numeric"
        />

        <View className="mb-4">
          <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-2">
            أيام الحصص
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
          label="وقت الحصة الأسبوعي (اختياري — لعرضه في الجدول)"
          value={time}
          onChangeText={setTime}
          placeholder="مثال: 16:00"
        />

        <FormButton title="حفظ" onPress={handleSave} variant="primary" />
        <FormButton title="إلغاء" onPress={onClose} variant="secondary" />
      </View>
    </AppModal>
  );
}
