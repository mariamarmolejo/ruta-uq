import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react-native';
import { Input, Button } from '@/components/ui';
import { tripSchema, type TripForm as TripFormValues } from '@/lib/validations';
import { Colors } from '@/constants/colors';
import type { VehicleSummary, TripResponse } from '@/types';

interface TripFormProps {
  vehicles:        VehicleSummary[];
  defaultValues?:  Partial<TripFormValues>;
  onSubmit:        (data: TripFormValues) => Promise<void>;
  submitLabel?:    string;
  existingTrip?:   TripResponse;
}

export function TripForm({
  vehicles,
  defaultValues,
  onSubmit,
  submitLabel = 'Publicar viaje',
}: TripFormProps) {
  const [submitting, setSubmitting]         = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      origin:         '',
      destination:    '',
      departureTime:  '',
      availableSeats: 1,
      pricePerSeat:   0,
      vehicleId:      '',
      description:    '',
      ...defaultValues,
    },
  });

  const departureTime = watch('departureTime');
  const vehicleId     = watch('vehicleId');
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  const handleDateChange = (_: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setValue('departureTime', selectedDate.toISOString(), { shouldValidate: true });
    }
  };

  const handleFormSubmit = async (data: TripFormValues) => {
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
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4"
        keyboardShouldPersistTaps="handled"
      >
        <Controller
          control={control}
          name="origin"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Origen"
              placeholder="Ej: Armenia, Quindío"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.origin?.message}
              accessibilityLabel="Origen del viaje"
            />
          )}
        />

        <Controller
          control={control}
          name="destination"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Destino"
              placeholder="Ej: Pereira, Risaralda"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.destination?.message}
              accessibilityLabel="Destino del viaje"
            />
          )}
        />

        {/* Departure time picker */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-neutral-700 mb-1">
            Fecha y hora de salida
          </Text>
          <TouchableOpacity
            className={`border rounded-xl px-4 py-3 flex-row items-center justify-between ${
              errors.departureTime ? 'border-red-500' : 'border-neutral-300'
            }`}
            onPress={() => setShowDatePicker(true)}
            accessibilityLabel="Seleccionar fecha de salida"
            accessibilityRole="button"
          >
            <Text className={departureTime ? 'text-neutral-900' : 'text-neutral-400'}>
              {departureTime
                ? format(new Date(departureTime), "d MMM yyyy, h:mm a")
                : 'Selecciona fecha y hora'}
            </Text>
            <Calendar size={18} color={Colors.neutral[500]} />
          </TouchableOpacity>
          {errors.departureTime && (
            <Text className="text-sm text-red-500 mt-1">
              {errors.departureTime.message}
            </Text>
          )}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={departureTime ? new Date(departureTime) : new Date()}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        <View className="flex-row gap-3">
          <Controller
            control={control}
            name="availableSeats"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Puestos disponibles"
                placeholder="4"
                value={String(value)}
                onChangeText={(t) => onChange(parseInt(t) || 0)}
                onBlur={onBlur}
                keyboardType="numeric"
                error={errors.availableSeats?.message}
                containerClassName="flex-1"
                accessibilityLabel="Puestos disponibles"
              />
            )}
          />

          <Controller
            control={control}
            name="pricePerSeat"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Precio por puesto ($)"
                placeholder="15000"
                value={String(value)}
                onChangeText={(t) => onChange(parseFloat(t) || 0)}
                onBlur={onBlur}
                keyboardType="numeric"
                error={errors.pricePerSeat?.message}
                containerClassName="flex-1"
                accessibilityLabel="Precio por puesto en pesos"
              />
            )}
          />
        </View>

        {/* Vehicle picker */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-neutral-700 mb-1">Vehículo</Text>
          {vehicles.length === 0 ? (
            <Text className="text-sm text-neutral-500 py-2">
              No tienes vehículos registrados.
            </Text>
          ) : (
            <>
              <TouchableOpacity
                className={`border rounded-xl px-4 py-3 flex-row items-center justify-between ${
                  errors.vehicleId ? 'border-red-500' : 'border-neutral-300'
                }`}
                onPress={() => setShowVehiclePicker((v) => !v)}
                accessibilityLabel="Seleccionar vehículo"
                accessibilityRole="button"
              >
                <Text className={selectedVehicle ? 'text-neutral-900' : 'text-neutral-400'}>
                  {selectedVehicle
                    ? `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.plate})`
                    : 'Selecciona un vehículo'}
                </Text>
                <ChevronDown size={18} color={Colors.neutral[500]} />
              </TouchableOpacity>
              {showVehiclePicker && (
                <View className="border border-neutral-200 rounded-xl mt-1 bg-white">
                  {vehicles.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      className="px-4 py-3 border-b border-neutral-100 last:border-0"
                      onPress={() => {
                        setValue('vehicleId', v.id, { shouldValidate: true });
                        setShowVehiclePicker(false);
                      }}
                    >
                      <Text className="text-neutral-900">
                        {v.brand} {v.model} ({v.plate})
                      </Text>
                      <Text className="text-xs text-neutral-500">
                        {v.color} · {v.seats} puestos
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
          {errors.vehicleId && (
            <Text className="text-sm text-red-500 mt-1">{errors.vehicleId.message}</Text>
          )}
        </View>

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Descripción (opcional)"
              placeholder="Indicaciones adicionales para los pasajeros..."
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="h-20"
              error={errors.description?.message}
              accessibilityLabel="Descripción del viaje"
            />
          )}
        />

        <Button
          onPress={handleSubmit(handleFormSubmit)}
          loading={submitting}
          className="mt-2 mb-8"
        >
          {submitLabel}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
