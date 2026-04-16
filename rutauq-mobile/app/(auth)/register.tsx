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
import { Input, Button } from '@/components/ui';
import { registerSchema, type RegisterForm } from '@/lib/validations';
import { authService } from '@/services/auth.service';
import { getErrorMessage } from '@/lib/utils';
import type { Role } from '@/types';

const ROLES: { label: string; value: Role; description: string }[] = [
  { label: 'Pasajero',    value: 'CLIENT', description: 'Busca y reserva viajes' },
  { label: 'Conductor',   value: 'DRIVER', description: 'Publica y gestiona viajes' },
];

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName:  '',
      email:     '',
      password:  '',
      phone:     '',
      role:      'CLIENT',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        phone: data.phone || undefined,
      };
      const result = await authService.register(payload);
      router.replace({
        pathname: '/(auth)/check-email',
        params: { email: result.email },
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error al registrarse',
        text2: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="items-center mb-8">
            <View className="w-14 h-14 bg-primary-600 rounded-2xl items-center justify-center mb-3">
              <Text className="text-white text-xl font-bold">R</Text>
            </View>
            <Text className="text-2xl font-bold text-neutral-900">Crear cuenta</Text>
            <Text className="text-neutral-500 mt-1 text-center">
              Únete a la comunidad RutaUQ
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
            {/* Role selector */}
            <Text className="text-sm font-medium text-neutral-700 mb-2">
              Quiero unirme como
            </Text>
            <View className="flex-row gap-3 mb-4">
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  className={`flex-1 border-2 rounded-xl p-3 ${
                    selectedRole === r.value
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-neutral-200 bg-white'
                  }`}
                  onPress={() => setValue('role', r.value, { shouldValidate: true })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedRole === r.value }}
                  accessibilityLabel={r.label}
                >
                  <Text
                    className={`font-semibold text-center ${
                      selectedRole === r.value ? 'text-primary-700' : 'text-neutral-700'
                    }`}
                  >
                    {r.label}
                  </Text>
                  <Text
                    className={`text-xs text-center mt-1 ${
                      selectedRole === r.value ? 'text-primary-500' : 'text-neutral-400'
                    }`}
                  >
                    {r.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-3">
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Nombre"
                    placeholder="Juan"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    error={errors.firstName?.message}
                    containerClassName="flex-1"
                    accessibilityLabel="Nombre"
                  />
                )}
              />
              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Apellido"
                    placeholder="Pérez"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    error={errors.lastName?.message}
                    containerClassName="flex-1"
                    accessibilityLabel="Apellido"
                  />
                )}
              />
            </View>

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
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Teléfono (opcional)"
                  placeholder="3001234567"
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="phone-pad"
                  maxLength={10}
                  error={errors.phone?.message}
                  accessibilityLabel="Número de teléfono"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Contraseña"
                  placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  error={errors.password?.message}
                  accessibilityLabel="Contraseña"
                />
              )}
            />

            <Button
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              size="lg"
              className="mt-2"
            >
              Crear cuenta
            </Button>
          </View>

          <View className="flex-row items-center justify-center mt-6">
            <Text className="text-neutral-600">¿Ya tienes cuenta? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity accessibilityRole="link">
                <Text className="text-primary-600 font-semibold">Inicia sesión</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
