import React, { useState } from 'react';
import { View, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Button } from '@/components/ui';
import { vehicleSchema, type VehicleForm as VehicleFormValues } from '@/lib/validations';
import type { VehicleSummary } from '@/types';

interface VehicleFormProps {
  defaultValues?: Partial<VehicleFormValues>;
  onSubmit:       (data: VehicleFormValues) => Promise<void>;
  onCancel?:      () => void;
  submitLabel?:   string;
}

export function VehicleForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar vehículo',
}: VehicleFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      brand: '',
      model: '',
      year:  new Date().getFullYear(),
      color: '',
      plate: '',
      seats: 4,
      ...defaultValues,
    },
  });

  const handleFormSubmit = async (data: VehicleFormValues) => {
    setSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView keyboardShouldPersistTaps="handled" className="flex-1">
        <Controller
          control={control}
          name="brand"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Marca"
              placeholder="Ej: Chevrolet"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.brand?.message}
              accessibilityLabel="Marca del vehículo"
            />
          )}
        />

        <Controller
          control={control}
          name="model"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Modelo"
              placeholder="Ej: Spark"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.model?.message}
              accessibilityLabel="Modelo del vehículo"
            />
          )}
        />

        <View className="flex-row gap-3">
          <Controller
            control={control}
            name="year"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Año"
                placeholder="2020"
                value={String(value)}
                onChangeText={(t) => onChange(parseInt(t) || 0)}
                onBlur={onBlur}
                keyboardType="numeric"
                maxLength={4}
                error={errors.year?.message}
                containerClassName="flex-1"
                accessibilityLabel="Año del vehículo"
              />
            )}
          />

          <Controller
            control={control}
            name="seats"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Puestos"
                placeholder="4"
                value={String(value)}
                onChangeText={(t) => onChange(parseInt(t) || 0)}
                onBlur={onBlur}
                keyboardType="numeric"
                maxLength={1}
                error={errors.seats?.message}
                containerClassName="flex-1"
                accessibilityLabel="Número de puestos"
              />
            )}
          />
        </View>

        <Controller
          control={control}
          name="color"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Color"
              placeholder="Ej: Blanco"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.color?.message}
              accessibilityLabel="Color del vehículo"
            />
          )}
        />

        <Controller
          control={control}
          name="plate"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Placa"
              placeholder="ABC-123"
              value={value}
              onChangeText={(t) => onChange(t.toUpperCase())}
              onBlur={onBlur}
              autoCapitalize="characters"
              error={errors.plate?.message}
              accessibilityLabel="Placa del vehículo"
            />
          )}
        />

        <Button
          onPress={handleSubmit(handleFormSubmit)}
          loading={submitting}
          className="mt-2"
        >
          {submitLabel}
        </Button>

        {onCancel && (
          <Button variant="ghost" onPress={onCancel} className="mt-2">
            Cancelar
          </Button>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
