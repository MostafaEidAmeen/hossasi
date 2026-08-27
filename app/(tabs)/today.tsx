import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, FlatList, Alert, Linking } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useAppContext } from '@/lib/app-context';
import {
  getTodayDate,
  getArabicDate,
  getArabicDayName,
  getDaysLeftInMonth,
  Session,
  buildParentAlertMessage,
  getWhatsAppUrl,
  getLatePayers,
  getPackagesEnding,
} from '@/lib/storage';
import { AddSessionModal } from '@/components/modals/add-session';
import { RecordPaymentModal } from '@/components/modals/record-payment';
import { AppModal, FormField, FormButton } from '@/components/modal';
import { ToastContainer, useToast } from '@/components/toast';
import { cancelSessionReminders, rescheduleSessionReminders } from '@/lib/notifications';

export default function TodayScreen() {
  const { data, updateSession, deleteSession, saveData, generateTodaySessions, renewPrivateStudent } = useAppContext();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{ type: 'private' | 'institute'; id: string; name: string } | null>(null);
  const [statusPrompt, setStatusPrompt] = useState<{ session: Session; status: 'cancel' | 'postponed' } | null>(null);
  const [promptReason, setPromptReason] = useState('');
  const [promptDate, setPromptDate] = useState('');
  const [promptTime, setPromptTime] = useState('');
  const { toasts, showToast, removeToast } = useToast();

  const todayDate = getTodayDate();
  const todaySessions = useMemo(() => {
    return data.sessions
      .filter(s => s.date === todayDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [data.sessions, todayDate]);

  const latePayers = useMemo(() => {
    if (!data.settings?.notifyLatePayments) return [];
    return getLatePayers(data);
  }, [data]);

  const packagesEnding = useMemo(() => {
    if (!data.settings?.notifyPackageEnding) return [];
    return getPackagesEnding(data);
  }, [data]);

  const handleGenerateToday = async () => {
    const count = generateTodaySessions();
    await saveData();
    showToast(count > 0 ? `✅ تم توليد ${count} حصة لليوم` : 'لا توجد حصص جديدة للتوليد اليوم', 'success');
  };

  const handleRenew = async (studentId: string) => {
    renewPrivateStudent(studentId);
    await saveData();
    showToast('🔄 تم تجديد الباقة', 'success');
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-[#34d399]';
      case 'cancel':
        return 'bg-[#f87171]';
      case 'postponed':
        return 'bg-[#60a5fa]';
      case 'pending':
        return 'bg-[#fbbf24]';
      default:
        return 'bg-[#7c6efa]';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'done':
        return '✅ مكتملة';
      case 'cancel':
        return '❌ ملغاة';
      case 'postponed':
        return '🕓 مؤجلة';
      case 'pending':
        return '⏰ قادمة';
      default:
        return status;
    }
  };

  const applyStatus = async (
    session: Session,
    status: 'pending' | 'done' | 'cancel' | 'postponed',
    extra?: { reason?: string; postponedDate?: string; postponedTime?: string }
  ) => {
    updateSession(session.id, {
      status,
      cancelReason: status === 'cancel' || status === 'postponed' ? extra?.reason : undefined,
      postponedDate: status === 'postponed' ? extra?.postponedDate : undefined,
      postponedTime: status === 'postponed' ? extra?.postponedTime : undefined,
    });
    await saveData();
    if (status === 'pending') {
      if (data.settings?.notifySessions) rescheduleSessionReminders({ ...session, status });
    } else {
      cancelSessionReminders(session.id);
    }
    showToast('تم تحديث حالة الحصة', 'success');
    setSelectedSession(session.id); // keep expanded so the parent-alert action is visible
  };

  const handleSetStatus = (session: Session, status: 'pending' | 'done' | 'cancel' | 'postponed') => {
    if (status === 'cancel' || status === 'postponed') {
      setPromptReason('');
      setPromptDate('');
      setPromptTime('');
      setStatusPrompt({ session, status });
    } else {
      applyStatus(session, status);
    }
  };

  const submitStatusPrompt = () => {
    if (!statusPrompt) return;
    applyStatus(statusPrompt.session, statusPrompt.status, {
      reason: promptReason.trim() || undefined,
      postponedDate: statusPrompt.status === 'postponed' ? promptDate.trim() || undefined : undefined,
      postponedTime: statusPrompt.status === 'postponed' ? promptTime.trim() || undefined : undefined,
    });
    setStatusPrompt(null);
  };

  // Recipients (name + phone) to notify when a session is cancelled or postponed.
  const getAlertRecipients = (session: Session): { name: string; phone: string }[] => {
    if (session.type === 'private') {
      const student = data.privateStudents.find(s => s.id === session.studentId);
      return student?.phone ? [{ name: student.name, phone: student.phone }] : [];
    }
    const institute = data.institutes.find(i => i.id === session.instituteId);
    if (!institute) return [];
    if (session.studentId) {
      const student = institute.students.find(s => s.id === session.studentId);
      return student?.parentPhone ? [{ name: student.name, phone: student.parentPhone }] : [];
    }
    return institute.students
      .filter(s => s.parentPhone)
      .map(s => ({ name: s.name, phone: s.parentPhone as string }));
  };

  const sendParentAlert = (session: Session, recipient: { name: string; phone: string }) => {
    const message = buildParentAlertMessage({
      studentName: recipient.name,
      date: session.date,
      time: session.time,
      status: session.status === 'postponed' ? 'postponed' : 'cancel',
      reason: session.cancelReason,
      postponedDate: session.postponedDate,
      postponedTime: session.postponedTime,
    });
    Linking.openURL(getWhatsAppUrl(recipient.phone, message, data.settings?.waCountryCode)).catch(() => {
      showToast('تعذر فتح واتساب — تأكد من رقم الهاتف', 'error');
    });
  };

  const handleDelete = (session: Session) => {
    Alert.alert('حذف الحصة', 'هل تريد حذف هذه الحصة؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          deleteSession(session.id);
          cancelSessionReminders(session.id);
          await saveData();
          showToast('تم حذف الحصة', 'success');
          setSelectedSession(null);
        },
      },
    ]);
  };

  const renderSession = ({ item }: { item: Session }) => {
    const isSelected = selectedSession === item.id;
    return (
      <View
        className={`bg-[#181b2e] border border-[#1e2138] rounded-2xl mb-3 overflow-hidden ${
          isSelected ? 'border-[#7c6efa]' : ''
        }`}
      >
        <Pressable
          onPress={() => setSelectedSession(isSelected ? null : item.id)}
          className="p-4 flex-row items-center gap-3"
        >
          <View className="bg-[#111320] rounded-xl p-3 w-16 items-center">
            <Text className="text-lg font-bold text-[#b39dff]">{item.time.split(':')[0]}</Text>
            <Text className="text-xs text-[#a0a4c0]">{item.time.split(':')[1]}</Text>
          </View>

          <View className="flex-1">
            <Text className="text-base font-bold text-[#eceef8]">
              {item.type === 'private'
                ? item.studentName
                : item.studentName
                ? `${item.studentName} (${item.instituteName})`
                : item.instituteName}
            </Text>
            <Text className="text-xs text-[#a0a4c0] mt-1">
              {item.type === 'private' ? '👤 خاص' : '🏫 معهد'} · {item.price} د.ك
            </Text>
            {item.cancelReason && (
              <Text className={`text-xs mt-1 ${item.status === 'postponed' ? 'text-[#60a5fa]' : 'text-[#f87171]'}`}>
                السبب: {item.cancelReason}
              </Text>
            )}
            {item.status === 'postponed' && item.postponedDate && (
              <Text className="text-xs text-[#60a5fa] mt-1">
                🕓 مؤجلة إلى {getArabicDate(item.postponedDate)}
                {item.postponedTime ? ` — ${item.postponedTime}` : ''}
              </Text>
            )}
          </View>

          <View className={`${getStatusColor(item.status)} rounded-full px-3 py-1`}>
            <Text className="text-xs font-bold text-white">{getStatusLabel(item.status)}</Text>
          </View>
        </Pressable>

        {isSelected && (
          <View className="px-4 pb-4 pt-1 border-t border-[#1e2138]">
            <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-2 mt-2">
              تغيير الحالة
            </Text>
            <View className="flex-row gap-2 mb-2">
              <Pressable
                onPress={() => handleSetStatus(item, 'pending')}
                className="flex-1 py-2 rounded-lg bg-[#fbbf24] bg-opacity-20 border border-[#fbbf24] items-center active:opacity-70"
              >
                <Text className="text-xs font-bold text-[#fbbf24]">⏰ قادمة</Text>
              </Pressable>
              <Pressable
                onPress={() => handleSetStatus(item, 'done')}
                className="flex-1 py-2 rounded-lg bg-[#34d399] bg-opacity-20 border border-[#34d399] items-center active:opacity-70"
              >
                <Text className="text-xs font-bold text-[#34d399]">✅ مكتملة</Text>
              </Pressable>
            </View>
            <View className="flex-row gap-2 mb-3">
              <Pressable
                onPress={() => handleSetStatus(item, 'postponed')}
                className="flex-1 py-2 rounded-lg bg-[#60a5fa] bg-opacity-20 border border-[#60a5fa] items-center active:opacity-70"
              >
                <Text className="text-xs font-bold text-[#60a5fa]">🕓 تأجيل</Text>
              </Pressable>
              <Pressable
                onPress={() => handleSetStatus(item, 'cancel')}
                className="flex-1 py-2 rounded-lg bg-[#f87171] bg-opacity-20 border border-[#f87171] items-center active:opacity-70"
              >
                <Text className="text-xs font-bold text-[#f87171]">❌ ملغاة</Text>
              </Pressable>
            </View>

            {(item.status === 'cancel' || item.status === 'postponed') && (
              <View className="mb-3 bg-[#111320] border border-[#252944] rounded-xl p-3">
                <Text className="text-xs font-bold text-[#a0a4c0] mb-2">
                  📲 تنبيه ولي الأمر عبر واتساب
                </Text>
                {item.status === 'postponed' && item.postponedDate && (
                  <Text className="text-xs text-[#60a5fa] mb-2">
                    الموعد الجديد: {getArabicDate(item.postponedDate)}
                    {item.postponedTime ? ` — ${item.postponedTime}` : ''}
                  </Text>
                )}
                {getAlertRecipients(item).length === 0 ? (
                  <Text className="text-xs text-[#636685]">
                    لا يوجد رقم هاتف محفوظ لهذا {item.type === 'private' ? 'الطالب' : 'المعهد'}
                  </Text>
                ) : (
                  <View className="gap-2">
                    {getAlertRecipients(item).map(r => (
                      <Pressable
                        key={r.phone}
                        onPress={() => sendParentAlert(item, r)}
                        className="flex-row items-center justify-between bg-[#181b2e] border border-[#25D366] rounded-lg px-3 py-2 active:opacity-70"
                      >
                        <Text className="text-xs font-bold text-[#25D366]">إرسال ▶</Text>
                        <Text className="text-xs text-[#eceef8]">{r.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            <Pressable
              onPress={() => handleDelete(item)}
              className="py-2 rounded-lg bg-[#111320] border border-[#252944] items-center active:opacity-70"
            >
              <Text className="text-xs font-bold text-[#a0a4c0]">🗑 حذف الحصة</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer className="bg-[#0d0f1a]">
      {/* Header */}
      <View className="bg-gradient-to-br from-[#181b2e] to-[#1e2138] border-b border-[#1e2138] px-4 py-4">
        <Text className="text-2xl font-bold text-[#eceef8]">
          {getArabicDate(todayDate)}
        </Text>
        <Text className="text-xs text-[#a0a4c0] mt-1">
          {getArabicDayName(todayDate)} · {getDaysLeftInMonth()} أيام متبقية من الشهر
        </Text>
        <Pressable
          onPress={handleGenerateToday}
          className="mt-3 py-2 rounded-lg bg-[#111320] border border-[#252944] items-center active:opacity-70"
        >
          <Text className="text-xs font-bold text-[#a0a4c0]">🔄 توليد حصص اليوم من الجدول المتكرر</Text>
        </Pressable>
      </View>

      {/* Sessions List */}
      <ScrollView className="flex-1 px-4 pt-4">
        {packagesEnding.length > 0 && (
          <View className="bg-[#60a5fa] bg-opacity-10 border border-[#60a5fa] rounded-2xl p-3 mb-4">
            <Text className="text-xs font-bold text-[#60a5fa] mb-2">
              ⏳ باقات قاربت على الانتهاء ({packagesEnding.length})
            </Text>
            {packagesEnding.map(p => (
              <View
                key={p.id}
                className="flex-row items-center justify-between py-1.5 border-b border-[#60a5fa] border-opacity-20"
              >
                <Text className="text-xs font-semibold text-[#eceef8]">باقي {p.remaining} حصة على {p.name}</Text>
                <Pressable
                  onPress={() => handleRenew(p.id)}
                  className="bg-[#60a5fa] bg-opacity-20 border border-[#60a5fa] rounded-full px-2 py-0.5"
                >
                  <Text className="text-[10px] font-bold text-[#60a5fa]">🔄 تجديد</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {latePayers.length > 0 && (
          <View className="bg-[#f87171] bg-opacity-10 border border-[#f87171] rounded-2xl p-3 mb-4">
            <Text className="text-xs font-bold text-[#f87171] mb-2">
              💰 متأخرين في الدفع ({latePayers.length})
            </Text>
            {latePayers.map(l => (
              <View
                key={`${l.type}-${l.id}`}
                className="flex-row items-center justify-between py-1.5 border-b border-[#f87171] border-opacity-20"
              >
                <Text className="text-xs font-semibold text-[#eceef8]">{l.name}</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-[11px] font-bold text-[#f87171]">{l.remaining.toFixed(3)} د.ك</Text>
                  <Pressable
                    onPress={() => setPaymentTarget({ type: l.type, id: l.id, name: l.name })}
                    className="bg-[#34d399] bg-opacity-20 border border-[#34d399] rounded-full px-2 py-0.5"
                  >
                    <Text className="text-[10px] font-bold text-[#34d399]">تسجيل دفع</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
        {todaySessions.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-4xl mb-3">📅</Text>
            <Text className="text-base font-bold text-[#eceef8]">لا توجد حصص اليوم</Text>
            <Text className="text-xs text-[#a0a4c0] mt-2">أضف حصة جديدة بالضغط على الزر +</Text>
          </View>
        ) : (
          <FlatList
            data={todaySessions}
            renderItem={renderSession}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </ScrollView>

      {/* Add Button */}
      <View className="px-4 pb-4">
        <Pressable
          onPress={() => setModalVisible(true)}
          className="bg-[#7c6efa] rounded-2xl py-4 items-center active:bg-[#6457e0] active:scale-95"
        >
          <Text className="text-white font-bold text-lg">+ إضافة حصة</Text>
        </Pressable>
      </View>

      <AddSessionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {}}
      />

      <RecordPaymentModal
        visible={!!paymentTarget}
        target={paymentTarget}
        onClose={() => setPaymentTarget(null)}
      />

      <AppModal
        visible={!!statusPrompt}
        title={statusPrompt?.status === 'postponed' ? '🕓 تأجيل الحصة' : '❌ إلغاء الحصة'}
        onClose={() => setStatusPrompt(null)}
      >
        <View className="pb-6">
          {statusPrompt?.status === 'postponed' && (
            <>
              <FormField
                label="التاريخ الجديد (اختياري) — مثال 2026-08-10"
                value={promptDate}
                onChangeText={setPromptDate}
                placeholder="YYYY-MM-DD"
              />
              <FormField
                label="الوقت الجديد (اختياري) — مثال 17:00"
                value={promptTime}
                onChangeText={setPromptTime}
                placeholder="HH:MM"
              />
            </>
          )}
          <FormField
            label={statusPrompt?.status === 'postponed' ? 'سبب التأجيل (اختياري)' : 'سبب الإلغاء (اختياري)'}
            value={promptReason}
            onChangeText={setPromptReason}
            placeholder="اكتب السبب هنا..."
            multiline
          />
          <FormButton title="تأكيد" onPress={submitStatusPrompt} variant="primary" />
          <FormButton title="تراجع" onPress={() => setStatusPrompt(null)} variant="secondary" />
        </View>
      </AppModal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ScreenContainer>
  );
}
