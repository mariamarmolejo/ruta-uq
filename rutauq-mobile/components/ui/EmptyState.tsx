import React from 'react';
import { View, Text } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Button } from './Button';

interface EmptyStateProps {
  title:        string;
  description?: string;
  actionLabel?: string;
  onAction?:    () => void;
  icon?:        React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-6">
      <View className="mb-4">
        {icon ?? <Inbox size={48} color={Colors.neutral[400]} />}
      </View>
      <Text className="text-lg font-semibold text-neutral-700 text-center mb-2">
        {title}
      </Text>
      {description && (
        <Text className="text-neutral-500 text-center mb-6">{description}</Text>
      )}
      {actionLabel && onAction && (
        <Button onPress={onAction} size="md">
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
