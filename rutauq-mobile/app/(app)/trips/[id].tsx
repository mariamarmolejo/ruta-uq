import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  MapPin,
  Clock,
  Users,
  Car,
  Info,
  User,
} from 'lucide-react-native';
import { Card, TripStatusBadge, Loader, ErrorState, Button } from '@/components/ui';
import { tripsService } from '@/services/trips.service';
import { formatDate, formatCurrency, getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import type { TripResponse } from '@/types';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user   = useAuthStore((s) => s.user);

  const [trip, setTrip]       = useState<TripResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    tripsService
      .getById(id)
      .then(setTrip)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader />;
  if (error)   return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null); }} />;
  if (!trip)   return null;

  const canReserve =
    trip.status === 'SCHEDULED' &&
    trip.availableSeats > 0 &&
    user?.role === 'CLIENT';

  const isDriverOwner = user?.role === 'DRIVER';

  const handleReserve = () => {
    router.push({
      pathname: '/(app)/reservations/new',
      params:   { tripId: trip.id },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Status */}
        <View className="flex-row items-center justify-between mb-4">
          <TripStatusBadge status={trip.status} />
          <Text className="text-xs text-neutral-400">
            ID: {trip.id.slice(0, 8)}...
          </Text>
        </View>

        {/* Route card */}
        <Card className="mb-4">
          <View className="flex-row items-start">
            <View className="items-center mr-4">
              <View className="w-3 h-3 rounded-full bg-primary-600" />
              <View className="w-0.5 h-8 bg-neutral-200 my-1" />
              <View className="w-3 h-3 rounded-full bg-red-500" />
            </View>
            <View className="flex-1">
              <View className="mb-4">
                <Text className="text-xs text-neutral-500 mb-1">Origen</Text>
                <Text className="text-base font-semibold text-neutral-900">
                  {trip.origin}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-neutral-500 mb-1">Destino</Text>
                <Text className="text-base font-semibold text-neutral-900">
                  {trip.destination}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Details card */}
        <Card className="mb-4">
          <Text className="font-semibold text-neutral-900 mb-3">Detalles del viaje</Text>

          <View className="flex-row items-center mb-3">
            <Clock size={18} color={Colors.neutral[500]} />
            <View className="ml-3">
              <Text className="text-xs text-neutral-500">Salida</Text>
              <Text className="text-sm font-medium text-neutral-900">
                {formatDate(trip.departureTime)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center mb-3">
            <Users size={18} color={Colors.neutral[500]} />
            <View className="ml-3">
              <Text className="text-xs text-neutral-500">Puestos disponibles</Text>
              <Text className="text-sm font-medium text-neutral-900">
                {trip.availableSeats}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center mb-3">
            <View className="w-[18px] items-center">
              <Text className="text-base font-bold text-primary-600">$</Text>
            </View>
            <View className="ml-3">
              <Text className="text-xs text-neutral-500">Precio por puesto</Text>
              <Text className="text-sm font-medium text-neutral-900">
                {formatCurrency(trip.pricePerSeat)}
              </Text>
            </View>
          </View>

          {trip.description && (
            <View className="flex-row items-start">
              <Info size={18} color={Colors.neutral[500]} />
              <View className="ml-3 flex-1">
                <Text className="text-xs text-neutral-500">Descripción</Text>
                <Text className="text-sm text-neutral-700">{trip.description}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Driver card */}
        <Card className="mb-4">
          <Text className="font-semibold text-neutral-900 mb-3">Conductor</Text>
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
              <User size={20} color={Colors.primary[600]} />
            </View>
            <View>
              <Text className="font-medium text-neutral-900">
                {trip.driver.firstName} {trip.driver.lastName}
              </Text>
              <Text className="text-sm text-neutral-500">{trip.driver.email}</Text>
            </View>
          </View>
        </Card>

        {/* Vehicle card */}
        <Card className="mb-6">
          <Text className="font-semibold text-neutral-900 mb-3">Vehículo</Text>
          <View className="flex-row items-center">
            <Car size={18} color={Colors.neutral[500]} />
            <View className="ml-3">
              <Text className="font-medium text-neutral-900">
                {trip.vehicle.brand} {trip.vehicle.model} ({trip.vehicle.year})
              </Text>
              <Text className="text-sm text-neutral-500">
                {trip.vehicle.color} · Placa: {trip.vehicle.plate}
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* CTA */}
      {canReserve && (
        <View className="px-4 pb-6 pt-3 bg-white border-t border-neutral-100">
          <Button onPress={handleReserve} size="lg">
            Reservar un puesto
          </Button>
        </View>
      )}

      {isDriverOwner && trip.status === 'SCHEDULED' && (
        <View className="px-4 pb-6 pt-3 bg-white border-t border-neutral-100">
          <TouchableOpacity
            className="py-3 items-center"
            onPress={() =>
              router.push({
                pathname: '/(app)/trips/reservations/[tripId]',
                params: { tripId: trip.id },
              })
            }
            accessibilityRole="button"
          >
            <Text className="text-primary-600 font-semibold">
              Ver pasajeros
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
