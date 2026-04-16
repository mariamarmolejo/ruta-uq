import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin, Calendar, Users } from 'lucide-react-native';
import { Card, ReservationStatusBadge } from '@/components/ui';
import { formatDateShort, formatCurrency } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import type { ReservationResponse } from '@/types';

interface ReservationCardProps {
  reservation: ReservationResponse;
  onPress?:    () => void;
}

export const ReservationCard = memo(function ReservationCard({
  reservation,
  onPress,
}: ReservationCardProps) {
  const { trip } = reservation;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Reserva de ${trip.origin} a ${trip.destination}`}
      accessibilityHint="Toca para ver los detalles de la reserva"
    >
      <Card className="mb-3">
        {/* Route */}
        <View className="flex-row items-center mb-3">
          <MapPin size={14} color={Colors.primary[600]} />
          <Text className="ml-1 font-semibold text-neutral-900 flex-1" numberOfLines={1}>
            {trip.origin}
          </Text>
          <Text className="text-neutral-400 mx-2">→</Text>
          <Text className="font-semibold text-neutral-900 flex-1 text-right" numberOfLines={1}>
            {trip.destination}
          </Text>
        </View>

        {/* Date */}
        <View className="flex-row items-center mb-2">
          <Calendar size={14} color={Colors.neutral[500]} />
          <Text className="ml-1 text-sm text-neutral-600">
            {formatDateShort(trip.departureTime)}
          </Text>
        </View>

        {/* Seats + Price */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Users size={14} color={Colors.neutral[500]} />
            <Text className="ml-1 text-sm text-neutral-600">
              {reservation.seatsReserved} {reservation.seatsReserved === 1 ? 'puesto' : 'puestos'}
            </Text>
          </View>
          <Text className="text-base font-bold text-primary-600">
            {formatCurrency(reservation.totalPrice)}
          </Text>
        </View>

        {/* Status */}
        <ReservationStatusBadge status={reservation.status} />
      </Card>
    </TouchableOpacity>
  );
});
