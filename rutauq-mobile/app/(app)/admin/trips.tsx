import React, { useEffect, useState, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TripCard } from '@/components/trips/TripCard';
import { EmptyState, ErrorState, InlineLoader } from '@/components/ui';
import { usersService } from '@/services/users.service';
import { getErrorMessage } from '@/lib/utils';
import type { TripResponse } from '@/types';

export default function AdminTripsScreen() {
  const [trips, setTrips]           = useState<TripResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const data = await usersService.getAllTripsAdmin() as TripResponse[];
      setTrips(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<TripResponse>) => (
    <TripCard
      trip={item}
      onPress={() => router.push(`/(app)/trips/${item.id}`)}
    />
  ), []);

  if (loading && trips.length === 0) return <InlineLoader />;
  if (error && trips.length === 0)   return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerClassName="px-4 pt-3 pb-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
        ListEmptyComponent={
          <EmptyState title="Sin viajes" description="No hay viajes registrados." />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
