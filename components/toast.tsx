import React, { useState, useCallback } from 'react';
import { View, Text, Animated } from 'react-native';

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;
let showToastCallback: ((message: ToastMessage) => void) | null = null;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = String(toastId++);
    const message: ToastMessage = { id, text, type };
    
    setToasts(prev => [...prev, message]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}

export function ToastContainer({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: string) => void }) {
  return (
    <View className="absolute bottom-8 left-4 right-4 z-50">
      {toasts.map(toast => (
        <View
          key={toast.id}
          className={`mb-2 rounded-full px-4 py-3 flex-row items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-[#34d399]'
              : toast.type === 'error'
              ? 'bg-[#f87171]'
              : 'bg-[#7c6efa]'
          }`}
        >
          <Text className="text-white font-semibold text-sm flex-1">{toast.text}</Text>
        </View>
      ))}
    </View>
  );
}
