import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Share, Alert } from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { ScreenContainer } from '@/components/screen-container';
import { useAppContext } from '@/lib/app-context';
import { useToast } from '@/components/toast';
import { MonthlyReportsModal } from '@/components/modals/monthly-reports';
import {
  scheduleAllPendingReminders,
  cancelAllSessionReminders,
  sendTestNotification,
  requestNotificationPermission,
} from '@/lib/notifications';
import { useThemeContext } from '@/lib/theme-provider';

const WA_COUNTRY_CODES = [
  { name: 'مصر', code: '20' },
  { name: 'السعودية', code: '966' },
  { name: 'الإمارات', code: '971' },
  { name: 'الكويت', code: '965' },
  { name: 'قطر', code: '974' },
  { name: 'البحرين', code: '973' },
  { name: 'عُمان', code: '968' },
  { name: 'الأردن', code: '962' },
  { name: 'المغرب', code: '212' },
  { name: 'تونس', code: '216' },
  { name: 'الجزائر', code: '213' },
  { name: 'ليبيا', code: '218' },
  { name: 'العراق', code: '964' },
  { name: 'لبنان', code: '961' },
];

function Toggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`w-12 h-7 rounded-full justify-center px-0.5 ${on ? 'bg-[#7c6efa]' : 'bg-[#252944]'}`}
    >
      <View
        className={`w-6 h-6 rounded-full bg-white ${on ? 'self-end' : 'self-start'}`}
      />
    </Pressable>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-[11px] font-bold text-[#636685] uppercase tracking-widest mt-6 mb-2">
      {children}
    </Text>
  );
}

