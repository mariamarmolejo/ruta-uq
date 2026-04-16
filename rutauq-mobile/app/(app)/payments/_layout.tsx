import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function PaymentsLayout() {
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
      <Stack.Screen name="new"        options={{ title: 'Pagar reserva' }} />
      <Stack.Screen name="[id]"       options={{ title: 'Detalle de pago' }} />
      <Stack.Screen name="pse-result" options={{ title: 'Resultado PSE' }} />
    </Stack>
  );
}
