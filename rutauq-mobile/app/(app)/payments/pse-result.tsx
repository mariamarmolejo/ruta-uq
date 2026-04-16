import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { Button, Loader, Card } from '@/components/ui';
import { paymentsService } from '@/services/payments.service';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import type { PaymentResponse } from '@/types';

export default function PSEResultScreen() {
  const { paymentId, reservationId } = useLocalSearchParams<{
    paymentId?: string;
    reservationId?: string;
  }>();

  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        let data: PaymentResponse;
        if (paymentId) {
          data = await paymentsService.getById(paymentId);
        } else if (reservationId) {
          data = await paymentsService.getByReservation(reservationId);
        } else {
          setError('No se encontró información del pago.');
          setLoading(false);
          return;
        }
        setPayment(data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchPayment();
  }, [paymentId, reservationId]);

  if (loading) return <Loader message="Verificando pago..." />;

  const isApproved = payment?.status === 'APPROVED';
  const isRejected = payment?.status === 'REJECTED' || payment?.status === 'CANCELLED';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow px-6 items-center justify-center py-8"
      >
        {error ? (
          <>
            <XCircle size={64} color={Colors.danger} />
            <Text className="text-2xl font-bold text-neutral-900 text-center mt-4 mb-2">
              Error al verificar
            </Text>
            <Text className="text-neutral-600 text-center mb-8">{error}</Text>
          </>
        ) : (
          <>
            {isApproved ? (
              <CheckCircle size={64} color={Colors.success} />
            ) : isRejected ? (
              <XCircle size={64} color={Colors.danger} />
            ) : (
              <Clock size={64} color={Colors.warning} />
            )}

            <Text
              className="text-2xl font-bold text-center mt-4 mb-2"
              style={{
                color: isApproved
                  ? Colors.success
                  : isRejected
                  ? Colors.danger
                  : Colors.warning,
              }}
            >
              {isApproved
                ? '¡Pago exitoso!'
                : isRejected
                ? 'Pago rechazado'
                : 'Pago pendiente'}
            </Text>

            {payment && (
              <Card className="w-full mt-4 mb-6">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-neutral-500">Monto</Text>
                  <Text className="font-bold text-primary-600">
                    {formatCurrency(payment.amount)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-neutral-500">Método</Text>
                  <Text className="text-neutral-900 capitalize">{payment.paymentMethod || 'PSE'}</Text>
                </View>
              </Card>
            )}

            {isApproved && (
              <Text className="text-neutral-600 text-center mb-6">
                Tu reserva ha sido confirmada exitosamente.
              </Text>
            )}
            {isRejected && (
              <Text className="text-neutral-600 text-center mb-6">
                El pago no pudo ser procesado. Intenta con otro método o comunícate con tu banco.
              </Text>
            )}
            {!isApproved && !isRejected && (
              <Text className="text-neutral-600 text-center mb-6">
                Tu transacción está siendo procesada. Te notificaremos cuando se confirme.
              </Text>
            )}
          </>
        )}

        <Button
          onPress={() => router.replace('/(app)/reservations')}
          variant={isApproved ? 'primary' : 'outline'}
          className="w-full"
        >
          Ver mis reservas
        </Button>

        {payment?.id && (
          <Button
            variant="ghost"
            onPress={() => router.push(`/(app)/payments/${payment.id}`)}
            className="w-full mt-2"
          >
            Ver detalle del pago
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
