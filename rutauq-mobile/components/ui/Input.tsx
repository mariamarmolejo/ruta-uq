import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { Colors } from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?:       string;
  error?:       string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  containerClassName,
  secureTextEntry,
  className,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View className={cn('mb-4', containerClassName)}>
      {label && (
        <Text className="text-sm font-medium text-neutral-700 mb-1">
          {label}
        </Text>
      )}
      <View className="relative">
        <TextInput
          className={cn(
            'border rounded-xl px-4 py-3 text-base text-neutral-900 bg-white',
            error
              ? 'border-red-500'
              : 'border-neutral-300 focus:border-primary-500',
            isPassword && 'pr-12',
            className
          )}
          placeholderTextColor={Colors.neutral[400]}
          secureTextEntry={isPassword && !showPassword}
          accessibilityLabel={label}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            className="absolute right-3 top-3"
            onPress={() => setShowPassword((v) => !v)}
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityRole="button"
          >
            {showPassword ? (
              <EyeOff size={20} color={Colors.neutral[500]} />
            ) : (
              <Eye size={20} color={Colors.neutral[500]} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text className="text-sm text-red-500 mt-1">{error}</Text>
      )}
    </View>
  );
}
