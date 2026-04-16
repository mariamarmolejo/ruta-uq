import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from 'lucide-react-native';
import { Card, Badge, EmptyState, ErrorState, InlineLoader } from '@/components/ui';
import { usersService } from '@/services/users.service';
import { formatDateOnly, getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import type { UserProfile, Role } from '@/types';

const ROLE_LABEL: Record<Role, string> = {
  CLIENT: 'Pasajero',
  DRIVER: 'Conductor',
  ADMIN:  'Admin',
};

const ROLE_VARIANT: Record<Role, 'primary' | 'success' | 'warning'> = {
  CLIENT: 'primary',
  DRIVER: 'success',
  ADMIN:  'warning',
};

export default function AdminUsersScreen() {
  const [users, setUsers]           = useState<UserProfile[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const data = await usersService.getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<UserProfile>) => (
    <Card className="mb-3">
      <View className="flex-row items-center">
        <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
          <User size={18} color={Colors.primary[600]} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-0.5">
            <Text className="font-semibold text-neutral-900">
              {item.firstName} {item.lastName}
            </Text>
            <Badge variant={ROLE_VARIANT[item.role]}>{ROLE_LABEL[item.role]}</Badge>
          </View>
          <Text className="text-sm text-neutral-600">{item.email}</Text>
          {item.phone && (
            <Text className="text-xs text-neutral-500">{item.phone}</Text>
          )}
          <Text className="text-xs text-neutral-400 mt-1">
            Registrado: {formatDateOnly(item.createdAt)}
          </Text>
        </View>
      </View>
    </Card>
  ), []);

  if (loading && users.length === 0) return <InlineLoader />;
  if (error && users.length === 0)   return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="px-4 pt-3 pb-2">
        <Text className="text-sm text-neutral-500">
          {users.length} {users.length === 1 ? 'usuario' : 'usuarios'} registrados
        </Text>
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerClassName="px-4 pb-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
        ListEmptyComponent={
          <EmptyState title="Sin usuarios" description="No hay usuarios registrados." />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
