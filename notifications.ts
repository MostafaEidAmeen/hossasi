import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Session } from './storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady = false;
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync('session-reminders', {
    name: 'تذكير الحصص',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  channelReady = true;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

function sessionDateTime(session: Session): Date {
  const [hours, minutes] = session.time.split(':').map(Number);
  const date = new Date(`${session.date}T00:00:00`);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function sessionDisplayName(session: Session): string {
  if (session.type === 'private') return session.studentName || 'الطالب';
  return session.studentName ? `${session.studentName} (${session.instituteName})` : session.instituteName || 'المعهد';
}

/** Schedules two local reminders (60 and 30 minutes before) for a pending session happening today or later. Silently skips past times. */
export async function scheduleSessionReminders(session: Session): Promise<void> {
  if (session.status !== 'pending') return;
  const granted = await requestNotificationPermission();
  if (!granted) return;
  await ensureAndroidChannel();

  const sessionTime = sessionDateTime(session);
  const name = sessionDisplayName(session);
  const offsets: { minutesBefore: number; suffix: string; label: string }[] = [
    { minutesBefore: 60, suffix: '60', label: 'خلال ساعة' },
    { minutesBefore: 30, suffix: '30', label: 'خلال نصف ساعة' },
  ];

  for (const { minutesBefore, suffix, label } of offsets) {
    const triggerDate = new Date(sessionTime.getTime() - minutesBefore * 60 * 1000);
    if (triggerDate.getTime() <= Date.now()) continue; // don't schedule reminders in the past

    await Notifications.scheduleNotificationAsync({
      identifier: `session-${session.id}-${suffix}`,
      content: {
        title: '⏰ تذكير حصة',
        body: `حصة ${name} ${label} — الساعة ${session.time}`,
        sound: true,
        data: { sessionId: session.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }
}

/** Cancels both reminders (60/30 min) for a session — call when it's marked done/cancelled/postponed/deleted or its time changes. */
export async function cancelSessionReminders(sessionId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`session-${sessionId}-60`);
    await Notifications.cancelScheduledNotificationAsync(`session-${sessionId}-30`);
  } catch {
    // no-op if they were never scheduled
  }
}

/** Re-schedules reminders for a session — cancels any existing ones first (use after editing time/date/status back to pending). */
export async function rescheduleSessionReminders(session: Session): Promise<void> {
  await cancelSessionReminders(session.id);
  await scheduleSessionReminders(session);
}

/** Schedules reminders for every pending session today or later — used when the "تذكير حصص اليوم" setting is turned on. */
export async function scheduleAllPendingReminders(sessions: Session[]): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;
  for (const session of sessions) {
    if (session.status === 'pending') {
      await scheduleSessionReminders(session);
    }
  }
}

/** Cancels every scheduled session reminder — used when the "تذكير حصص اليوم" setting is turned off. */
export async function cancelAllSessionReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Fires an immediate test notification so the teacher can confirm notifications are working on their device. */
export async function sendTestNotification(): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ تذكير حصة (تجريبي)',
      body: 'هذا إشعار تجريبي — لو وصلك، الإشعارات شغالة تمام ✅',
      sound: true,
    },
    trigger: null,
  });
  return true;
}
