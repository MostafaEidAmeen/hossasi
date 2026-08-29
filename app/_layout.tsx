import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

import { ThemeProvider } from '@/lib/theme-provider';
import { AppProvider, useAppContext } from '@/lib/app-context';
import { scheduleAllPendingReminders, requestNotificationPermission } from '@/lib/notifications';
import { getTodayDate } from '@/lib/storage';
import { applyRTLAndCheckIfJustEnabled } from '@/lib/rtl';

SplashScreen.preventAutoHideAsync();

const rtlJustEnabled = applyRTLAndCheckIfJustEnabled();

function RootLayoutContent() {
  const { isAuthenticated, data, isLoading, generateTodaySessions, updateSettings, saveData } = useAppContext();

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    if (!data.settings?.notifySessions) return;
    (async () => {
      try {
        const granted = await requestNotificationPermission();
        if (!granted) return;
        const pending = data.sessions.filter((s) => s.status === 'pending');
        await scheduleAllPendingReminders(pending);
      } catch (error) {
        console.warn('Notification scheduling skipped:', error);
      }
    })();
  }, [isAuthenticated, isLoading, data.sessions, data.settings?.notifySessions]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    if (!data.settings?.autoGenerateSessions) return;
    const today = getTodayDate();
    if (data.settings.lastAutoGenDate === today) return;
    generateTodaySessions();
    updateSettings({ lastAutoGenDate: today });
    saveData();
  }, [isAuthenticated, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0d0f1a' } }}>
      {!isAuthenticated ? (
        <Stack.Screen name="login" options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({});

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !rtlJustEnabled) return;
    Alert.alert(
      'إعادة تشغيل مطلوبة',
      'تم تفعيل عرض التطبيق من اليمين لليسار. أغلق التطبيق تمامًا وافتحه تاني عشان الشكل يتظبط بالكامل.',
      [{ text: 'حسنًا' }]
    );
  }, [loaded]);

  return (
    <ThemeProvider>
      <AppProvider>
        <RootLayoutContent />
      </AppProvider>
    </ThemeProvider>
  );
}
