import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { User, Mail, Users } from 'lucide-react-native';
import { Card, EmptyState, ErrorState, InlineLoader, ReservationStatusBadge } from '@/components/ui';
import { tripsService } from '@/services/trips.service';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import type { ReservationResponse } from '@/types';

export default function TripReservationsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const [reservations, setReservations] = useState<ReservationResponse[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!tripId) return;
    setError(null);
    try {
      const data = await tripsService.getReservations(tripId);
      setReservations(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tripId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderItem = useCallback(({ item }: ListRenderItemInfo<ReservationResponse>) => (
    <Card className="mb-3">
      <View className="flex-row items-center mb-2">
        <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
          <User size={18} color={Colors.primary[600]} />
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-neutral-900">
            {item.passenger.firstName} {item.passenger.lastName}
          </Text>
          <View className="flex-row items-center mt-0.5">
            <Mail size={12} color={Colors.neutral[500]} />
            <Text className="ml-1 text-xs text-neutral-500">{item.passenger.email}</Text>
          </View>
        </View>
        <ReservationStatusBadge status={item.status} />
      </View>
      <View className="flex-row items-center justify-between pt-2 border-t border-neutral-100">
        <View className="flex-row items-center">
          <Users size={14} color={Colors.neutral[500]} />
          <Text className="ml-1 text-sm text-neutral-600">
            {item.seatsReserved} {item.seatsReserved === 1 ? 'puesto' : 'puestos'}
          </Text>
        </View>
        <Text className="font-semibold text-neutral-900">
          {formatCurrency(item.totalPrice)}
        </Text>
      </View>
    </Card>
  ), []);

  if (loading) return <InlineLoader />;
  if (error)   return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <View className="px-4 pt-3 pb-2">
        <Text className="text-sm text-neutral-500">
          {reservations.length}{' '}
          {reservations.length === 1 ? 'pasajero' : 'pasajeros'}
        </Text>
      </View>
      <FlatList
        data={reservations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerClassName="px-4 pb-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            title="Sin pasajeros"
            description="Aún no hay reservas para este viaje."
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
