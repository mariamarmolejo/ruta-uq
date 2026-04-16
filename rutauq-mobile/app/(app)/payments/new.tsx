import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { CreditCard, Building2 } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import {
  Card,
  Button,
  Loader,
  ErrorState,
  InlineLoader,
} from '@/components/ui';
import { paymentsService } from '@/services/payments.service';
import { reservationsService } from '@/services/reservations.service';
import { getErrorMessage, formatCurrency } from '@/lib/utils';
import { Colors } from '@/constants/colors';
import { PSEForm } from './PSEForm';
import type { PseBankOption, ReservationResponse } from '@/types';

type PaymentType = 'CARD' | 'PSE';

export default function NewPaymentScreen() {
  const { reservationId } = useLocalSearchParams<{ reservationId: string }>();

  const [reservation, setReservation]     = useState<ReservationResponse | null>(null);
  const [loadingReservation, setLoadingReservation] = useState(true);
  const [selectedType, setSelectedType]   = useState<PaymentType>('CARD');
  const [pseBanks, setPseBanks]           = useState<PseBankOption[]>([]);
  const [loadingBanks, setLoadingBanks]   = useState(false);
  const [checkoutUrl, setCheckoutUrl]     = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [creatingPayment, setCreatingPayment] = useState(false);

  useEffect(() => {
    if (!reservationId) return;
    reservationsService
      .getById(reservationId)
      .then(setReservation)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoadingReservation(false));
  }, [reservationId]);

  useEffect(() => {
    if (selectedType === 'PSE' && pseBanks.length === 0) {
      setLoadingBanks(true);
      paymentsService
        .getPseBanks()
        .then(setPseBanks)
        .catch(() => Toast.show({ type: 'error', text1: 'No se pudo cargar la lista de bancos' }))
        .finally(() => setLoadingBanks(false));
    }
  }, [selectedType]);

  const handleCardPayment = async () => {
    if (!reservationId) return;
    setCreatingPayment(true);
    try {
      const payment = await paymentsService.create({
        reservationId,
        paymentType: 'credit_card',
        callbackUrl: 'rutauq://pse-result',
      });
      if (payment.redirectUrl) {
        setCheckoutUrl(payment.redirectUrl);
      } else {
        router.replace(`/(app)/payments/${payment.id}`);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error al iniciar pago', text2: getErrorMessage(err) });
    } finally {
      setCreatingPayment(false);
    }
  };

  const handlePsePayment = async (data: {
    financialInstitution: string;
    docType: string;
    docNumber: string;
    entityType: string;
  }) => {
    if (!reservationId) return;
    setCreatingPayment(true);
    try {
      const payment = await paymentsService.create({
        reservationId,
        paymentType:          'bank_transfer',
        financialInstitution: data.financialInstitution,
        docType:              data.docType,
        docNumber:            data.docNumber,
        entityType:           data.entityType,
        callbackUrl:          'rutauq://pse-result',
      });
      if (payment.redirectUrl) {
        setCheckoutUrl(payment.redirectUrl);
      } else {
        router.replace(`/(app)/payments/${payment.id}`);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error al iniciar PSE', text2: getErrorMessage(err) });
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleWebViewNav = (event: WebViewNavigation) => {
    const url = event.url;
    if (url.startsWith('rutauq://pse-result') || url.includes('/pse-result')) {
      const paymentId = new URLSearchParams(url.split('?')[1] ?? '').get('payment_id');
      setCheckoutUrl(null);
      router.replace({
        pathname: '/(app)/payments/pse-result',
        params: paymentId ? { paymentId } : {},
      });
    }
  };

  if (loadingReservation) return <Loader />;
  if (error || !reservation) return <ErrorState message={error ?? 'Reserva no encontrada'} />;

  // Show WebView for MercadoPago checkout
  if (checkoutUrl) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <WebView
          source={{ uri: checkoutUrl }}
          onNavigationStateChange={handleWebViewNav}
          startInLoadingState
          renderLoading={() => <Loader />}
          className="flex-1"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount summary */}
          <Card className="mb-4 items-center">
            <Text className="text-neutral-500 text-sm mb-1">Total a pagar</Text>
            <Text className="text-3xl font-bold text-primary-600">
              {formatCurrency(reservation.totalPrice)}
            </Text>
            <Text className="text-xs text-neutral-400 mt-1">
              {reservation.seatsReserved} {reservation.seatsReserved === 1 ? 'puesto' : 'puestos'}
            </Text>
          </Card>

          {/* Method selector */}
          <Text className="text-sm font-medium text-neutral-700 mb-2">
            Método de pago
          </Text>
          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              className={`flex-1 border-2 rounded-xl p-4 items-center ${
                selectedType === 'CARD'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-neutral-200 bg-white'
              }`}
              onPress={() => setSelectedType('CARD')}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedType === 'CARD' }}
              accessibilityLabel="Tarjeta de crédito o débito"
            >
              <CreditCard
                size={24}
                color={selectedType === 'CARD' ? Colors.primary[600] : Colors.neutral[500]}
              />
              <Text
                className={`mt-2 text-sm font-semibold ${
                  selectedType === 'CARD' ? 'text-primary-700' : 'text-neutral-700'
                }`}
              >
                Tarjeta
              </Text>
              <Text
                className={`text-xs text-center mt-1 ${
                  selectedType === 'CARD' ? 'text-primary-500' : 'text-neutral-400'
                }`}
              >
                Crédito / Débito
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 border-2 rounded-xl p-4 items-center ${
                selectedType === 'PSE'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-neutral-200 bg-white'
              }`}
              onPress={() => setSelectedType('PSE')}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedType === 'PSE' }}
              accessibilityLabel="PSE - Transferencia bancaria"
            >
              <Building2
                size={24}
                color={selectedType === 'PSE' ? Colors.primary[600] : Colors.neutral[500]}
              />
              <Text
                className={`mt-2 text-sm font-semibold ${
                  selectedType === 'PSE' ? 'text-primary-700' : 'text-neutral-700'
                }`}
              >
                PSE
              </Text>
              <Text
                className={`text-xs text-center mt-1 ${
                  selectedType === 'PSE' ? 'text-primary-500' : 'text-neutral-400'
                }`}
              >
                Transferencia
              </Text>
            </TouchableOpacity>
          </View>

          {/* Card payment */}
          {selectedType === 'CARD' && (
            <Card className="mb-4">
              <Text className="text-sm text-neutral-600 mb-4">
                Serás redirigido al portal seguro de MercadoPago para completar tu pago con tarjeta.
              </Text>
              <Button
                onPress={handleCardPayment}
                loading={creatingPayment}
                size="lg"
              >
                Continuar al pago
              </Button>
            </Card>
          )}

          {/* PSE form */}
          {selectedType === 'PSE' && (
            <Card className="mb-4">
              {loadingBanks ? (
                <InlineLoader />
              ) : (
                <PSEForm
                  banks={pseBanks}
                  onSubmit={handlePsePayment}
                  loading={creatingPayment}
                />
              )}
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
