import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { AppModal, FormButton } from '../modal';
import { useAppContext } from '@/lib/app-context';
import { useToast } from '../toast';
import { parseExcelWorkbook, ImportResult } from '@/lib/excel-import';

interface ExcelImportModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ExcelImportModal({ visible, onClose }: ExcelImportModalProps) {
  const { data, addInstitute, addInstituteStudent, saveData } = useAppContext();
  const { showToast } = useToast();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setResult(null);
    setFileName('');
  };

  const pickFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          '*/*',
        ],
      });
      if (picked.canceled || !picked.assets?.[0]) return;

      setLoading(true);
      const asset = picked.assets[0];
      const response = await fetch(asset.uri);
      const buffer = await response.arrayBuffer();
      const parsed = parseExcelWorkbook(buffer);
      setFileName(asset.name);
      setResult(parsed);

      if (parsed.groups.length === 0) {
        showToast('لم يتم العثور على أي مجموعات صالحة في الملف', 'error');
      }
    } catch {
      showToast('تعذر قراءة الملف — تأكد أنه ملف إكسل صحيح (xlsx)', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = result?.groups.reduce((sum, g) => sum + g.students.length, 0) || 0;

  const handleConfirmImport = async () => {
    if (!result || result.groups.length === 0) return;

    const nameToId = new Map<string, string>();
    data.institutes.forEach(inst => nameToId.set(inst.name.trim().toLowerCase(), inst.id));

    result.groups.forEach(group => {
      const key = group.groupName.trim().toLowerCase();
      let groupId = nameToId.get(key);
      if (!groupId) {
        groupId = addInstitute({ name: group.groupName, defaultPrice: '0', days: [], groupType: 'own' });
        nameToId.set(key, groupId);
      }
      group.students.forEach(st => {
        addInstituteStudent(groupId!, { name: st.name, grade: st.grade, parentPhone: st.parentPhone });
      });
    });

    await saveData();
    showToast(`✅ تم استيراد ${result.groups.length} مجموعة و ${totalStudents} طالب`, 'success');
    reset();
    onClose();
  };

  return (
    <AppModal visible={visible} title="📥 استيراد مجموعات من إكسل" onClose={() => { reset(); onClose(); }}>
      <View className="pb-6">
        {!result && (
          <>
            <Text className="text-xs text-[#a0a4c0] mb-4 leading-5">
              الأعمدة المتوقعة: اسم الطالب، المرحلة الدراسية، رقم واتس ولي الأمر، واختيار المجموعة.{'\n'}
              يقبل الملف شيت منفصل لكل مجموعة (اسم الشيت = اسم المجموعة)، أو شيت واحد فيه عمود "اختيار المجموعة" — أو الاتنين مع بعض.
            </Text>
            <Pressable
              onPress={pickFile}
              disabled={loading}
              className="bg-[#7c6efa] rounded-xl py-3 items-center active:opacity-80"
            >
              <Text className="text-sm font-bold text-white">
                {loading ? '⏳ جارٍ القراءة...' : '📂 اختيار ملف إكسل'}
              </Text>
            </Pressable>
          </>
        )}

        {result && (
          <>
            <Text className="text-xs text-[#a0a4c0] mb-3">📄 {fileName}</Text>

            {result.groups.length > 0 && (
              <ScrollView className="max-h-72 mb-3">
                {result.groups.map(g => (
                  <View
                    key={g.groupName}
                    className="flex-row items-center justify-between bg-[#111320] border border-[#1e2138] rounded-lg px-3 py-2 mb-2"
                  >
                    <Text className="text-sm font-bold text-[#eceef8]">👥 {g.groupName}</Text>
                    <Text className="text-xs text-[#a0a4c0]">{g.students.length} طالب</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {result.errors.length > 0 && (
              <View className="bg-[#f87171] bg-opacity-10 border border-[#f87171] rounded-lg p-3 mb-3">
                <Text className="text-xs font-bold text-[#f87171] mb-1">
                  ⚠️ تحذيرات ({result.errors.length})
                </Text>
                {result.errors.slice(0, 5).map((e, i) => (
                  <Text key={i} className="text-[11px] text-[#f87171] mt-0.5">
                    {e.sheet} — صف {e.row}: {e.reason}
                  </Text>
                ))}
                {result.errors.length > 5 && (
                  <Text className="text-[11px] text-[#f87171] mt-0.5">
                    ...و {result.errors.length - 5} تحذيرات أخرى
                  </Text>
                )}
              </View>
            )}

            {result.groups.length > 0 && (
              <Text className="text-xs text-[#636685] mb-3">
                هيتم إضافة {result.groups.length} مجموعة بإجمالي {totalStudents} طالب. المجموعات اللي أسماءها مطابقة
                لمجموعات موجودة هيتضاف طلابها الجدد ليها بدل إنشاء مجموعة مكررة.
              </Text>
            )}

            <View className="flex-row gap-2">
              <Pressable
                onPress={reset}
                className="flex-1 bg-[#111320] border border-[#1e2138] rounded-xl py-3 items-center active:opacity-80"
              >
                <Text className="text-sm font-bold text-[#a0a4c0]">↩️ اختيار ملف تاني</Text>
              </Pressable>
              {result.groups.length > 0 && (
                <Pressable
                  onPress={handleConfirmImport}
                  className="flex-1 bg-[#34d399] rounded-xl py-3 items-center active:opacity-80"
                >
                  <Text className="text-sm font-bold text-white">✅ تأكيد الاستيراد</Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {!result && <FormButton title="إلغاء" onPress={onClose} variant="secondary" />}
      </View>
    </AppModal>
  );
}