export default function SettingsScreen() {
  const { data, updateSettings, replaceAllData, deleteAllData, saveData, generateTodaySessions } = useAppContext();
  const { showToast } = useToast();
  const { colorScheme, setColorScheme } = useThemeContext();
  const settings = data.settings!;

  const [reportsModalVisible, setReportsModalVisible] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [showRestoreInput, setShowRestoreInput] = useState(false);

  const toggle = async (
    key: 'notifySessions' | 'notifyLatePayments' | 'notifyPackageEnding' | 'reportsButtonEnabled' | 'autoGenerateSessions'
  ) => {
    const newValue = !settings[key];
    updateSettings({ [key]: newValue });
    await saveData();

    if (key === 'notifySessions') {
      if (newValue) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          showToast('من فضلك فعّل صلاحية الإشعارات من إعدادات الجهاز', 'error');
          return;
        }
        const todayPending = data.sessions.filter(s => s.status === 'pending');
        await scheduleAllPendingReminders(todayPending);
        showToast('✅ تم تفعيل تذكير الحصص', 'success');
      } else {
        await cancelAllSessionReminders();
        showToast('تم إيقاف تذكير الحصص', 'success');
      }
    }
  };

  const handleTestNotification = async () => {
    const sent = await sendTestNotification();
    if (sent) showToast('📨 تم إرسال إشعار تجريبي — تحقق من شريط الإشعارات', 'success');
    else showToast('من فضلك فعّل صلاحية الإشعارات من إعدادات الجهاز', 'error');
  };

  const handleThemeChange = async (theme: 'light' | 'dark') => {
    updateSettings({ theme });
    setColorScheme(theme);
    await saveData();
  };

  const handleGenerateNow = async () => {
    const count = generateTodaySessions();
    await saveData();
    showToast(count > 0 ? `✅ تم توليد ${count} حصة لليوم` : 'لا توجد حصص جديدة للتوليد اليوم', 'success');
  };

  const setCountryCode = async (code: string) => {
    updateSettings({ waCountryCode: code });
    await saveData();
  };

  const setReportsDay = async (day: number) => {
    updateSettings({ reportsButtonDay: day });
    await saveData();
  };

  const exportBackup = async () => {
    try {
      const json = JSON.stringify(data, null, 2);
      await Share.share({ message: json, title: 'نسخة احتياطية - حصصي' });
    } catch {
      showToast('تعذر إنشاء النسخة الاحتياطية', 'error');
    }
  };

  const applyRestoredJson = (text: string) => {
    try {
      const parsed = JSON.parse(text.trim());
      if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
      Alert.alert('استعادة البيانات', 'سيتم استبدال كل البيانات الحالية بالنسخة المستعادة. متابعة؟', [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'استعادة',
          style: 'destructive',
          onPress: async () => {
            replaceAllData({
              privateStudents: parsed.privateStudents || [],
              institutes: parsed.institutes || [],
              sessions: parsed.sessions || [],
              settings: { ...settings, ...(parsed.settings || {}) },
            });
            await saveData();
            setRestoreText('');
            setShowRestoreInput(false);
            showToast('✅ تم استعادة البيانات بنجاح', 'success');
          },
        },
      ]);
    } catch {
      showToast('الملف/النص غير صالح — تأكد أنه نسخة احتياطية صحيحة', 'error');
    }
  };

  const doRestore = async () => {
    if (!restoreText.trim()) {
      showToast('الصق نص النسخة الاحتياطية أولاً', 'error');
      return;
    }
    applyRestoredJson(restoreText);
  };

  const pickBackupFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'] });
      if (result.canceled || !result.assets?.[0]) return;
      const response = await fetch(result.assets[0].uri);
      const text = await response.text();
      applyRestoredJson(text);
    } catch {
      showToast('تعذر قراءة الملف المختار', 'error');
    }
  };

  const confirmDeleteAll = () => {
    Alert.alert('حذف جميع البيانات', 'سيتم حذف جميع البيانات نهائيًا ولا يمكن التراجع.', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف نهائي',
        style: 'destructive',
        onPress: () => {
          Alert.alert('تأكيد أخير', 'هل أنت متأكد تمامًا؟', [
            { text: 'إلغاء', style: 'cancel' },
            {
              text: 'نعم، احذف كل شيء',
              style: 'destructive',
              onPress: async () => {
                deleteAllData();
                await saveData();
                showToast('🗑️ تم حذف جميع البيانات', 'success');
              },
            },
          ]);
        },
      },
    ]);
  };

  return (
    <ScreenContainer className="bg-[#0d0f1a]">
      <View className="bg-[#111320] border-b border-[#1e2138] px-4 py-4 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-[#181b2e] border border-[#1e2138] items-center justify-center active:opacity-70"
        >
          <Text className="text-[#a0a4c0] text-lg">→</Text>
        </Pressable>
        <Text className="text-xl font-bold text-[#eceef8]">الإعدادات</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <SectionTitle>🎨 المظهر</SectionTitle>
        <View className="bg-[#181b2e] border border-[#1e2138] rounded-2xl px-4 py-3">
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => handleThemeChange('dark')}
              className={`flex-1 py-2 rounded-lg border items-center ${
                settings.theme !== 'light' ? 'bg-[#7c6efa] border-[#7c6efa]' : 'bg-[#111320] border-[#1e2138]'
              }`}
            >
              <Text className={`text-xs font-bold ${settings.theme !== 'light' ? 'text-white' : 'text-[#a0a4c0]'}`}>
                🌙 ليلي
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleThemeChange('light')}
              className={`flex-1 py-2 rounded-lg border items-center ${
                settings.theme === 'light' ? 'bg-[#7c6efa] border-[#7c6efa]' : 'bg-[#111320] border-[#1e2138]'
              }`}
            >
              <Text className={`text-xs font-bold ${settings.theme === 'light' ? 'text-white' : 'text-[#a0a4c0]'}`}>
                ☀️ نهاري
              </Text>
            </Pressable>
          </View>
          <Text className="text-[10px] text-[#636685] mt-2">
            ملاحظة: شاشات التطبيق الحالية مصممة بألوان داكنة ثابتة — التبديل هنا بيغيّر السمة العامة للنظام، وممكن نكمل تفعيل الوضع النهاري على كل الشاشات في خطوة لاحقة لو حابب.
          </Text>
        </View>

        <SectionTitle>🔄 توليد الحصص التلقائي</SectionTitle>
        <View className="bg-[#181b2e] border border-[#1e2138] rounded-2xl px-4">
          <View className="flex-row items-center justify-between gap-3 py-3">
            <View className="flex-1">
              <Text className="text-sm font-bold text-[#eceef8]">توليد حصص اليوم تلقائيًا</Text>
              <Text className="text-xs text-[#636685] mt-0.5">
                يبني حصص اليوم من أيام/أوقات المعاهد والطلاب المسجلة، مرة كل يوم عند فتح التطبيق
              </Text>
            </View>
            <Toggle on={settings.autoGenerateSessions} onPress={() => toggle('autoGenerateSessions')} />
          </View>
        </View>
        <Pressable
          onPress={handleGenerateNow}
          className="bg-[#181b2e] border border-[#1e2138] rounded-xl py-3 items-center mt-2 active:opacity-80"
        >
          <Text className="text-sm font-bold text-[#b39dff]">🔄 توليد حصص اليوم الآن</Text>
        </Pressable>

        <SectionTitle>🔔 الإشعارات</SectionTitle>
        <View className="bg-[#181b2e] border border-[#1e2138] rounded-2xl px-4">
          <View className="flex-row items-center justify-between gap-3 py-3 border-b border-[#1e2138]">
            <View className="flex-1">
              <Text className="text-sm font-bold text-[#eceef8]">تذكير حصص اليوم</Text>
              <Text className="text-xs text-[#636685] mt-0.5">تنبيه قبل الحصة بساعة، وتنبيه ثانٍ قبلها بنص ساعة</Text>
            </View>
            <Toggle on={settings.notifySessions} onPress={() => toggle('notifySessions')} />
          </View>
          <View className="flex-row items-center justify-between gap-3 py-3 border-b border-[#1e2138]">
            <View className="flex-1">
              <Text className="text-sm font-bold text-[#eceef8]">تنبيه الدفع المتأخر</Text>
              <Text className="text-xs text-[#636685] mt-0.5">يعرض قائمة المتأخرين أعلى شاشة اليوم</Text>
            </View>
            <Toggle on={settings.notifyLatePayments} onPress={() => toggle('notifyLatePayments')} />
          </View>
          <View className="flex-row items-center justify-between gap-3 py-3">
            <View className="flex-1">
              <Text className="text-sm font-bold text-[#eceef8]">تنبيه اقتراب انتهاء الباقة</Text>
              <Text className="text-xs text-[#636685] mt-0.5">
                يقولك لما يفضل حصة أو اتنين بس على اكتمال باقة الطالب الخاص
              </Text>
            </View>
            <Toggle on={settings.notifyPackageEnding} onPress={() => toggle('notifyPackageEnding')} />
          </View>
        </View>

        <Text className="text-[11px] font-bold text-[#636685] uppercase tracking-widest mt-4 mb-2">
          🧪 اختبار الإشعارات
        </Text>
        <Pressable
          onPress={handleTestNotification}
          className="bg-[#181b2e] border border-[#1e2138] rounded-xl py-3 flex-row items-center justify-center gap-2 active:opacity-80"
        >
          <Text className="text-sm font-bold text-[#b39dff]">▶️ إرسال إشعار تجريبي الآن</Text>
        </Pressable>

        <SectionTitle>💬 الواتساب</SectionTitle>
        <View className="bg-[#181b2e] border border-[#1e2138] rounded-2xl px-4 py-3">
          <Text className="text-sm font-bold text-[#eceef8] mb-2">رمز دولة الواتساب الافتراضي</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <View className="flex-row gap-2">
              {WA_COUNTRY_CODES.map(c => (
                <Pressable
                  key={c.code}
                  onPress={() => setCountryCode(c.code)}
                  className={`px-3 py-2 rounded-lg border ${
                    settings.waCountryCode === c.code
                      ? 'bg-[#7c6efa] border-[#7c6efa]'
                      : 'bg-[#111320] border-[#1e2138]'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      settings.waCountryCode === c.code ? 'text-white' : 'text-[#a0a4c0]'
                    }`}
                  >
                    {c.name} (+{c.code})
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View className="bg-[#181b2e] border border-[#1e2138] rounded-2xl px-4 mt-3">
          <View className="flex-row items-center justify-between gap-3 py-3 border-b border-[#1e2138]">
            <View className="flex-1">
              <Text className="text-sm font-bold text-[#eceef8]">إرسال تقارير الشهر</Text>
              <Text className="text-xs text-[#636685] mt-0.5">يفتح واتساب لكل ولي أمر بتقرير مفصل</Text>
            </View>
            <Pressable
              onPress={() => setReportsModalVisible(true)}
              className="bg-[#34d399] bg-opacity-20 border border-[#34d399] rounded-full px-3 py-1"
            >
              <Text className="text-xs font-bold text-[#34d399]">فتح</Text>
            </Pressable>
          </View>
          <View className="flex-row items-center justify-between gap-3 py-3 border-b border-[#1e2138]">
            <View className="flex-1">
              <Text className="text-sm font-bold text-[#eceef8]">إظهار زر التقرير في البطاقات</Text>
              <Text className="text-xs text-[#636685] mt-0.5">زر إرسال سريع على بطاقة كل طالب</Text>
            </View>
            <Toggle on={settings.reportsButtonEnabled} onPress={() => toggle('reportsButtonEnabled')} />
          </View>
          <View className="py-3">
            <Text className="text-sm font-bold text-[#eceef8] mb-2">يظهر الزر بداية من يوم</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                  <Pressable
                    key={d}
                    onPress={() => setReportsDay(d)}
                    className={`w-10 h-10 rounded-lg items-center justify-center border ${
                      settings.reportsButtonDay === d
                        ? 'bg-[#7c6efa] border-[#7c6efa]'
                        : 'bg-[#111320] border-[#1e2138]'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        settings.reportsButtonDay === d ? 'text-white' : 'text-[#a0a4c0]'
                      }`}
                    >
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        <SectionTitle>🗄️ النسخ الاحتياطي</SectionTitle>
        <Pressable
          onPress={exportBackup}
          className="bg-[#7c6efa] rounded-xl py-3 items-center mb-2 active:opacity-80"
        >
          <Text className="text-sm font-bold text-white">⬆️ مشاركة نسخة احتياطية</Text>
        </Pressable>
        <Pressable
          onPress={pickBackupFile}
          className="bg-[#181b2e] border border-[#1e2138] rounded-xl py-3 items-center mb-2 active:opacity-80"
        >
          <Text className="text-sm font-bold text-[#eceef8]">📂 اختيار ملف نسخة احتياطية</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowRestoreInput(v => !v)}
          className="bg-[#181b2e] border border-[#1e2138] rounded-xl py-3 items-center mb-2 active:opacity-80"
        >
          <Text className="text-sm font-bold text-[#eceef8]">
            {showRestoreInput ? '↩️ إخفاء' : '⬇️ استعادة بلصق النص'}
          </Text>
        </Pressable>
        {showRestoreInput && (
          <View className="mb-2">
            <TextInput
              className="bg-[#111320] border border-[#1e2138] rounded-xl px-4 py-3 text-sm text-[#eceef8] mb-2"
              placeholder="الصق نص النسخة الاحتياطية هنا..."
              placeholderTextColor="#636685"
              multiline
              numberOfLines={6}
              value={restoreText}
              onChangeText={setRestoreText}
              style={{ textAlignVertical: 'top', minHeight: 120 }}
            />
            <Pressable
              onPress={doRestore}
              className="bg-[#34d399] bg-opacity-20 border border-[#34d399] rounded-xl py-3 items-center"
            >
              <Text className="text-sm font-bold text-[#34d399]">استعادة الآن</Text>
            </Pressable>
          </View>
        )}
        <Pressable
          onPress={confirmDeleteAll}
          className="bg-[#f87171] bg-opacity-10 border border-[#f87171] rounded-xl py-3 items-center mb-2 active:opacity-80"
        >
          <Text className="text-sm font-bold text-[#f87171]">🗑️ حذف جميع البيانات</Text>
        </Pressable>

        <SectionTitle>ℹ️ عن التطبيق</SectionTitle>
        <View className="bg-[#181b2e] border border-[#1e2138] rounded-2xl px-4 py-3">
          <Text className="text-sm font-bold text-[#eceef8]">الإصدار</Text>
          <Text className="text-xs text-[#636685] mt-0.5">1.0.0</Text>
        </View>
      </ScrollView>

      <MonthlyReportsModal visible={reportsModalVisible} onClose={() => setReportsModalVisible(false)} />
    </ScreenContainer>
  );
}
