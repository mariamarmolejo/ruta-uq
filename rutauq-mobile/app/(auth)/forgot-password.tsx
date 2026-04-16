import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Input, Button } from '@/components/ui';
import { forgotPasswordSchema, type ForgotPasswordForm } from '@/lib/validations';
import { authService } from '@/services/auth.service';
import { getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';

export default function ForgotPasswordScreen() {
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setSentEmail(data.email);
      setSent(true);
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

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50">
        <View className="flex-1 px-6 items-center justify-center">
          <CheckCircle size={64} color={Colors.success} />
          <Text className="text-2xl font-bold text-neutral-900 text-center mt-4 mb-2">
            Correo enviado
          </Text>
          <Text className="text-neutral-600 text-center mb-2">
            Si existe una cuenta con el correo:
          </Text>
          <Text className="text-primary-600 font-semibold text-center mb-4">
            {sentEmail}
          </Text>
          <Text className="text-neutral-500 text-center text-sm mb-8">
            Recibirás un enlace para restablecer tu contraseña.
            Revisa también tu carpeta de spam.
          </Text>
          <Button
            variant="outline"
            onPress={() => router.replace('/(auth)/login')}
            className="w-full"
          >
            Volver al inicio de sesión
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
          {/* Back */}
          <TouchableOpacity
            className="flex-row items-center mb-8"
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <ArrowLeft size={20} color={Colors.neutral[700]} />
            <Text className="ml-2 text-neutral-700 font-medium">Volver</Text>
          </TouchableOpacity>

          <View className="items-center mb-8">
            <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center mb-4">
              <Mail size={32} color={Colors.primary[600]} />
            </View>
            <Text className="text-2xl font-bold text-neutral-900 text-center">
              ¿Olvidaste tu contraseña?
            </Text>
            <Text className="text-neutral-500 text-center mt-2">
              Ingresa tu correo y te enviaremos un enlace para restablecerla.
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Correo electrónico"
                  placeholder="correo@uniquindio.edu.co"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                  accessibilityLabel="Correo electrónico"
                />
              )}
            />

            <Button
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              size="lg"
            >
              Enviar enlace de recuperación
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
