import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Input, Button } from '@/components/ui';
import { resetPasswordSchema, type ResetPasswordForm } from '@/lib/validations';
import { authService } from '@/services/auth.service';
import { getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      Toast.show({ type: 'error', text1: 'Token inválido o expirado' });
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token, data.password);
      setSuccess(true);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50">
        <View className="flex-1 px-6 items-center justify-center">
          <CheckCircle size={64} color={Colors.success} />
          <Text className="text-2xl font-bold text-neutral-900 text-center mt-4 mb-2">
            Contraseña restablecida
          </Text>
          <Text className="text-neutral-600 text-center mb-8">
            Tu contraseña ha sido actualizada exitosamente.
          </Text>
          <Button
            onPress={() => router.replace('/(auth)/login')}
            className="w-full"
          >
            Iniciar sesión
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-8">
            <Text className="text-2xl font-bold text-neutral-900 text-center">
              Nueva contraseña
            </Text>
            <Text className="text-neutral-500 text-center mt-2">
              Ingresa tu nueva contraseña para recuperar el acceso.
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Nueva contraseña"
                  placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  error={errors.password?.message}
                  accessibilityLabel="Nueva contraseña"
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirmar contraseña"
                  placeholder="Repite tu nueva contraseña"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  error={errors.confirmPassword?.message}
                  accessibilityLabel="Confirmar contraseña"
                />
              )}
            />

            <Button
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              size="lg"
            >
              Restablecer contraseña
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
