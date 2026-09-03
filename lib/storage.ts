import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export type SessionStatus = 'pending' | 'done' | 'cancel' | 'postponed';
export type SessionType = 'private' | 'institute';

export type HomeworkStatus = 'written' | 'not_done' | 'late';

export interface HomeworkRecord {
  id: string;
  date: string;
  status: HomeworkStatus;
  details?: string;
}

export type TrackStatus = 'excellent' | 'good' | 'weak';
export type InteractionStatus = 'interactive' | 'not_interactive';

export interface DailyTrackingRecord {
  date: string;
  recitation?: TrackStatus;
  exams?: TrackStatus;
  interaction?: InteractionStatus;
}

export interface PrivateStudent {
  id: string;
  name: string;
  grade: string;
  address?: string;
  phone?: string;
  price: string;
  target: number;
  /** Recurring weekly schedule (optional) — used to render the weekly schedule view. */
  days?: string[];
  time?: string;
  notes?: string;
  /** Cumulative amount paid this billing cycle — reset when the student is renewed. */
  paidThisMonth?: number;
  /** Calendar month (YYYY-MM) that paidThisMonth was recorded in; used to auto-reset on rollover. */
  paidMonthTag?: string;
  homework?: HomeworkRecord[];
  dailyTracking?: DailyTrackingRecord[];
}

export interface InstituteStudent {
  id: string;
  name: string;
  grade: string;
  phone?: string;
  /** Parent/guardian WhatsApp number, used for cancellation/postponement alerts. */
  parentPhone?: string;
  /** This student's own recurring schedule within the institute (optional — can differ from the group's). */
  days?: string[];
  time?: string;
  notes?: string;
  /** Cumulative amount paid this billing cycle. */
  paidThisMonth?: number;
  /** Calendar month (YYYY-MM) that paidThisMonth was recorded in; used to auto-reset on rollover. */
  paidMonthTag?: string;
  homework?: HomeworkRecord[];
  dailyTracking?: DailyTrackingRecord[];
}

export type GroupType = 'institute' | 'own';

export interface Institute {
  id: string;
  name: string;
  defaultPrice: string;
  days: string[];
  /** Recurring session time (optional) — used to render the weekly schedule view. */
  time?: string;
  students: InstituteStudent[];
  /** 'institute' = an external center you teach at; 'own' = a group class you run yourself. Defaults to 'institute' for existing data. */
  groupType?: GroupType;
}

export interface Session {
  id: string;
  date: string;
  time: string;
  type: SessionType;
  studentId?: string;
  studentName?: string;
  instituteId?: string;
  instituteName?: string;
  price: string;
  status: SessionStatus;
  cancelReason?: string;
  /** Set when status === 'postponed': the new date/time the session moved to. */
  postponedDate?: string;
  postponedTime?: string;
  archived?: boolean;
}

export interface AppSettings {
  notifySessions: boolean;
  notifyLatePayments: boolean;
  notifyPackageEnding: boolean;
  waCountryCode: string;
  reportsButtonEnabled: boolean;
  reportsButtonDay: number;
  autoGenerateSessions: boolean;
  lastAutoGenDate?: string;
  theme: 'light' | 'dark';
}

export interface AppData {
  privateStudents: PrivateStudent[];
  institutes: Institute[];
  sessions: Session[];
  pin?: string;
  settings?: AppSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  notifySessions: true,
  notifyLatePayments: true,
  notifyPackageEnding: true,
  waCountryCode: '965',
  reportsButtonEnabled: true,
  reportsButtonDay: 1,
  autoGenerateSessions: true,
  theme: 'dark',
};

const STORAGE_KEY = 'hossasi_data';
const PIN_KEY = 'hossasi_pin';

