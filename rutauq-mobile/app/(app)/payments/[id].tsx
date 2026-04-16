import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { CheckCircle, XCircle, Clock, CreditCard } from 'lucide-react-native';
import { Card, Button, Loader, ErrorState } from '@/components/ui';
import { paymentsService } from '@/services/payments.service';
import { formatDate, formatCurrency, getErrorMessage } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import type { PaymentResponse, PaymentStatus } from '@/types';

const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING:  'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

const STATUS_COLOR: Record<PaymentStatus, string> = {
  PENDING:  Colors.warning,
  APPROVED: Colors.success,
  REJECTED: Colors.danger,
  CANCELLED: Colors.neutral[500],
  REFUNDED: Colors.primary[600],
};

export default function PaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    paymentsService
      .getById(id)
      .then(setPayment)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader />;
  if (error || !payment) return <ErrorState message={error ?? 'Pago no encontrado'} />;

  const isApproved = payment.status === 'APPROVED';
  const isRejected = payment.status === 'REJECTED' || payment.status === 'CANCELLED';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Status icon */}
        <View className="items-center mb-6">
          {isApproved ? (
            <CheckCircle size={64} color={Colors.success} />
          ) : isRejected ? (
            <XCircle size={64} color={Colors.danger} />
          ) : (
            <Clock size={64} color={Colors.warning} />
          )}
          <Text
            className="text-2xl font-bold mt-3"
            style={{ color: STATUS_COLOR[payment.status] }}
          >
            {STATUS_LABEL[payment.status]}
          </Text>
          <Text className="text-3xl font-bold text-neutral-900 mt-2">
            {formatCurrency(payment.amount)}
          </Text>
        </View>

        {/* Details */}
        <Card className="mb-4">
          <Text className="font-semibold text-neutral-900 mb-3">Detalles del pago</Text>

          <View className="flex-row justify-between mb-3">
            <Text className="text-neutral-500">ID de pago</Text>
            <Text className="text-neutral-900 font-mono text-xs">
              {payment.id.slice(0, 12)}...
            </Text>
          </View>

          <View className="flex-row justify-between mb-3">
            <Text className="text-neutral-500">MP ID</Text>
            <Text className="text-neutral-900">{payment.mercadoPagoPaymentId || '—'}</Text>
          </View>

          <View className="flex-row justify-between mb-3">
            <Text className="text-neutral-500">Método</Text>
            <View className="flex-row items-center">
              <CreditCard size={14} color={Colors.neutral[500]} />
              <Text className="ml-1 text-neutral-900 capitalize">
                {payment.paymentMethod || '—'}
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between mb-3">
            <Text className="text-neutral-500">Moneda</Text>
            <Text className="text-neutral-900">{payment.currency}</Text>
          </View>

          <View className="flex-row justify-between mb-3">
            <Text className="text-neutral-500">Creado</Text>
            <Text className="text-neutral-900">{formatDate(payment.createdAt)}</Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-neutral-500">Actualizado</Text>
            <Text className="text-neutral-900">{formatDate(payment.updatedAt)}</Text>
          </View>
        </Card>

        <Button
          variant="outline"
          onPress={() => router.replace(`/(app)/reservations/${payment.reservationId}`)}
        >
          Ver reserva
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
