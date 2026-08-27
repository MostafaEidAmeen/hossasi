import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Share, Linking, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { AppModal, FormField, FormButton } from '../modal';
import { useAppContext } from '@/lib/app-context';
import { useToast } from '../toast';
import {
  HomeworkStatus,
  HOMEWORK_STATUS_LABELS,
  buildHomeworkMessage,
  getWhatsAppUrl,
  getArabicDate,
  getTodayDate,
} from '@/lib/storage';

interface HomeworkModalProps {
  visible: boolean;
  onClose: () => void;
  target: { type: 'private' | 'institute'; id: string; name: string; phone?: string } | null;
}

const STATUS_OPTIONS: { value: HomeworkStatus; color: string }[] = [
  { value: 'written', color: '#34d399' },
  { value: 'not_done', color: '#f87171' },
  { value: 'late', color: '#fbbf24' },
];

export function HomeworkModal({ visible, onClose, target }: HomeworkModalProps) {
  const { data, addHomeworkRecord, saveData } = useAppContext();
  const { showToast } = useToast();

  const [date, setDate] = useState(getTodayDate());
  const [status, setStatus] = useState<HomeworkStatus>('written');
  const [details, setDetails] = useState('');
  const [attachment, setAttachment] = useState<{ uri: string; name: string } | null>(null);

  useEffect(() => {
    if (visible) {
      setDate(getTodayDate());
      setStatus('written');
      setDetails('');
      setAttachment(null);
    }
  }, [visible, target]);

  const findStudent = () => {
    if (!target) return undefined;
    if (target.type === 'private') return data.privateStudents.find(s => s.id === target.id);
    for (const inst of data.institutes) {
      const s = inst.students.find(x => x.id === target.id);
      if (s) return s;
    }
    return undefined;
  };

  const student = findStudent();
  const history = [...(student?.homework || [])].sort((a, b) => b.date.localeCompare(a.date));

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast('من فضلك فعّل صلاحية الوصول للصور', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      setAttachment({ uri: result.assets[0].uri, name: result.assets[0].fileName || 'صورة' });
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets?.[0]) {
      setAttachment({ uri: result.assets[0].uri, name: result.assets[0].name });
    }
  };

  const handleSave = async () => {
    if (!target) return;
    addHomeworkRecord(target.type, target.id, { date, status, details: details.trim() || undefined });
    await saveData();
    showToast('✅ تم حفظ الواجب', 'success');
  };

  const buildMessage = () =>
    buildHomeworkMessage({ studentName: target?.name || '', date, status, details: details.trim() || undefined });

  const handleSendWhatsApp = async () => {
    if (!target?.phone) {
      showToast('لا يوجد رقم واتساب محفوظ لهذا الطالب', 'error');
      return;
    }
    const message = buildMessage();

    if (attachment) {
      try {
        await Share.share({ url: attachment.uri, message });
        showToast('اختر واتساب من قائمة المشاركة ليتم إرفاق الملف', 'success');
      } catch {
        showToast('تعذر فتح قائمة المشاركة', 'error');
      }
      return;
    }

    Linking.openURL(getWhatsAppUrl(target.phone, message, data.settings?.waCountryCode)).catch(() => {
      showToast('تعذر فتح واتساب', 'error');
    });
  };

  const handleCopyMessage = async () => {
    await Clipboard.setStringAsync(buildMessage());
    showToast('📋 تم نسخ نص الرسالة', 'success');
  };

  return (
    <AppModal visible={visible} title={`📝 تسجيل الواجب${target ? ' — ' + target.name : ''}`} onClose={onClose}>
      <FormField label="التاريخ (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder={getTodayDate()} />

      <View className="mb-4">
        <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-2">حالة الواجب</Text>
        <View className="flex-row gap-2">
          {STATUS_OPTIONS.map(opt => (
            <Pressable
              key={opt.value}
              onPress={() => setStatus(opt.value)}
              className="flex-1 py-2 rounded-lg items-center border"
              style={{
                backgroundColor: status === opt.value ? opt.color + '33' : '#111320',
                borderColor: status === opt.value ? opt.color : '#1e2138',
              }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: status === opt.value ? opt.color : '#a0a4c0' }}
              >
                {HOMEWORK_STATUS_LABELS[opt.value]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FormField
        label="تفاصيل الواجب"
        value={details}
        onChangeText={setDetails}
        placeholder="مثال: حل التمارين من صفحة 20 إلى 25"
        multiline
      />

      <View className="mb-4">
        <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-2">
          مرفق (اختياري)
        </Text>
        <View className="flex-row gap-2 mb-2">
          <Pressable
            onPress={pickImage}
            className="flex-1 py-2 rounded-lg items-center bg-[#111320] border border-[#1e2138]"
          >
            <Text className="text-xs font-bold text-[#a0a4c0]">📷 صورة</Text>
          </Pressable>
          <Pressable
            onPress={pickDocument}
            className="flex-1 py-2 rounded-lg items-center bg-[#111320] border border-[#1e2138]"
          >
            <Text className="text-xs font-bold text-[#a0a4c0]">📄 ملف PDF</Text>
          </Pressable>
        </View>
        {attachment && (
          <Text className="text-[11px] text-[#7c6efa]">📎 {attachment.name}</Text>
        )}
      </View>

      <FormButton title="💾 حفظ الواجب" onPress={handleSave} variant="primary" />
      <FormButton title="📤 إرسال عبر واتساب" onPress={handleSendWhatsApp} variant="secondary" />
      <Pressable onPress={handleCopyMessage} className="items-center py-2 mb-2">
        <Text className="text-xs font-bold text-[#a0a4c0]">📋 نسخ نص الرسالة</Text>
      </Pressable>
      <Text className="text-[10px] text-[#636685] text-center mb-4">
        ⚠️ لو اخترت مرفق، هتفتح قائمة المشاركة — اختر واتساب من القائمة عشان يرفق الملف تلقائيًا
      </Text>

      {history.length > 0 && (
        <View>
          <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-2">
            سجل الواجبات السابقة
          </Text>
          {history.map(r => (
            <View
              key={r.id}
              className="flex-row items-center justify-between gap-2 py-2 border-b border-[#1e2138]"
            >
              <View className="flex-1">
                <Text className="text-xs font-semibold text-[#eceef8]">{getArabicDate(r.date)}</Text>
                {r.details ? (
                  <Text className="text-[11px] text-[#636685] mt-0.5">{r.details}</Text>
                ) : null}
              </View>
              <Text className="text-[11px] font-bold">{HOMEWORK_STATUS_LABELS[r.status]}</Text>
            </View>
          ))}
        </View>
      )}
    </AppModal>
  );
}
