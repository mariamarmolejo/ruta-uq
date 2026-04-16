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
import { Plus, Car, Edit2, Trash2 } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Card, EmptyState, ErrorState, InlineLoader, ConfirmModal, InfoModal } from '@/components/ui';
import { VehicleForm } from '@/components/driver/VehicleForm';
import { vehiclesService } from '@/services/vehicles.service';
import { getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import type { VehicleForm as VehicleFormValues } from '@/lib/validations';
import type { VehicleSummary } from '@/types';

export default function VehiclesScreen() {
  const [vehicles, setVehicles]     = useState<VehicleSummary[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [showAdd, setShowAdd]             = useState(false);
  const [editVehicle, setEditVehicle]     = useState<VehicleSummary | null>(null);
  const [deleteVehicle, setDeleteVehicle] = useState<VehicleSummary | null>(null);
  const [deleting, setDeleting]           = useState(false);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const data = await vehiclesService.getAll();
      setVehicles(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (data: VehicleFormValues) => {
    const v = await vehiclesService.create({
      brand: data.brand,
      model: data.model,
      year:  data.year,
      color: data.color,
      plate: data.plate,
      seats: data.seats,
    });
    setVehicles((prev) => [v, ...prev]);
    setShowAdd(false);
    Toast.show({ type: 'success', text1: 'Vehículo agregado' });
  };

  const handleEdit = async (data: VehicleFormValues) => {
    if (!editVehicle) return;
    const v = await vehiclesService.update(editVehicle.id, {
      brand: data.brand,
      model: data.model,
      year:  data.year,
      color: data.color,
      plate: data.plate,
      seats: data.seats,
    });
    setVehicles((prev) => prev.map((x) => (x.id === v.id ? v : x)));
    setEditVehicle(null);
    Toast.show({ type: 'success', text1: 'Vehículo actualizado' });
  };

  const handleDelete = async () => {
    if (!deleteVehicle) return;
    setDeleting(true);
    try {
      await vehiclesService.remove(deleteVehicle.id);
      setVehicles((prev) => prev.filter((v) => v.id !== deleteVehicle.id));
      Toast.show({ type: 'success', text1: 'Vehículo eliminado' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: getErrorMessage(err) });
    } finally {
      setDeleting(false);
      setDeleteVehicle(null);
    }
  };

  const renderItem = useCallback(({ item }: ListRenderItemInfo<VehicleSummary>) => (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center flex-1 mr-3">
          <View className="w-10 h-10 bg-primary-100 rounded-xl items-center justify-center mr-3">
            <Car size={20} color={Colors.primary[600]} />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-neutral-900">
              {item.brand} {item.model}
            </Text>
            <Text className="text-sm text-neutral-600">
              {item.year} · {item.color}
            </Text>
            <Text className="text-sm text-neutral-600">
              Placa: {item.plate} · {item.seats} puestos
            </Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="w-9 h-9 bg-primary-50 rounded-lg items-center justify-center"
            onPress={() => setEditVehicle(item)}
            accessibilityRole="button"
            accessibilityLabel="Editar vehículo"
          >
            <Edit2 size={16} color={Colors.primary[600]} />
          </TouchableOpacity>
          <TouchableOpacity
            className="w-9 h-9 bg-red-50 rounded-lg items-center justify-center"
            onPress={() => setDeleteVehicle(item)}
            accessibilityRole="button"
            accessibilityLabel="Eliminar vehículo"
          >
            <Trash2 size={16} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  ), []);

  if (loading && vehicles.length === 0) return <InlineLoader />;
  if (error && vehicles.length === 0)   return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      {/* Add FAB */}
      <View className="px-4 pt-3 pb-2 flex-row justify-end">
        <TouchableOpacity
          className="flex-row items-center bg-primary-600 rounded-xl px-4 py-2"
          onPress={() => setShowAdd(true)}
          accessibilityRole="button"
          accessibilityLabel="Agregar vehículo"
        >
          <Plus size={18} color="#fff" />
          <Text className="ml-1 text-white font-semibold text-sm">Agregar vehículo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerClassName="px-4 pb-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
        ListEmptyComponent={
          <EmptyState
            title="Sin vehículos"
            description="Agrega tu primer vehículo para publicar viajes."
            actionLabel="Agregar vehículo"
            onAction={() => setShowAdd(true)}
            icon={<Car size={48} color={Colors.neutral[400]} />}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Add modal */}
      <InfoModal
        visible={showAdd}
        title="Agregar vehículo"
        onClose={() => setShowAdd(false)}
      >
        <VehicleForm onSubmit={handleAdd} onCancel={() => setShowAdd(false)} />
      </InfoModal>

      {/* Edit modal */}
      <InfoModal
        visible={!!editVehicle}
        title="Editar vehículo"
        onClose={() => setEditVehicle(null)}
      >
        {editVehicle && (
          <VehicleForm
            defaultValues={{
              brand: editVehicle.brand,
              model: editVehicle.model,
              year:  editVehicle.year,
              color: editVehicle.color,
              plate: editVehicle.plate,
              seats: editVehicle.seats,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditVehicle(null)}
            submitLabel="Guardar cambios"
          />
        )}
      </InfoModal>

      {/* Delete confirm */}
      <ConfirmModal
        visible={!!deleteVehicle}
        title="Eliminar vehículo"
        message={`¿Eliminar ${deleteVehicle?.brand ?? ''} ${deleteVehicle?.model ?? ''} (${deleteVehicle?.plate ?? ''})?`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteVehicle(null)}
      />
    </SafeAreaView>
  );
}
