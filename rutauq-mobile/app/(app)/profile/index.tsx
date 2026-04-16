import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Phone, LogOut, Car, Edit2, Check, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import {
  Card,
  Badge,
  Input,
  Button,
  Loader,
  ErrorState,
  ConfirmModal,
} from '@/components/ui';
import { profileSchema, type ProfileForm } from '@/lib/validations';
import { usersService } from '@/services/users.service';
import { useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import type { DriverProfileResponse, Role, UserProfile } from '@/types';

const ROLE_LABEL: Record<Role, string> = {
  CLIENT: 'Pasajero',
  DRIVER: 'Conductor',
  ADMIN:  'Administrador',
};

export default function ProfileScreen() {
  const user       = useAuthStore((s) => s.user);
  const clearAuth  = useAuthStore((s) => s.clearAuth);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [profile, setProfile]           = useState<UserProfile | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfileResponse | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [editing, setEditing]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [showLogout, setShowLogout]     = useState(false);
  const [loggingOut, setLoggingOut]     = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: '', lastName: '', phone: '' },
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const p = await usersService.getMe();
        setProfile(p);
        reset({ firstName: p.firstName, lastName: p.lastName, phone: p.phone ?? '' });

        if (p.role === 'DRIVER') {
          try {
            const dp = await usersService.getDriverProfile();
            setDriverProfile(dp);
          } catch {
            // driver profile may not exist yet
          }
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async (data: ProfileForm) => {
    setSaving(true);
    try {
      const updated = await usersService.updateMe({
        firstName: data.firstName,
        lastName:  data.lastName,
        phone:     data.phone || undefined,
      });
      setProfile(updated);
      updateUser({ firstName: updated.firstName, lastName: updated.lastName });
      setEditing(false);
      Toast.show({ type: 'success', text1: 'Perfil actualizado' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await clearAuth();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(auth)/login');
    } catch {
      setLoggingOut(false);
      setShowLogout(false);
    }
  };

  if (loading) return <Loader />;
  if (error || !profile) return <ErrorState message={error ?? 'No se pudo cargar el perfil'} />;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar + name */}
          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-3">
              <User size={36} color={Colors.primary[600]} />
            </View>
            <Text className="text-xl font-bold text-neutral-900">
              {profile.firstName} {profile.lastName}
            </Text>
            <View className="mt-2">
              <Badge variant={profile.role === 'ADMIN' ? 'warning' : profile.role === 'DRIVER' ? 'success' : 'primary'}>
                {ROLE_LABEL[profile.role]}
              </Badge>
            </View>
          </View>

          {/* Info card */}
          {!editing ? (
            <Card className="mb-4">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="font-semibold text-neutral-900">Información personal</Text>
                <TouchableOpacity
                  onPress={() => setEditing(true)}
                  className="flex-row items-center"
                  accessibilityRole="button"
                  accessibilityLabel="Editar perfil"
                >
                  <Edit2 size={16} color={Colors.primary[600]} />
                  <Text className="ml-1 text-primary-600 font-medium text-sm">Editar</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center mb-3">
                <User size={16} color={Colors.neutral[500]} />
                <View className="ml-3">
                  <Text className="text-xs text-neutral-500">Nombre</Text>
                  <Text className="text-neutral-900">
                    {profile.firstName} {profile.lastName}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center mb-3">
                <Mail size={16} color={Colors.neutral[500]} />
                <View className="ml-3">
                  <Text className="text-xs text-neutral-500">Correo electrónico</Text>
                  <Text className="text-neutral-900">{profile.email}</Text>
                </View>
              </View>

              {profile.phone && (
                <View className="flex-row items-center">
                  <Phone size={16} color={Colors.neutral[500]} />
                  <View className="ml-3">
                    <Text className="text-xs text-neutral-500">Teléfono</Text>
                    <Text className="text-neutral-900">{profile.phone}</Text>
                  </View>
                </View>
              )}
            </Card>
          ) : (
            <Card className="mb-4">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="font-semibold text-neutral-900">Editar perfil</Text>
                <TouchableOpacity
                  onPress={() => { setEditing(false); reset(); }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar edición"
                >
                  <X size={20} color={Colors.neutral[500]} />
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-3">
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Nombre"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="words"
                      error={errors.firstName?.message}
                      containerClassName="flex-1"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Apellido"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="words"
                      error={errors.lastName?.message}
                      containerClassName="flex-1"
                    />
                  )}
                />
              </View>

              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Teléfono (opcional)"
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="phone-pad"
                    maxLength={10}
                    error={errors.phone?.message}
                  />
                )}
              />

              <Button
                onPress={handleSubmit(handleSave)}
                loading={saving}
              >
                Guardar cambios
              </Button>
            </Card>
          )}

          {/* Driver profile section */}
          {profile.role === 'DRIVER' && (
            <Card className="mb-4">
              <Text className="font-semibold text-neutral-900 mb-3">Perfil de conductor</Text>
              {driverProfile ? (
                <>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-neutral-500">Licencia</Text>
                    <Text className="text-neutral-900">{driverProfile.licenseNumber}</Text>
                  </View>
                  <View className="flex-row justify-between mb-3">
                    <Text className="text-neutral-500">Años de experiencia</Text>
                    <Text className="text-neutral-900">{driverProfile.experience}</Text>
                  </View>
                </>
              ) : (
                <Text className="text-neutral-500 text-sm mb-3">
                  No has completado tu perfil de conductor.
                </Text>
              )}

              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => router.push('/(app)/driver/vehicles')}
                accessibilityRole="button"
              >
                <Car size={16} color={Colors.primary[600]} />
                <Text className="ml-2 text-primary-600 font-medium text-sm">
                  Gestionar vehículos
                </Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Logout */}
          <Button
            variant="danger"
            onPress={() => setShowLogout(true)}
            className="mb-4"
          >
            <LogOut size={18} color="#fff" />
            {'  '}Cerrar sesión
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showLogout}
        title="Cerrar sesión"
        message="¿Estás seguro de que deseas cerrar sesión?"
        confirmLabel="Sí, cerrar sesión"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
      />
    </SafeAreaView>
  );
}
