import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  type ModalProps,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Button } from './Button';

interface ConfirmModalProps {
  visible:       boolean;
  title:         string;
  message:       string;
  confirmLabel?: string;
  cancelLabel?:  string;
  confirmVariant?: 'primary' | 'danger';
  loading?:      boolean;
  onConfirm:     () => void;
  onCancel:      () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel  = 'Confirmar',
  cancelLabel   = 'Cancelar',
  confirmVariant = 'primary',
  loading,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white rounded-2xl w-full max-w-sm p-6">
          <View className="flex-row items-start justify-between mb-3">
            <Text className="text-lg font-bold text-neutral-900 flex-1 mr-2">
              {title}
            </Text>
            <TouchableOpacity
              onPress={onCancel}
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
            >
              <X size={20} color={Colors.neutral[500]} />
            </TouchableOpacity>
          </View>
          <Text className="text-neutral-600 mb-6">{message}</Text>
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              size="sm"
              onPress={onCancel}
              className="flex-1"
            >
              {cancelLabel}
            </Button>
            <Button
              variant={confirmVariant}
              size="sm"
              onPress={onConfirm}
              loading={loading}
              className="flex-1"
            >
              {confirmLabel}
            </Button>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

interface InfoModalProps extends Omit<ModalProps, 'children'> {
  title:    string;
  onClose:  () => void;
  children: React.ReactNode;
}

export function InfoModal({ title, onClose, children, ...props }: InfoModalProps) {
  return (
    <RNModal transparent animationType="slide" onRequestClose={onClose} {...props}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6 max-h-4/5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-neutral-900">{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <X size={22} color={Colors.neutral[500]} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </RNModal>
  );
}
