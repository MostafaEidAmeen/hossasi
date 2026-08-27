import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { ScreenContainer } from '@/components/screen-container';
import { useAppContext } from '@/lib/app-context';
import { storage } from '@/lib/storage';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const { setAuthenticated } = useAppContext();

  useEffect(() => {
    initializeLogin();
  }, []);

  const initializeLogin = async () => {
    const pin = await storage.getPin();
    setSavedPin(pin);
    setIsFirstTime(!pin);

    // Check biometric availability
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    } catch (error) {
      console.error('Biometric error:', error);
    }
  };

  const handleNumberPress = (num: string) => {
    if (pin.length < 4) {
      setPin(pin + num);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      Alert.alert('خطأ', 'الرمز السري يجب أن يكون 4 أرقام');
      return;
    }

    if (isFirstTime) {
      // Save PIN for first time
      await storage.setPin(pin);
      setSavedPin(pin);
      setAuthenticated(true);
      router.replace('/(tabs)');
    } else {
      // Verify PIN
      if (pin === savedPin) {
        setAuthenticated(true);
        router.replace('/(tabs)');
      } else {
        Alert.alert('خطأ', 'الرمز السري غير صحيح');
        setPin('');
      }
    }
  };

  const handleBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
      });

      if (result.success) {
        setAuthenticated(true);
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Biometric error:', error);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-[#0d0f1a]" className="flex items-center justify-center">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} scrollEnabled={false}>
        <View className="flex-1 items-center justify-center px-6">
          {/* Logo */}
          <View className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7c6efa] to-[#b39dff] items-center justify-center mb-6 shadow-lg">
            <Text className="text-4xl">📒</Text>
          </View>

          {/* Title */}
          <Text className="text-3xl font-bold text-[#eceef8] mb-1">حصصي</Text>
          <Text className="text-sm text-[#a0a4c0] mb-12">إدارة حصصك بكل سهولة</Text>

          {/* PIN Display */}
          <View className="flex-row gap-3 mb-12">
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                className={`w-4 h-4 rounded-full border-2 ${
                  i < pin.length
                    ? 'bg-[#7c6efa] border-[#7c6efa]'
                    : 'bg-[#252944] border-[#1e2138]'
                }`}
              />
            ))}
          </View>

          {/* Biometric Button */}
          {biometricAvailable && !isFirstTime && (
            <Pressable
              onPress={handleBiometric}
              className="mb-8 items-center gap-2"
            >
              <View className="w-28 h-28 rounded-full border-2 border-[#7c6efa] items-center justify-center bg-[#181b2e] active:opacity-70">
                <Text className="text-5xl">👆</Text>
              </View>
              <Text className="text-xs text-[#a0a4c0]">البصمة</Text>
            </Pressable>
          )}

          {/* Numeric Keypad */}
          <View className="w-full max-w-xs">
            <View className="grid grid-cols-3 gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <Pressable
                  key={num}
                  onPress={() => handleNumberPress(num.toString())}
                  className="h-16 rounded-2xl bg-[#181b2e] border border-[#1e2138] items-center justify-center active:bg-[#7c6efa] active:scale-95"
                >
                  <Text className="text-2xl font-bold text-[#eceef8]">{num}</Text>
                </Pressable>
              ))}
            </View>

            {/* Bottom Row: 0 and Delete */}
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => handleNumberPress('0')}
                className="flex-1 h-16 rounded-2xl bg-[#181b2e] border border-[#1e2138] items-center justify-center active:bg-[#7c6efa] active:scale-95"
              >
                <Text className="text-2xl font-bold text-[#eceef8]">0</Text>
              </Pressable>

              <Pressable
                onPress={handleDelete}
                className="flex-1 h-16 rounded-2xl bg-[#181b2e] border border-[#1e2138] items-center justify-center active:bg-[#f87171] active:scale-95"
              >
                <Text className="text-xl text-[#a0a4c0]">⌫</Text>
              </Pressable>
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            className="w-full max-w-xs mt-8 h-14 rounded-2xl bg-[#7c6efa] items-center justify-center active:bg-[#6457e0] active:scale-95"
          >
            <Text className="text-white font-bold text-lg">
              {isFirstTime ? 'إنشاء الرمز' : 'دخول'}
            </Text>
          </Pressable>

          {/* Hint */}
          {isFirstTime && (
            <Text className="text-xs text-[#636685] mt-6 text-center">
              أدخل رمز سري 4 أرقام لحماية بيانات حصصك
            </Text>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
