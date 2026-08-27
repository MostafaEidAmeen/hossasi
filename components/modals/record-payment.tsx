import React, { useState } from 'react';
import { AppModal, FormField, FormButton } from '../modal';
import { useAppContext } from '@/lib/app-context';
import { useToast } from '../toast';

interface RecordPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  target: { type: 'private' | 'institute'; id: string; name: string } | null;
}

export function RecordPaymentModal({ visible, onClose, target }: RecordPaymentModalProps) {
  const { recordPayment, saveData } = useAppContext();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');

  const handleSave = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      showToast('من فضلك أدخل مبلغاً صحيحاً', 'error');
      return;
    }
    if (!target) return;
    recordPayment(target.type, target.id, value);
    await saveData();
    showToast('✅ تم تسجيل الدفعة', 'success');
    setAmount('');
    onClose();
  };

  return (
    <AppModal visible={visible} title={`💳 تسجيل دفع${target ? ' — ' + target.name : ''}`} onClose={onClose}>
      <FormField
        label="المبلغ المدفوع (د.ك)"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.000"
        keyboardType="numeric"
      />
      <FormButton title="حفظ" onPress={handleSave} variant="primary" />
      <FormButton title="إلغاء" onPress={onClose} variant="secondary" />
    </AppModal>
  );
}