export const storage = {
  async getData(): Promise<AppData> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : getDefaultData();
    } catch (error) {
      console.error('Error loading data:', error);
      return getDefaultData();
    }
  },

  async saveData(data: AppData): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  },

  async getPin(): Promise<string | null> {
    try {
      const securePin = await SecureStore.getItemAsync(PIN_KEY);
      if (securePin) return securePin;

      // One-time migration: older versions stored the PIN in plain AsyncStorage.
      // If we find one there, move it into SecureStore and wipe the insecure copy.
      const legacyPin = await AsyncStorage.getItem(PIN_KEY);
      if (legacyPin) {
        await SecureStore.setItemAsync(PIN_KEY, legacyPin);
        await AsyncStorage.removeItem(PIN_KEY);
        return legacyPin;
      }
      return null;
    } catch (error) {
      console.error('Error loading PIN:', error);
      return null;
    }
  },

  async setPin(pin: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(PIN_KEY, pin);
    } catch (error) {
      console.error('Error saving PIN:', error);
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY, PIN_KEY]);
      await SecureStore.deleteItemAsync(PIN_KEY).catch(() => {});
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  },
};

function getDefaultData(): AppData {
  return {
    privateStudents: [],
    institutes: [],
    sessions: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getTodayDate(): string {
  return formatDate(new Date());
}

export function isThisMonth(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

export function getDaysInMonth(): number {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
}

export function getDaysLeftInMonth(): number {
  const today = new Date();
  const daysInMonth = getDaysInMonth();
  return daysInMonth - today.getDate();
}

export function getCurrentMonthTag(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Returns paidThisMonth if it was recorded in the current calendar month, otherwise 0 (auto-resets on month rollover). */
export function paidInCurrentMonth(entity: { paidThisMonth?: number; paidMonthTag?: string }): number {
  if (entity.paidMonthTag !== getCurrentMonthTag()) return 0;
  return entity.paidThisMonth || 0;
}

export function getThisMonthLabel(): string {
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

/** Sessions counted as "done" this month for a private student. */
export function countDonePrivateSessions(data: AppData, studentId: string): number {
  return data.sessions.filter(
    s => s.type === 'private' && s.studentId === studentId && isThisMonth(s.date) && s.status === 'done' && !s.archived
  ).length;
}

/** Sessions counted as "done" this month for a specific institute student (only sessions explicitly linked to them). */
export function countDoneInstituteStudentSessions(data: AppData, studentId: string): number {
  return data.sessions.filter(
    s => s.type === 'institute' && s.studentId === studentId && isThisMonth(s.date) && s.status === 'done'
  ).length;
}

/** Amount expected this month for a private or institute student, based on each completed session's own recorded price — not the student/institute's current price, so editing a price later never rewrites past revenue. */
export function expectedThisMonth(data: AppData, type: 'private' | 'institute', studentId: string): number {
  if (type === 'private') {
    const student = data.privateStudents.find(s => s.id === studentId);
    const fallbackPrice = student?.price || '0';
    return data.sessions
      .filter(
        s => s.type === 'private' && s.studentId === studentId && isThisMonth(s.date) && s.status === 'done' && !s.archived
      )
      .reduce((sum, s) => sum + parseFloat(s.price || fallbackPrice), 0);
  }
  let fallbackPrice = '0';
  for (const inst of data.institutes) {
    const student = inst.students.find(s => s.id === studentId);
    if (student) {
      fallbackPrice = inst.defaultPrice || '0';
      break;
    }
  }
  return data.sessions
    .filter(s => s.type === 'institute' && s.studentId === studentId && isThisMonth(s.date) && s.status === 'done')
    .reduce((sum, s) => sum + parseFloat(s.price || fallbackPrice), 0);
}

export interface LatePayer {
  type: 'private' | 'institute';
  id: string;
  name: string;
  remaining: number;
}

/** Students whose paidThisMonth is short of what their completed sessions this month are worth. */
export function getLatePayers(data: AppData): LatePayer[] {
  const list: LatePayer[] = [];
  data.privateStudents.forEach(ps => {
    const expected = expectedThisMonth(data, 'private', ps.id);
    const paid = paidInCurrentMonth(ps);
    if (expected - paid > 0.001) list.push({ type: 'private', id: ps.id, name: ps.name, remaining: expected - paid });
  });
  data.institutes.forEach(inst => {
    inst.students.forEach(st => {
      const expected = expectedThisMonth(data, 'institute', st.id);
      const paid = paidInCurrentMonth(st);
      if (expected - paid > 0.001) {
        list.push({ type: 'institute', id: st.id, name: `${st.name} (${inst.name})`, remaining: expected - paid });
      }
    });
  });
  return list;
}

export interface PackageEnding {
  id: string;
  name: string;
  remaining: number;
}

/** Private students within 1-2 sessions of completing their monthly target (their "package"). */
export function getPackagesEnding(data: AppData): PackageEnding[] {
  return data.privateStudents
    .map(ps => {
      const done = countDonePrivateSessions(data, ps.id);
      const target = ps.target || 8;
      return { id: ps.id, name: ps.name, remaining: target - done };
    })
    .filter(p => p.remaining >= 1 && p.remaining <= 2);
}

/** Day names in JS Date.getDay() index order (0=Sunday..6=Saturday) — matches how days[] is stored on institutes/students. */
export const DAY_NAMES_BY_INDEX = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getTodayDayName(): string {
  return DAY_NAMES_BY_INDEX[new Date().getDay()];
}

function sessionAlreadyExists(
  data: AppData,
  type: SessionType,
  date: string,
  instituteId: string | undefined,
  studentId: string | undefined
): boolean {
  return data.sessions.some(s => {
    if (s.type !== type || s.date !== date) return false;
    if (type === 'private') return s.studentId === studentId;
    return s.instituteId === instituteId && (s.studentId || undefined) === (studentId || undefined);
  });
}

/** Computes the list of sessions that should be auto-created for today, based on recurring days/time — skips any that already exist. */
export function computeTodaySessionsToGenerate(data: AppData): Omit<Session, 'id'>[] {
  const today = getTodayDate();
  const todayName = getTodayDayName();
  const toCreate: Omit<Session, 'id'>[] = [];

  data.institutes.forEach(inst => {
    if ((inst.days || []).includes(todayName) && inst.time && !sessionAlreadyExists(data, 'institute', today, inst.id, undefined)) {
      toCreate.push({
        date: today,
        time: inst.time,
        type: 'institute',
        instituteId: inst.id,
        instituteName: inst.name,
        price: inst.defaultPrice || '0',
        status: 'pending',
      });
    }
    inst.students.forEach(st => {
      if ((st.days || []).includes(todayName) && st.time && !sessionAlreadyExists(data, 'institute', today, inst.id, st.id)) {
        toCreate.push({
          date: today,
          time: st.time,
          type: 'institute',
          instituteId: inst.id,
          instituteName: inst.name,
          studentId: st.id,
          studentName: st.name,
          price: inst.defaultPrice || '0',
          status: 'pending',
        });
      }
    });
  });

  data.privateStudents.forEach(ps => {
    if ((ps.days || []).includes(todayName) && ps.time && !sessionAlreadyExists(data, 'private', today, undefined, ps.id)) {
      toCreate.push({
        date: today,
        time: ps.time,
        type: 'private',
        studentId: ps.id,
        studentName: ps.name,
        price: ps.price || '0',
        status: 'pending',
      });
    }
  });

  return toCreate;
}


export interface QuickSummary {
  totalStudents: number;
  totalGroups: number;
  paidPercent: number;
  todayAttendancePercent: number | null;
}

export function getQuickSummary(data: AppData): QuickSummary {
  const totalStudents = data.privateStudents.length + data.institutes.reduce((a, i) => a + i.students.length, 0);
  const totalGroups = data.institutes.length;

  let expectedTotal = 0;
  let paidTotal = 0;
  data.privateStudents.forEach(ps => {
    expectedTotal += expectedThisMonth(data, 'private', ps.id);
    paidTotal += paidInCurrentMonth(ps);
  });
  data.institutes.forEach(inst =>
    inst.students.forEach(st => {
      expectedTotal += expectedThisMonth(data, 'institute', st.id);
      paidTotal += paidInCurrentMonth(st);
    })
  );
  const paidPercent = expectedTotal > 0 ? Math.round((paidTotal / expectedTotal) * 100) : 0;

  const today = getTodayDate();
  const todaySessions = data.sessions.filter(s => s.date === today);
  const todayDone = todaySessions.filter(s => s.status === 'done').length;
  const todayAttendancePercent = todaySessions.length > 0 ? Math.round((todayDone / todaySessions.length) * 100) : null;

  return { totalStudents, totalGroups, paidPercent, todayAttendancePercent };
}

export function getArabicDayName(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[date.getDay()];
}

export function getArabicDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  return `${day} ${month}`;
}

/** English day names (as stored on Institute.days / PrivateStudent.days) in week order. */
export const WEEK_DAYS_EN = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const DAY_EN_TO_AR: Record<string, string> = {
  Sunday: 'الأحد',
  Monday: 'الاثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
  Friday: 'الجمعة',
  Saturday: 'السبت',
};

export function dayEnToAr(day: string): string {
  return DAY_EN_TO_AR[day] || day;
}

/** Normalizes a Kuwait-style local number (8 digits) to international format for wa.me links. */
export function normalizePhoneForWhatsApp(phone: string, defaultCountryCode: string = '965'): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith(defaultCountryCode) || digits.length > 9) return digits;
  return `${defaultCountryCode}${digits}`;
}

export function getWhatsAppUrl(phone: string, message: string, defaultCountryCode: string = '965'): string {
  const normalized = normalizePhoneForWhatsApp(phone, defaultCountryCode);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/** Builds the Arabic notification message sent to a parent when a session is cancelled or postponed. */
export function buildParentAlertMessage(params: {
  studentName: string;
  date: string;
  time: string;
  status: 'cancel' | 'postponed';
  reason?: string;
  postponedDate?: string;
  postponedTime?: string;
}): string {
  const { studentName, date, time, status, reason, postponedDate, postponedTime } = params;
  const dateLabel = `${getArabicDayName(date)} ${getArabicDate(date)}`;
  const lines = [`السلام عليكم،`];

  if (status === 'cancel') {
    lines.push(`نود إبلاغكم بإلغاء حصة الطالب/ة ${studentName} المقررة يوم ${dateLabel} الساعة ${time}.`);
    if (reason) lines.push(`السبب: ${reason}`);
  } else {
    lines.push(`نود إبلاغكم بتأجيل حصة الطالب/ة ${studentName} المقررة يوم ${dateLabel} الساعة ${time}.`);
    if (postponedDate) {
      const newLabel = `${getArabicDayName(postponedDate)} ${getArabicDate(postponedDate)}`;
      lines.push(`الموعد الجديد: ${newLabel}${postponedTime ? ' الساعة ' + postponedTime : ''}.`);
    }
    if (reason) lines.push(`السبب: ${reason}`);
  }

  lines.push(`تحياتنا.`);
  return lines.join('\n');
}

/** Builds the Arabic monthly report message sent to a parent (attendance + payment summary). */
export function buildMonthlyReportMessage(params: {
  studentName: string;
  monthLabel: string;
  doneCount: number;
  expected: number;
  paid: number;
}): string {
  const { studentName, monthLabel, doneCount, expected, paid } = params;
  const remaining = Math.max(0, expected - paid);
  const lines = [
    `السلام عليكم،`,
    `تقرير شهر ${monthLabel} للطالب/ة ${studentName}:`,
    `عدد الحصص المكتملة: ${doneCount} حصة`,
    `الإجمالي المستحق: ${expected.toFixed(3)} د.ك`,
    `المدفوع: ${paid.toFixed(3)} د.ك`,
  ];
  if (remaining > 0.001) lines.push(`المتبقي: ${remaining.toFixed(3)} د.ك`);
  else lines.push(`تم سداد كامل المبلغ ✅`);
  lines.push(`تحياتنا.`);
  return lines.join('\n');
}

export const HOMEWORK_STATUS_LABELS: Record<HomeworkStatus, string> = {
  written: '✅ كتب الواجب',
  not_done: '❌ لم ينجز',
  late: '⏳ متأخر',
};

/** Builds the Arabic homework alert message sent to a parent. */
export function buildHomeworkMessage(params: {
  studentName: string;
  date: string;
  status: HomeworkStatus;
  details?: string;
}): string {
  const { studentName, date, status, details } = params;
  const lines = [
    `السلام عليكم،`,
    `يرجى الانتباه، واجب اليوم للطالب/ة ${studentName} (${getArabicDate(date)}):`,
    HOMEWORK_STATUS_LABELS[status],
  ];
  if (details) lines.push(details);
  lines.push(`تحياتنا.`);
  return lines.join('\n');
}
