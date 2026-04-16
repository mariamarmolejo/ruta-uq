import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Users, Map, ArrowRight } from 'lucide-react-native';
import { Card, Loader, ErrorState } from '@/components/ui';
import { usersService } from '@/services/users.service';
import { tripsService } from '@/services/trips.service';
import { reservationsService } from '@/services/reservations.service';
import { getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';

interface Stats {
  totalUsers:        number;
  totalTrips:        number;
  totalReservations: number;
}

export default function AdminDashboardScreen() {
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const fetchData = async () => {
    setError(null);
    try {
      const [users, trips, reservations] = await Promise.all([
        usersService.getAllUsers(),
        usersService.getAllTripsAdmin(),
        reservationsService.getAll(),
      ]);
      setStats({
        totalUsers:        users.length,
        totalTrips:        (trips as unknown[]).length,
        totalReservations: reservations.length,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <Loader />;
  if (error)   return <ErrorState message={error} onRetry={fetchData} />;

  const tiles = [
    {
      label:  'Usuarios',
      value:  stats?.totalUsers ?? 0,
      icon:   <Users size={24} color={Colors.primary[600]} />,
      bg:     'bg-primary-50',
      route:  '/(app)/admin/users',
    },
    {
      label:  'Viajes',
      value:  stats?.totalTrips ?? 0,
      icon:   <Map size={24} color={Colors.success} />,
      bg:     'bg-green-50',
      route:  '/(app)/admin/trips',
    },
    {
      label:  'Reservas',
      value:  stats?.totalReservations ?? 0,
      icon:   <Users size={24} color={Colors.warning} />,
      bg:     'bg-amber-50',
      route:  null,
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
      >
        <Text className="text-2xl font-bold text-neutral-900 mb-6">
          Panel de administración
        </Text>

        {/* Stats tiles */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          {tiles.map((tile) => (
            <TouchableOpacity
              key={tile.label}
              className="flex-1 min-w-[44%]"
              onPress={() => tile.route && router.push(tile.route as `/${string}`)}
              disabled={!tile.route}
              accessibilityRole={tile.route ? 'button' : undefined}
              accessibilityLabel={tile.label}
            >
              <Card className={`${tile.bg} border-0`}>
                <View className="mb-2">{tile.icon}</View>
                <Text className="text-3xl font-bold text-neutral-900">{tile.value}</Text>
                <View className="flex-row items-center justify-between mt-1">
                  <Text className="text-sm text-neutral-600">{tile.label}</Text>
                  {tile.route && <ArrowRight size={14} color={Colors.neutral[400]} />}
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick links */}
        <Text className="text-base font-semibold text-neutral-900 mb-3">Accesos rápidos</Text>
        <Card>
          <TouchableOpacity
            className="flex-row items-center justify-between py-3 border-b border-neutral-100"
            onPress={() => router.push('/(app)/admin/users')}
            accessibilityRole="button"
          >
            <View className="flex-row items-center">
              <Users size={18} color={Colors.neutral[500]} />
              <Text className="ml-3 font-medium text-neutral-900">Gestionar usuarios</Text>
            </View>
            <ArrowRight size={16} color={Colors.neutral[400]} />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center justify-between py-3"
            onPress={() => router.push('/(app)/admin/trips')}
            accessibilityRole="button"
          >
            <View className="flex-row items-center">
              <Map size={18} color={Colors.neutral[500]} />
              <Text className="ml-3 font-medium text-neutral-900">Ver todos los viajes</Text>
            </View>
            <ArrowRight size={16} color={Colors.neutral[400]} />
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
