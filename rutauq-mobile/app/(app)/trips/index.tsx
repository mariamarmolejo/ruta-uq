import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  RefreshControl,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TripCard } from '@/components/trips/TripCard';
import { TripFilters, type FilterValues } from '@/components/trips/TripFilters';
import { EmptyState, ErrorState, InlineLoader } from '@/components/ui';
import { tripsService } from '@/services/trips.service';
import { getErrorMessage } from '@/lib/utils';
import type { TripResponse } from '@/types';

const DEBOUNCE_MS = 300;

export default function TripsScreen() {
  const [trips, setTrips]         = useState<TripResponse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [filters, setFilters]     = useState<FilterValues>({
    origin: '', destination: '', date: '', minSeats: '',
  });

  const fetchTrips = useCallback(async (f: FilterValues = filters) => {
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      if (f.origin.trim())      params['origin']      = f.origin.trim();
      if (f.destination.trim()) params['destination'] = f.destination.trim();
      if (f.date)               params['date']        = f.date;
      if (f.minSeats)           params['minSeats']    = parseInt(f.minSeats);

      const data = await tripsService.search(params);
      setTrips(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    fetchTrips();
  }, []);

  // Debounced search on filter change
  useEffect(() => {
    const timer = setTimeout(() => fetchTrips(filters), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.origin, filters.destination]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTrips();
  }, [fetchTrips]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TripResponse>) => (
      <TripCard
        trip={item}
        onPress={() => router.push(`/(app)/trips/${item.id}`)}
      />
    ),
    []
  );

  const keyExtractor = useCallback((item: TripResponse) => item.id, []);

  if (loading && trips.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
        <TripFilters values={filters} onChange={setFilters} onSearch={() => fetchTrips(filters)} />
        <InlineLoader />
      </SafeAreaView>
    );
  }

  if (error && trips.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
        <TripFilters values={filters} onChange={setFilters} onSearch={() => fetchTrips(filters)} />
        <ErrorState message={error} onRetry={() => fetchTrips()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <TripFilters
        values={filters}
        onChange={setFilters}
        onSearch={() => fetchTrips(filters)}
      />
      <FlatList
        data={trips}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerClassName="px-4 pt-3 pb-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No hay viajes disponibles"
            description="Intenta con otros filtros o vuelve más tarde."
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
