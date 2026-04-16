import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin, Clock, Users, DollarSign } from 'lucide-react-native';
import { Card, TripStatusBadge } from '@/components/ui';
import { formatDateShort, formatCurrency } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import type { TripResponse } from '@/types';

interface TripCardProps {
  trip:     TripResponse;
  onPress?: () => void;
}

export const TripCard = memo(function TripCard({ trip, onPress }: TripCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Viaje de ${trip.origin} a ${trip.destination}`}
      accessibilityHint="Toca para ver los detalles del viaje"
    >
      <Card className="mb-3">
        {/* Route */}
        <View className="flex-row items-center mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <MapPin size={14} color={Colors.primary[600]} />
              <Text className="ml-1 text-sm text-neutral-500">Origen</Text>
            </View>
            <Text className="font-semibold text-neutral-900" numberOfLines={1}>
              {trip.origin}
            </Text>
          </View>
          <Text className="text-neutral-400 mx-3 text-lg">→</Text>
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <MapPin size={14} color={Colors.danger} />
              <Text className="ml-1 text-sm text-neutral-500">Destino</Text>
            </View>
            <Text className="font-semibold text-neutral-900" numberOfLines={1}>
              {trip.destination}
            </Text>
          </View>
        </View>

        {/* Meta */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center">
              <Clock size={14} color={Colors.neutral[500]} />
              <Text className="ml-1 text-sm text-neutral-600">
                {formatDateShort(trip.departureTime)}
              </Text>
            </View>
          </View>
          <TripStatusBadge status={trip.status} />
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-neutral-100">
          <View className="flex-row items-center">
            <Users size={14} color={Colors.neutral[500]} />
            <Text className="ml-1 text-sm text-neutral-600">
              {trip.availableSeats} {trip.availableSeats === 1 ? 'puesto' : 'puestos'}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-base font-bold text-primary-600">
              {formatCurrency(trip.pricePerSeat)}
            </Text>
            <Text className="text-xs text-neutral-500 ml-1">/puesto</Text>
          </View>
        </View>

        {/* Driver */}
        <Text className="mt-2 text-xs text-neutral-500">
          Conductor: {trip.driver.firstName} {trip.driver.lastName}
        </Text>
      </Card>
    </TouchableOpacity>
  );
});
