import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function DriverLayout() {
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
      <Stack.Screen name="trips/index"     options={{ title: 'Mis viajes' }} />
      <Stack.Screen name="trips/new"       options={{ title: 'Publicar viaje' }} />
      <Stack.Screen name="trips/[id]/edit" options={{ title: 'Editar viaje' }} />
      <Stack.Screen name="vehicles/index"  options={{ title: 'Mis vehículos' }} />
    </Stack>
  );
}
