import '../global.css';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import 'react-native-reanimated';


import { ThemeProvider } from '@/lib/theme-provider';
import { AppProvider, useAppContext } from '@/lib/app-context';
import { scheduleAllPendingReminders, requestNotificationPermission } from '@/lib/notifications';
import { getTodayDate } from '@/lib/storage';
import { applyRTLAndCheckIfJustEnabled } from '@/lib/rtl';


SplashScreen.preventAutoHideAsync();


// Must run at module scope (before RootLayout ever renders) — I18nManager reads
// this native flag very early in the layout pipeline, well before any useEffect
// would fire. See lib/rtl.ts for why this can't take effect until next restart.
const rtlJustEnabled = applyRTLAndCheckIfJustEnabled();


function RootLayoutContent() {
  const { isAuthenticated, data, isLoading, generateTodaySessions, updateSettings, saveData } = useAppContext();


  // Re-arm today's session reminders whenever the app opens with the setting on —
  // scheduleSessionReminders() is idempotent per session id, so this is safe to repeat.
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    if (!data.settings?.notifySessions) return;
    (async () => {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      const pending = data.sessions.filter(s => s.status === 'pending');
      await scheduleAllPendingReminders(pending);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);


  // Auto-generate today's sessions from recurring schedules — once per calendar day.
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    if (!data.settings?.autoGenerateSessions) return;
    const today = getTodayDate();
    if (data.settings.lastAutoGenDate === today) return;
    generateTodaySessions();
    updateSettings({ lastAutoGenDate: today });
    saveData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);


  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0d0f1a' } }}>
      {!isAuthenticated ? (
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
          }}
        />
      ) : (
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
      )}
    </Stack>
  );
}
