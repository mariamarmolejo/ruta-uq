import React from 'react';
import { View, Text } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Button } from './Button';

interface ErrorStateProps {
  message:  string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-6">
      <AlertCircle size={48} color={Colors.danger} className="mb-4" />
      <Text className="text-lg font-semibold text-neutral-700 text-center mb-2">
        Algo salió mal
      </Text>
      <Text className="text-neutral-500 text-center mb-6">{message}</Text>
      {onRetry && (
        <Button variant="outline" onPress={onRetry} size="md">
          Intentar de nuevo
        </Button>
      )}
    </View>
  );
}
