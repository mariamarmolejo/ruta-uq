import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function TripsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.neutral[900],
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        headerBackTitle: 'Atrás',
      }}
    >
      <Stack.Screen name="index"  options={{ title: 'Viajes disponibles' }} />
      <Stack.Screen name="[id]"   options={{ title: 'Detalle del viaje' }} />
      <Stack.Screen
        name="reservations/[tripId]"
        options={{ title: 'Pasajeros' }}
      />
    </Stack>
  );
}
