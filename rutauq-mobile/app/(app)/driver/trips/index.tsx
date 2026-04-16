import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, Car, Users } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Card, TripStatusBadge, EmptyState, ErrorState, InlineLoader, ConfirmModal } from '@/components/ui';
import { tripsService } from '@/services/trips.service';
import { formatDateShort, formatCurrency, getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import type { TripResponse } from '@/types';

export default function DriverTripsScreen() {
  const [trips, setTrips]             = useState<TripResponse[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [actionTrip, setActionTrip]   = useState<TripResponse | null>(null);
  const [actionType, setActionType]   = useState<'start' | 'complete' | 'cancel' | null>(null);
  const [actioning, setActioning]     = useState(false);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const data = await tripsService.getMyTrips();
      setTrips(data);
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

  const handleAction = async () => {
    if (!actionTrip || !actionType) return;
    setActioning(true);
    try {
      let updated: TripResponse | void;
      if (actionType === 'start')    updated = await tripsService.start(actionTrip.id);
      if (actionType === 'complete') updated = await tripsService.complete(actionTrip.id);
      if (actionType === 'cancel')   { await tripsService.cancel(actionTrip.id); }

      Toast.show({
        type: 'success',
        text1: actionType === 'cancel'
          ? 'Viaje cancelado'
          : actionType === 'start'
          ? 'Viaje iniciado'
          : 'Viaje completado',
      });

      if (updated) {
        setTrips((prev) => prev.map((t) => (t.id === updated!.id ? updated! : t)));
      } else {
        setTrips((prev) => prev.filter((t) => t.id !== actionTrip.id));
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: getErrorMessage(err) });
    } finally {
      setActioning(false);
      setActionTrip(null);
      setActionType(null);
    }
  };

  const renderItem = useCallback(({ item }: ListRenderItemInfo<TripResponse>) => (
    <Card className="mb-3">
      {/* Header */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          <Text className="font-semibold text-neutral-900" numberOfLines={1}>
            {item.origin} → {item.destination}
          </Text>
          <Text className="text-sm text-neutral-600 mt-0.5">
            {formatDateShort(item.departureTime)}
          </Text>
        </View>
        <TripStatusBadge status={item.status} />
      </View>

      {/* Details */}
      <View className="flex-row items-center gap-4 mb-3">
        <View className="flex-row items-center">
          <Users size={14} color={Colors.neutral[500]} />
          <Text className="ml-1 text-sm text-neutral-600">{item.availableSeats} puestos</Text>
        </View>
        <Text className="text-sm font-semibold text-primary-600">
          {formatCurrency(item.pricePerSeat)}/puesto
        </Text>
      </View>

      {/* Actions */}
      <View className="flex-row gap-2">
        {item.status === 'SCHEDULED' && (
          <>
            <TouchableOpacity
              className="flex-1 bg-primary-50 border border-primary-200 rounded-lg py-2 items-center"
              onPress={() => router.push(`/(app)/driver/trips/${item.id}/edit`)}
              accessibilityRole="button"
              accessibilityLabel="Editar viaje"
            >
              <Text className="text-primary-700 text-sm font-medium">Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-green-50 border border-green-200 rounded-lg py-2 items-center"
              onPress={() => { setActionTrip(item); setActionType('start'); }}
              accessibilityRole="button"
              accessibilityLabel="Iniciar viaje"
            >
              <Text className="text-green-700 text-sm font-medium">Iniciar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-red-50 border border-red-200 rounded-lg py-2 items-center"
              onPress={() => { setActionTrip(item); setActionType('cancel'); }}
              accessibilityRole="button"
              accessibilityLabel="Cancelar viaje"
            >
              <Text className="text-red-700 text-sm font-medium">Cancelar</Text>
            </TouchableOpacity>
          </>
        )}
        {item.status === 'IN_PROGRESS' && (
          <TouchableOpacity
            className="flex-1 bg-blue-50 border border-blue-200 rounded-lg py-2 items-center"
            onPress={() => { setActionTrip(item); setActionType('complete'); }}
            accessibilityRole="button"
            accessibilityLabel="Completar viaje"
          >
            <Text className="text-blue-700 text-sm font-medium">Completar viaje</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          className="px-3 bg-neutral-50 border border-neutral-200 rounded-lg py-2 items-center"
          onPress={() =>
            router.push({
              pathname: '/(app)/trips/reservations/[tripId]',
              params: { tripId: item.id },
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Ver pasajeros"
        >
          <Text className="text-neutral-700 text-sm font-medium">Pasajeros</Text>
        </TouchableOpacity>
      </View>
    </Card>
  ), []);

  if (loading && trips.length === 0) return <InlineLoader />;
  if (error && trips.length === 0)   return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      {/* New trip FAB */}
      <View className="px-4 pt-3 pb-2 flex-row justify-end">
        <TouchableOpacity
          className="flex-row items-center bg-primary-600 rounded-xl px-4 py-2"
          onPress={() => router.push('/(app)/driver/trips/new')}
          accessibilityRole="button"
          accessibilityLabel="Publicar nuevo viaje"
        >
          <Plus size={18} color="#fff" />
          <Text className="ml-1 text-white font-semibold text-sm">Publicar viaje</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerClassName="px-4 pb-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            title="Sin viajes publicados"
            description="Publica tu primer viaje para empezar."
            actionLabel="Publicar viaje"
            onAction={() => router.push('/(app)/driver/trips/new')}
            icon={<Car size={48} color={Colors.neutral[400]} />}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <ConfirmModal
        visible={!!actionTrip && !!actionType}
        title={
          actionType === 'start'    ? 'Iniciar viaje' :
          actionType === 'complete' ? 'Completar viaje' :
          'Cancelar viaje'
        }
        message={
          actionType === 'start'
            ? '¿Confirmas que el viaje va a comenzar?'
            : actionType === 'complete'
            ? '¿Confirmas que el viaje ha llegado al destino?'
            : '¿Estás seguro de cancelar este viaje? Se notificará a los pasajeros.'
        }
        confirmLabel={
          actionType === 'start'    ? 'Sí, iniciar' :
          actionType === 'complete' ? 'Sí, completar' :
          'Sí, cancelar'
        }
        confirmVariant={actionType === 'cancel' ? 'danger' : 'primary'}
        loading={actioning}
        onConfirm={handleAction}
        onCancel={() => { setActionTrip(null); setActionType(null); }}
      />
    </SafeAreaView>
  );
}
