import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import { Button } from '@/components/ui';
import { authService } from '@/services/auth.service';
import { getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Token de verificación no encontrado.');
      return;
    }

    authService
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setErrorMsg(getErrorMessage(err));
      });
  }, [token]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 px-6 items-center justify-center">
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={Colors.primary[600]} />
            <Text className="mt-4 text-neutral-600">Verificando tu correo...</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={64} color={Colors.success} />
            <Text className="text-2xl font-bold text-neutral-900 text-center mt-4 mb-2">
              ¡Correo verificado!
            </Text>
            <Text className="text-neutral-600 text-center mb-8">
              Tu cuenta ha sido activada exitosamente. Ya puedes iniciar sesión.
            </Text>
            <Button
              onPress={() => router.replace('/(auth)/login')}
              className="w-full"
            >
              Iniciar sesión
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={64} color={Colors.danger} />
            <Text className="text-2xl font-bold text-neutral-900 text-center mt-4 mb-2">
              Error de verificación
            </Text>
            <Text className="text-neutral-600 text-center mb-8">{errorMsg}</Text>
            <Button
              variant="outline"
              onPress={() => router.replace('/(auth)/login')}
              className="w-full"
            >
              Volver al inicio
            </Button>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
