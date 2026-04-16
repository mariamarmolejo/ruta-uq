import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function ReservationsLayout() {
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
      <Stack.Screen name="index"  options={{ title: 'Mis reservas' }} />
      <Stack.Screen name="new"    options={{ title: 'Nueva reserva' }} />
      <Stack.Screen name="[id]"   options={{ title: 'Detalle de reserva' }} />
    </Stack>
  );
}
