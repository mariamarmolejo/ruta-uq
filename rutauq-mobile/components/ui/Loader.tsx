import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Colors } from '@/constants/colors';

interface LoaderProps {
  message?: string;
}

export function Loader({ message }: LoaderProps) {
  return (
    <View className="flex-1 items-center justify-center bg-neutral-50">
      <ActivityIndicator size="large" color={Colors.primary[600]} />
      {message && (
        <Text className="mt-3 text-neutral-500 text-sm">{message}</Text>
      )}
    </View>
  );
}

export function InlineLoader() {
  return (
    <View className="py-8 items-center">
      <ActivityIndicator size="small" color={Colors.primary[600]} />
    </View>
  );
}
