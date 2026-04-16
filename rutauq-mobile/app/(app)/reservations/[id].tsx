import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, Calendar, Users, CreditCard } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import {
  Card,
  ReservationStatusBadge,
  Button,
  Loader,
  ErrorState,
  ConfirmModal,
} from '@/components/ui';
import { reservationsService } from '@/services/reservations.service';
import { formatDate, formatCurrency, getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import type { ReservationResponse } from '@/types';

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [cancelling, setCancelling]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await reservationsService.getById(id);
      setReservation(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCancel = async () => {
    if (!id) return;
    setCancelling(true);
    try {
      await reservationsService.cancel(id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Reserva cancelada' });
      router.back();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: getErrorMessage(err) });
    } finally {
      setCancelling(false);
      setShowConfirm(false);
    }
  };

  if (loading) return <Loader />;
  if (error || !reservation) return <ErrorState message={error ?? 'Reserva no encontrada'} />;

  const { trip } = reservation;
  const canPay    = reservation.status === 'PENDING_PAYMENT';
  const canCancel = reservation.status === 'PENDING_PAYMENT' || reservation.status === 'CONFIRMED';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Status */}
        <View className="flex-row items-center justify-between mb-4">
          <ReservationStatusBadge status={reservation.status} />
          <Text className="text-xs text-neutral-400">
            {formatDate(reservation.createdAt)}
          </Text>
        </View>

        {/* Trip */}
        <Card className="mb-4">
          <Text className="font-semibold text-neutral-900 mb-3">Viaje</Text>
          <View className="flex-row items-center mb-2">
            <MapPin size={16} color={Colors.primary[600]} />
            <Text className="ml-2 text-sm font-medium text-neutral-900">
              {trip.origin} → {trip.destination}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Calendar size={16} color={Colors.neutral[500]} />
            <Text className="ml-2 text-sm text-neutral-600">
              {formatDate(trip.departureTime)}
            </Text>
          </View>
        </Card>

        {/* Details */}
        <Card className="mb-4">
          <Text className="font-semibold text-neutral-900 mb-3">Detalles</Text>
          <View className="flex-row justify-between mb-2">
            <View className="flex-row items-center">
              <Users size={16} color={Colors.neutral[500]} />
              <Text className="ml-2 text-sm text-neutral-600">Puestos reservados</Text>
            </View>
            <Text className="text-sm font-medium text-neutral-900">
              {reservation.seatsReserved}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-neutral-600">Total</Text>
            <Text className="text-base font-bold text-primary-600">
              {formatCurrency(reservation.totalPrice)}
            </Text>
          </View>
        </Card>

        {/* Payment CTA */}
        {canPay && (
          <Button
            onPress={() =>
              router.push({
                pathname: '/(app)/payments/new',
                params:   { reservationId: reservation.id },
              })
            }
            size="lg"
            className="mb-3"
          >
            <CreditCard size={18} color="#fff" />
            {'  '}Pagar ahora
          </Button>
        )}

        {/* Cancel CTA */}
        {canCancel && (
          <Button
            variant="danger"
            size="md"
            onPress={() => setShowConfirm(true)}
          >
            Cancelar reserva
          </Button>
        )}
      </ScrollView>

      <ConfirmModal
        visible={showConfirm}
        title="Cancelar reserva"
        message="¿Estás seguro de que deseas cancelar esta reserva? Esta acción no se puede deshacer."
        confirmLabel="Sí, cancelar"
        cancelLabel="No, mantener"
        confirmVariant="danger"
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setShowConfirm(false)}
      />
    </SafeAreaView>
  );
}
