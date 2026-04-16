import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { TripForm } from '@/components/driver/TripForm';
import { InlineLoader, ErrorState } from '@/components/ui';
import { tripsService } from '@/services/trips.service';
import { vehiclesService } from '@/services/vehicles.service';
import { getErrorMessage } from '@/lib/utils';
import type { TripForm as TripFormValues } from '@/lib/validations';
import type { VehicleSummary } from '@/types';

export default function NewTripScreen() {
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    vehiclesService
      .getAll()
      .then(setVehicles)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (data: TripFormValues) => {
    try {
      const trip = await tripsService.create({
        origin:         data.origin,
        destination:    data.destination,
        departureTime:  data.departureTime,
        availableSeats: data.availableSeats,
        pricePerSeat:   data.pricePerSeat,
        vehicleId:      data.vehicleId,
        description:    data.description || undefined,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '¡Viaje publicado!' });
      router.replace('/(app)/driver/trips');
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: getErrorMessage(err) });
      throw err; // re-throw so form knows it failed
    }
  };

  if (loading) return <InlineLoader />;
  if (error)   return <ErrorState message={error} />;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <TripForm vehicles={vehicles} onSubmit={handleSubmit} />
    </SafeAreaView>
  );
}
