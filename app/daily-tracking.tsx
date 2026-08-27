import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAppContext } from '@/lib/app-context';
import { getTodayDate, getArabicDate, getArabicDayName, formatDate, TrackStatus, InteractionStatus } from '@/lib/storage';

const SHORT_DAY_NAMES: Record<string, string> = {
  'الأحد': 'أحد',
  'الاثنين': 'إثنين',
  'الثلاثاء': 'ثلاثاء',
  'الأربعاء': 'أربعاء',
  'الخميس': 'خميس',
  'الجمعة': 'جمعة',
  'السبت': 'سبت',
};


interface StudentRow {
  type: 'private' | 'institute';
  id: string;
  name: string;
  groupLabel: string;
}

function buildDateRange(centerDate: string, daysBack: number, daysForward: number): string[] {
  const center = new Date(`${centerDate}T00:00:00`);
  const dates: string[] = [];
  for (let i = -daysBack; i <= daysForward; i++) {
    const d = new Date(center);
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

const RECITATION_CYCLE: (TrackStatus | undefined)[] = [undefined, 'excellent', 'good', 'weak'];
const INTERACTION_CYCLE: (InteractionStatus | undefined)[] = [undefined, 'interactive', 'not_interactive'];

const RECITATION_LABELS: Record<string, string> = {
  excellent: '⭐ ممتاز',
  good: '👍 جيد',
  weak: '⚠️ ضعيف',
};
const INTERACTION_LABELS: Record<string, string> = {
  interactive: '🙋 متفاعل',
  not_interactive: '😐 غير متفاعل',
};

function chipColor(hasValue: boolean, tone: 'good' | 'warn' = 'good') {
  if (!hasValue) return { bg: '#111320', border: '#1e2138', text: '#636685' };
  if (tone === 'warn') return { bg: 'rgba(251,191,36,0.15)', border: '#fbbf24', text: '#fbbf24' };
  return { bg: 'rgba(124,110,250,0.15)', border: '#7c6efa', text: '#b39dff' };
}

export default function DailyTrackingScreen() {
  const { data, updateDailyTracking, saveData } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const dateStrip = useMemo(() => buildDateRange(getTodayDate(), 14, 7), []);

  const students: StudentRow[] = useMemo(() => {
    const rows: StudentRow[] = data.privateStudents.map(s => ({
      type: 'private',
      id: s.id,
      name: s.name,
      groupLabel: '👤 خاص',
    }));
    data.institutes.forEach(inst => {
      inst.students.forEach(s => {
        rows.push({ type: 'institute', id: s.id, name: s.name, groupLabel: `👥 ${inst.name}` });
      });
    });
    return rows;
  }, [data.privateStudents, data.institutes]);

  const findStudent = (row: StudentRow) => {
    if (row.type === 'private') return data.privateStudents.find(s => s.id === row.id);
    for (const inst of data.institutes) {
      const s = inst.students.find(x => x.id === row.id);
      if (s) return s;
    }
    return undefined;
  };

  const getAttendanceBadge = (row: StudentRow) => {
    const session = data.sessions.find(
      s =>
        s.date === selectedDate &&
        ((row.type === 'private' && s.type === 'private' && s.studentId === row.id) ||
          (row.type === 'institute' && s.type === 'institute' && s.studentId === row.id))
    );
    if (!session) return { label: 'لا توجد حصة', ...chipColor(false) };
    if (session.status === 'done') return { label: '✅ حاضر', bg: 'rgba(52,211,153,0.15)', border: '#34d399', text: '#34d399' };
    if (session.status === 'cancel') return { label: '❌ ملغاة', bg: 'rgba(248,113,113,0.15)', border: '#f87171', text: '#f87171' };
    if (session.status === 'postponed') return { label: '🕓 مؤجلة', bg: 'rgba(96,165,250,0.15)', border: '#60a5fa', text: '#60a5fa' };
    return { label: '⏰ قادمة', bg: 'rgba(251,191,36,0.15)', border: '#fbbf24', text: '#fbbf24' };
  };

  const getHomeworkBadge = (row: StudentRow) => {
    const student = findStudent(row);
    const record = student?.homework?.find(h => h.date === selectedDate);
    if (!record) return { label: 'غير مسجل', ...chipColor(false) };
    if (record.status === 'written') return { label: '✅ كتب الواجب', bg: 'rgba(52,211,153,0.15)', border: '#34d399', text: '#34d399' };
    if (record.status === 'late') return { label: '⏳ متأخر', ...chipColor(true, 'warn') };
    return { label: '❌ لم ينجز', bg: 'rgba(248,113,113,0.15)', border: '#f87171', text: '#f87171' };
  };

  const cycleRecitation = async (row: StudentRow) => {
    const student = findStudent(row);
    const current = student?.dailyTracking?.find(t => t.date === selectedDate)?.recitation;
    const currentIdx = RECITATION_CYCLE.indexOf(current);
    const next = RECITATION_CYCLE[(currentIdx + 1) % RECITATION_CYCLE.length];
    updateDailyTracking(row.type, row.id, selectedDate, { recitation: next });
    await saveData();
  };

  const cycleExams = async (row: StudentRow) => {
    const student = findStudent(row);
    const current = student?.dailyTracking?.find(t => t.date === selectedDate)?.exams;
    const currentIdx = RECITATION_CYCLE.indexOf(current);
    const next = RECITATION_CYCLE[(currentIdx + 1) % RECITATION_CYCLE.length];
    updateDailyTracking(row.type, row.id, selectedDate, { exams: next });
    await saveData();
  };

  const cycleInteraction = async (row: StudentRow) => {
    const student = findStudent(row);
    const current = student?.dailyTracking?.find(t => t.date === selectedDate)?.interaction;
    const currentIdx = INTERACTION_CYCLE.indexOf(current);
    const next = INTERACTION_CYCLE[(currentIdx + 1) % INTERACTION_CYCLE.length];
    updateDailyTracking(row.type, row.id, selectedDate, { interaction: next });
    await saveData();
  };

  const Chip = ({
    label,
    bg,
    border,
    text,
    onPress,
  }: {
    label: string;
    bg: string;
    border: string;
    text: string;
    onPress?: () => void;
  }) => {
    const content = (
      <View
        className="rounded-full px-2 py-1 border items-center justify-center"
        style={{ backgroundColor: bg, borderColor: border }}
      >
        <Text style={{ color: text }} className="text-[10px] font-bold">
          {label}
        </Text>
      </View>
    );
    return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
  };

  return (
    <ScreenContainer className="bg-[#0d0f1a]">
      {/* Header */}
      <View className="bg-[#111320] border-b border-[#1e2138] px-4 py-4 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-[#181b2e] border border-[#1e2138] items-center justify-center active:opacity-70"
        >
          <Text className="text-[#a0a4c0] text-lg">→</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-[#eceef8]">📋 المتابعة اليومية</Text>
          <Text className="text-xs text-[#a0a4c0] mt-1">
            {getArabicDayName(selectedDate)} · {getArabicDate(selectedDate)}
          </Text>
        </View>
      </View>

      {/* Date strip */}
      <View className="border-b border-[#1e2138] py-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          <View className="flex-row gap-2">
            {dateStrip.map(date => {
              const isSelected = date === selectedDate;
              const isToday = date === getTodayDate();
              return (
                <Pressable
                  key={date}
                  onPress={() => setSelectedDate(date)}
                  className={`w-14 h-16 rounded-xl items-center justify-center border ${
                    isSelected ? 'bg-[#7c6efa] border-[#7c6efa]' : 'bg-[#181b2e] border-[#1e2138]'
                  }`}
                >
                  <Text className={`text-[10px] ${isSelected ? 'text-white' : 'text-[#636685]'}`}>
                    {SHORT_DAY_NAMES[getArabicDayName(date)] || getArabicDayName(date)}
                  </Text>
                  <Text className={`text-base font-bold mt-1 ${isSelected ? 'text-white' : isToday ? 'text-[#b39dff]' : 'text-[#eceef8]'}`}>
                    {new Date(`${date}T00:00:00`).getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Students list */}
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        {students.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-4xl mb-3">📋</Text>
            <Text className="text-base font-bold text-[#eceef8]">لا يوجد طلاب بعد</Text>
          </View>
        ) : (
          students.map(row => {
            const attendance = getAttendanceBadge(row);
            const homework = getHomeworkBadge(row);
            const student = findStudent(row);
            const tracking = student?.dailyTracking?.find(t => t.date === selectedDate);

            return (
              <View key={`${row.type}-${row.id}`} className="bg-[#181b2e] border border-[#1e2138] rounded-2xl p-3 mb-3">
                <Text className="text-sm font-bold text-[#eceef8]">{row.name}</Text>
                <Text className="text-[11px] text-[#636685] mt-0.5 mb-3">{row.groupLabel}</Text>

                <View className="flex-row flex-wrap gap-2">
                  <Chip label={`حضور: ${attendance.label}`} bg={attendance.bg} border={attendance.border} text={attendance.text} />
                  <Chip label={`واجب: ${homework.label}`} bg={homework.bg} border={homework.border} text={homework.text} />
                  <Chip
                    label={`تسميع: ${tracking?.recitation ? RECITATION_LABELS[tracking.recitation] : 'غير مسجل'}`}
                    {...chipColor(!!tracking?.recitation)}
                    onPress={() => cycleRecitation(row)}
                  />
                  <Chip
                    label={`امتحان: ${tracking?.exams ? RECITATION_LABELS[tracking.exams] : 'غير مسجل'}`}
                    {...chipColor(!!tracking?.exams)}
                    onPress={() => cycleExams(row)}
                  />
                  <Chip
                    label={`تفاعل: ${tracking?.interaction ? INTERACTION_LABELS[tracking.interaction] : 'غير مسجل'}`}
                    {...chipColor(!!tracking?.interaction)}
                    onPress={() => cycleInteraction(row)}
                  />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
