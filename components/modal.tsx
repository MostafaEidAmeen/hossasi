import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput } from 'react-native';

interface ModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function AppModal({ visible, title, onClose, children }: ModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black bg-opacity-50 justify-end">
        <View className="bg-[#181b2e] rounded-t-3xl max-h-4/5">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-[#1e2138]">
            <Text className="text-lg font-bold text-[#eceef8]">{title}</Text>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 items-center justify-center active:opacity-70"
            >
              <Text className="text-2xl text-[#a0a4c0]">×</Text>
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView className="px-6 py-4">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  multiline?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-[#a0a4c0] uppercase tracking-wider mb-2">
        {label}
      </Text>
      <TextInput
        className="bg-[#111320] border border-[#1e2138] rounded-xl px-4 py-3 text-sm text-[#eceef8]"
        onChangeText={onChangeText}
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#636685"
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

export function FormButton({
  title,
  onPress,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const bgColor =
    variant === 'primary'
      ? 'bg-[#7c6efa]'
      : variant === 'secondary'
      ? 'bg-[#111320]'
      : 'bg-[#f87171]';

  const textColor =
    variant === 'secondary' ? 'text-[#a0a4c0]' : 'text-white';

  return (
    <Pressable
      onPress={onPress}
      className={`${bgColor} rounded-xl py-3 items-center active:opacity-80 mb-2`}
    >
      <Text className={`font-bold text-base ${textColor}`}>{title}</Text>
    </Pressable>
  );
}
