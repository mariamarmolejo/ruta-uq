import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Mail, ArrowLeft } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Button } from '@/components/ui';
import { authService } from '@/services/auth.service';
import { getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await authService.resendVerification(email);
      Toast.show({
        type: 'success',
        text1: 'Correo enviado',
        text2: 'Revisa tu bandeja de entrada',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: getErrorMessage(err),
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 px-6 items-center justify-center">
        {/* Icon */}
        <View className="w-20 h-20 bg-primary-100 rounded-full items-center justify-center mb-6">
          <Mail size={40} color={Colors.primary[600]} />
        </View>

        <Text className="text-2xl font-bold text-neutral-900 text-center mb-2">
          Verifica tu correo
        </Text>
        <Text className="text-neutral-600 text-center mb-2">
          Enviamos un enlace de verificación a:
        </Text>
        {email && (
          <Text className="text-primary-600 font-semibold text-center mb-6">
            {email}
          </Text>
        )}
        <Text className="text-neutral-500 text-center text-sm mb-8">
          Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
          Si no lo encuentras, revisa la carpeta de spam.
        </Text>

        <Button
          onPress={handleResend}
          loading={resending}
          variant="outline"
          className="w-full mb-4"
        >
          Reenviar correo de verificación
        </Button>

        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => router.replace('/(auth)/login')}
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio de sesión"
        >
          <ArrowLeft size={16} color={Colors.neutral[500]} />
          <Text className="ml-1 text-neutral-600">Volver al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
