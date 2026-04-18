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
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { Input, Button } from '@/components/ui';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';
import { loginSchema, type LoginForm } from '@/lib/validations';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/lib/utils';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await authService.login(data);
      await setAuth(response);
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace('/(app)/trips');
    } catch (err) {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Toast.show({
        type: 'error',
        text1: 'Error al iniciar sesión',
        text2: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleToken = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const result = await authService.googleLogin(idToken);
      await setAuth(result);
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace('/(app)/trips');
    } catch (err) {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Toast.show({
        type: 'error',
        text1: 'Error al iniciar sesión con Google',
        text2: getErrorMessage(err),
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = (message: string) => {
    Toast.show({ type: 'error', text1: 'Error con Google', text2: message });
  };

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
          {/* Header */}
          <View className="items-center mb-10">
            <View className="w-16 h-16 bg-primary-600 rounded-2xl items-center justify-center mb-4">
              <Text className="text-white text-2xl font-bold">R</Text>
            </View>
            <Text className="text-3xl font-bold text-neutral-900">RutaUQ</Text>
            <Text className="text-neutral-500 mt-1">
              Carpooling Universidad de Quindío
            </Text>
          </View>

          {/* Form card */}
          <View className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
            <Text className="text-xl font-bold text-neutral-900 mb-6">
              Iniciar sesión
            </Text>

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
                  autoComplete="email"
                  error={errors.email?.message}
                  accessibilityLabel="Correo electrónico"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Contraseña"
                  placeholder="Tu contraseña"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  autoComplete="password"
                  error={errors.password?.message}
                  accessibilityLabel="Contraseña"
                />
              )}
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              className="mb-4 self-end"
              accessibilityRole="link"
              accessibilityLabel="Olvidé mi contraseña"
            >
              <Text className="text-sm text-primary-600 font-medium">
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>

            <Button
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              size="lg"
            >
              Iniciar sesión
            </Button>

            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px bg-neutral-200" />
              <Text className="mx-3 text-sm text-neutral-400">o</Text>
              <View className="flex-1 h-px bg-neutral-200" />
            </View>

            <GoogleLoginButton
              loading={googleLoading}
              onToken={handleGoogleToken}
              onError={handleGoogleError}
            />
          </View>

          {/* Register link */}
          <View className="flex-row items-center justify-center mt-6">
            <Text className="text-neutral-600">¿No tienes cuenta? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity accessibilityRole="link">
                <Text className="text-primary-600 font-semibold">Regístrate</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
