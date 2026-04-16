import React, { useEffect, useState, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Bookmark } from 'lucide-react-native';
import { ReservationCard } from '@/components/reservations/ReservationCard';
import { EmptyState, ErrorState, InlineLoader } from '@/components/ui';
import { reservationsService } from '@/services/reservations.service';
import { getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import type { ReservationResponse } from '@/types';

export default function ReservationsScreen() {
  const [reservations, setReservations] = useState<ReservationResponse[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const data = await reservationsService.getAll();
      setReservations(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ReservationResponse>) => (
      <ReservationCard
        reservation={item}
        onPress={() => router.push(`/(app)/reservations/${item.id}`)}
      />
    ),
    []
  );

  if (loading && reservations.length === 0) return <InlineLoader />;
  if (error && reservations.length === 0) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <FlatList
        data={reservations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerClassName="px-4 pt-3 pb-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            title="Sin reservas"
            description="Busca un viaje y reserva tu puesto."
            actionLabel="Buscar viajes"
            onAction={() => router.push('/(app)/trips')}
            icon={<Bookmark size={48} color={Colors.neutral[400]} />}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
