import React, { useEffect, useState } from 'react';
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
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { MapPin, DollarSign } from 'lucide-react-native';
import { Card, Button, Input, Loader, ErrorState } from '@/components/ui';
import { reservationSchema, type ReservationForm } from '@/lib/validations';
import { tripsService } from '@/services/trips.service';
import { reservationsService } from '@/services/reservations.service';
import { formatCurrency, formatDateShort, getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import type { TripResponse } from '@/types';

export default function NewReservationScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const [trip, setTrip]         = useState<TripResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReservationForm>({
    resolver: zodResolver(reservationSchema),
    defaultValues: { seatsReserved: 1 },
  });

  const seats = watch('seatsReserved');

  useEffect(() => {
    if (!tripId) return;
    tripsService
      .getById(tripId)
      .then(setTrip)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [tripId]);

  const onSubmit = async (data: ReservationForm) => {
    if (!tripId) return;
    setSubmitting(true);
    try {
      const reservation = await reservationsService.create({
        tripId,
        seatsReserved: data.seatsReserved,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Reserva creada', text2: 'Procede al pago' });
      router.replace(`/(app)/reservations/${reservation.id}`);
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: 'Error', text2: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;
  if (error || !trip) return <ErrorState message={error ?? 'Viaje no encontrado'} />;

  const total = (trip.pricePerSeat * (typeof seats === 'number' ? seats : 1));

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Trip summary */}
          <Card className="mb-4">
            <Text className="font-semibold text-neutral-900 mb-3">Resumen del viaje</Text>
            <View className="flex-row items-center mb-2">
              <MapPin size={16} color={Colors.primary[600]} />
              <Text className="ml-2 text-sm text-neutral-700 flex-1">
                {trip.origin} → {trip.destination}
              </Text>
            </View>
            <Text className="text-sm text-neutral-600 mb-1">
              {formatDateShort(trip.departureTime)}
            </Text>
            <Text className="text-sm text-neutral-600">
              Conductor: {trip.driver.firstName} {trip.driver.lastName}
            </Text>
          </Card>

          {/* Seats input */}
          <Card className="mb-4">
            <Text className="font-semibold text-neutral-900 mb-3">Número de puestos</Text>
            <Controller
              control={control}
              name="seatsReserved"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  placeholder="1"
                  value={String(value)}
                  onChangeText={(t) => onChange(parseInt(t) || 1)}
                  onBlur={onBlur}
                  keyboardType="numeric"
                  maxLength={1}
                  error={errors.seatsReserved?.message}
                  accessibilityLabel="Número de puestos a reservar"
                />
              )}
            />
            <Text className="text-xs text-neutral-500">
              Máximo 4 puestos · {trip.availableSeats} disponibles
            </Text>
          </Card>

          {/* Price breakdown */}
          <Card className="mb-6">
            <Text className="font-semibold text-neutral-900 mb-3">Precio</Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-neutral-600">Precio por puesto</Text>
              <Text className="text-neutral-900">{formatCurrency(trip.pricePerSeat)}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-neutral-600">Puestos</Text>
              <Text className="text-neutral-900">× {seats || 1}</Text>
            </View>
            <View className="border-t border-neutral-100 pt-2 flex-row justify-between">
              <Text className="font-bold text-neutral-900">Total</Text>
              <Text className="font-bold text-primary-600 text-lg">
                {formatCurrency(total)}
              </Text>
            </View>
          </Card>

          <Button
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            size="lg"
          >
            Confirmar reserva
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
