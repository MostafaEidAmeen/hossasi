import React, { createContext, useContext, useMemo } from 'react';
import { AppSettings } from './storage';

export type Language = 'ar' | 'en';

type TranslationKey =
  | 'settings'
  | 'appearance'
  | 'language'
  | 'arabic'
  | 'english'
  | 'notifications'
  | 'sessionReminders'
  | 'sessionRemindersDescription'
  | 'testNotifications'
  | 'sendTestNotification'
  | 'weeklySchedule'
  | 'dailyTracking'
  | 'welcome'
  | 'trackSessionsAndRevenue'
  | 'todaySummary';

const translations: Record<Language, Record<TranslationKey, string>> = {
  ar: {
    settings: 'الإعدادات',
    appearance: 'المظهر',
    language: 'اللغة',
    arabic: 'العربية',
    english: 'English',
    notifications: 'الإشعارات',
    sessionReminders: 'تذكير الحصص',
    sessionRemindersDescription: 'تنبيه قبل الحصة بساعة، وتنبيه ثانٍ قبلها بنصف ساعة',
    testNotifications: 'اختبار الإشعارات',
    sendTestNotification: 'إرسال إشعار تجريبي الآن',
    weeklySchedule: 'الجدول الأسبوعي',
    dailyTracking: 'المتابعة اليومية',
    welcome: 'أهلاً بك',
    trackSessionsAndRevenue: 'تابع حصصك وأرباحك من هنا',
    todaySummary: 'ملخص اليوم',
  },
  en: {
    settings: 'Settings',
    appearance: 'Appearance',
    language: 'Language',
    arabic: 'العربية',
    english: 'English',
    notifications: 'Notifications',
    sessionReminders: 'Session reminders',
    sessionRemindersDescription: 'Notify one hour and thirty minutes before each session',
    testNotifications: 'Test notifications',
    sendTestNotification: 'Send a test notification now',
    weeklySchedule: 'Weekly schedule',
    dailyTracking: 'Daily tracking',
    welcome: 'Welcome',
    trackSessionsAndRevenue: 'Track your sessions and revenue here',
    todaySummary: "Today's summary",
  },
};

interface I18nContextValue {
  language: Language;
  isRTL: boolean;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ settings, children }: { settings: AppSettings; children: React.ReactNode }) {
  const language = settings.language ?? 'ar';
  const value = useMemo<I18nContextValue>(() => ({
    language,
    isRTL: language === 'ar',
    t: (key) => translations[language][key],
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
