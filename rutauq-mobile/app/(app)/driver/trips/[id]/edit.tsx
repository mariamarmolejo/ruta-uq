import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { TripForm } from '@/components/driver/TripForm';
import { Loader, ErrorState } from '@/components/ui';
import { tripsService } from '@/services/trips.service';
import { vehiclesService } from '@/services/vehicles.service';
import { getErrorMessage } from '@/lib/utils';
import type { TripForm as TripFormValues } from '@/lib/validations';
import type { TripResponse, VehicleSummary } from '@/types';

export default function EditTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [trip, setTrip]         = useState<TripResponse | null>(null);
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      tripsService.getById(id),
      vehiclesService.getAll(),
    ])
      .then(([t, v]) => {
        setTrip(t);
        setVehicles(v);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: TripFormValues) => {
    if (!id) return;
    try {
      await tripsService.update(id, {
        origin:         data.origin,
        destination:    data.destination,
        departureTime:  data.departureTime,
        availableSeats: data.availableSeats,
        pricePerSeat:   data.pricePerSeat,
        vehicleId:      data.vehicleId,
        description:    data.description || undefined,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Viaje actualizado' });
      router.back();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: getErrorMessage(err) });
      throw err;
    }
  };

  if (loading || !trip) return <Loader />;
  if (error)            return <ErrorState message={error} />;

  const defaultValues: Partial<TripFormValues> = {
    origin:         trip.origin,
    destination:    trip.destination,
    departureTime:  trip.departureTime,
    availableSeats: trip.availableSeats,
    pricePerSeat:   trip.pricePerSeat,
    vehicleId:      trip.vehicle.id,
    description:    trip.description ?? '',
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <TripForm
        vehicles={vehicles}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
        existingTrip={trip}
      />
    </SafeAreaView>
  );
}
