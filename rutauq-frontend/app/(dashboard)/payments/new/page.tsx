"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Script from "next/script";
import { useTranslations } from "next-intl";
import type { ReservationResponse } from "@/types";
import { reservationsService } from "@/services/reservations.service";
import { paymentsService } from "@/services/payments.service";
import { useAuthStore } from "@/stores/auth.store";
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";

const MP_FIELD_STYLE: MPFieldStyle = {
  fontSize: "14px",
  color: "#111827",
  placeholderColor: "#9ca3af",
};

const secureFieldWrapperClass =
  "h-10 w-full rounded border border-neutral-300 bg-white px-3 flex items-center focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-shadow";

type PaymentMethod = "card" | "pse";

// ---- Inner form ----

function PaymentFormInner() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId");
  const router = useRouter();
  const { user } = useAuthStore();
  const t = useTranslations("payment");

  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Payment method selector
  const [method, setMethod] = useState<PaymentMethod>("card");

  // MP SDK
  const [sdkReady, setSdkReady] = useState(false);
  const mpRef = useRef<MPInstance | null>(null);

  // Card state
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentTypeId, setPaymentTypeId] = useState("credit_card");
  const [paymentMethodName, setPaymentMethodName] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [identificationType, setIdentificationType] = useState("CC");
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [installments, setInstallments] = useState(1);
  const [installmentOptions, setInstallmentOptions] = useState<
    Array<{ value: number; label: string }>
  >([]);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 1. Fetch reservation
  useEffect(() => {
    if (!reservationId) {
      setFetchError(t("noReservation"));
      setFetchLoading(false);
      return;
    }
    reservationsService
      .getById(reservationId)
      .then(setReservation)
      .catch((err) => setFetchError(getErrorMessage(err)))
      .finally(() => setFetchLoading(false));
  }, [reservationId, t]);

  // 2. Mount MP.js card fields when Card method is active
  useEffect(() => {
    if (method !== "card" || !sdkReady || !reservation || !MP_PUBLIC_KEY) return;

    setPaymentMethodId("");
    setPaymentMethodName("");
    setInstallmentOptions([]);
    setInstallments(1);

    const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: "es-CO" });
    mpRef.current = mp;

    const cardNumberField = mp.fields.create("cardNumber", {
      placeholder: "0000 0000 0000 0000",
      style: MP_FIELD_STYLE,
    });
    cardNumberField.mount("mp-cardNumber");

    cardNumberField.on("binChange", async ({ bin }) => {
      if (!bin) {
        setPaymentMethodId("");
        setPaymentMethodName("");
        setInstallmentOptions([]);
        return;
      }
      try {
        const { results } = await mp.getPaymentMethods({ bin });
        if (results.length > 0) {
          setPaymentMethodId(results[0].id);
          setPaymentTypeId(results[0].payment_type_id);
          setPaymentMethodName(results[0].name);
        }
        const installmentData = await mp.getInstallments({
          bin,
          amount: String(reservation.totalPrice),
        });
        if (installmentData.length > 0) {
          const options = installmentData[0].payer_costs.map((c) => ({
            value: c.installments,
            label: c.recommended_message,
          }));
          setInstallmentOptions(options);
          setInstallments(options[0]?.value ?? 1);
        }
      } catch {
        setPaymentMethodId("");
        setInstallmentOptions([]);
      }
    });

    const expirationField = mp.fields.create("expirationDate", {
      placeholder: "MM/YY",
      style: MP_FIELD_STYLE,
    });
    expirationField.mount("mp-expirationDate");

    const securityCodeField = mp.fields.create("securityCode", {
      placeholder: "CVV",
      style: MP_FIELD_STYLE,
    });
    securityCodeField.mount("mp-securityCode");

    return () => {
      try { cardNumberField.unmount(); } catch { /* ignore */ }
      try { expirationField.unmount(); } catch { /* ignore */ }
      try { securityCodeField.unmount(); } catch { /* ignore */ }
      mpRef.current = null;
    };
  }, [method, sdkReady, reservation]);

  // 4a. Card submit
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpRef.current || !reservationId) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { id: cardToken } = await mpRef.current.fields.createCardToken({
        cardholderName,
        identificationType,
        identificationNumber,
      });
      const payment = await paymentsService.create({
        reservationId,
        cardToken,
        paymentMethodId,
        paymentType: paymentTypeId,
        installments,
        payerEmail: user?.email,
      });
      router.push(`/payments/detail?id=${payment.id}`);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  if (fetchLoading) return <Loader fullPage />;

  if (fetchError || !reservation)
    return <ErrorState message={fetchError ?? t("notFound")} />;

  if (reservation.status !== "PENDING_PAYMENT")
    return (
      <ErrorState
        title={t("notRequired")}
        message={t("alreadyStatus", { status: reservation.status.toLowerCase().replace("_", " ") })}
      />
    );

  return (
    <>
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
      />

      <div className="mx-auto max-w-lg">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {t("subtitle")}
          </p>
        </div>

        {/* Order summary */}
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-5 shadow-card">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {t("orderSummary")}
          </p>
          <div className="flex items-center gap-2 font-semibold text-neutral-900">
            <span>{reservation.trip.origin}</span>
            <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
            <span>{reservation.trip.destination}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-neutral-400">{t("departure")}</p>
              <p className="font-medium text-neutral-700">{formatDate(reservation.trip.departureTime)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">{t("seats")}</p>
              <p className="font-medium text-neutral-700">{reservation.seatsReserved}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">{t("total")}</p>
              <p className="text-lg font-bold text-neutral-900">{formatCurrency(reservation.totalPrice)}</p>
            </div>
          </div>
        </div>

        {/* Method selector */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {(["card"] as PaymentMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMethod(m); setSubmitError(null); }}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                method === m
                  ? "border-primary-600 bg-primary-50 text-primary-700"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {m === "card" ? (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                  {t("creditDebitCard")}
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                  {t("pse")}
                </>
              )}
            </button>
          ))}
        </div>

        {/* ---- Card form ---- */}
        {method === "card" && (
          !sdkReady ? (
            <div className="flex items-center justify-center rounded-lg border border-neutral-200 bg-white p-10 shadow-card">
              <div className="flex flex-col items-center gap-3 text-sm text-neutral-400">
                <Loader size="md" />
                <span>{t("loadingForm")}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCardSubmit} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-card">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {t("cardDetails")}
              </p>

              <div className="mb-4 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-neutral-700">{t("cardNumber")}</label>
                  {paymentMethodName && (
                    <span className="text-xs font-medium text-neutral-500">{paymentMethodName}</span>
                  )}
                </div>
                <div id="mp-cardNumber" className={secureFieldWrapperClass} />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">{t("expiryDate")}</label>
                  <div id="mp-expirationDate" className={secureFieldWrapperClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">{t("cvv")}</label>
                  <div id="mp-securityCode" className={secureFieldWrapperClass} />
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700">{t("cardholderName")}</label>
                <input
                  type="text"
                  placeholder={t("cardholderPlaceholder")}
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  required
                  className="h-10 w-full rounded border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="mb-4 grid grid-cols-5 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">{t("idType")}</label>
                  <select
                    value={identificationType}
                    onChange={(e) => setIdentificationType(e.target.value)}
                    className="h-10 rounded border border-neutral-300 bg-white px-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="NIT">NIT</option>
                    <option value="PP">PP</option>
                  </select>
                </div>
                <div className="col-span-3 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">{t("idNumber")}</label>
                  <input
                    type="text"
                    placeholder={t("idNumberPlaceholder")}
                    value={identificationNumber}
                    onChange={(e) => setIdentificationNumber(e.target.value)}
                    required
                    className="h-10 w-full rounded border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {installmentOptions.length > 0 && (
                <div className="mb-4 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">{t("installments")}</label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="h-10 w-full rounded border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {installmentOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {submitError && (
                <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => router.back()}>{t("back")}</Button>
                <Button
                  type="submit"
                  loading={submitting}
                  disabled={!paymentMethodId || !cardholderName || !identificationNumber}
                  className="flex-1"
                >
                  {t("pay", { amount: formatCurrency(reservation.totalPrice) })}
                </Button>
              </div>
              <p className="mt-3 text-center text-xs text-neutral-400">
                {t("securityNote")}
              </p>
            </form>
          )
        )}

      </div>
    </>
  );
}

export default function NewPaymentPage() {
  return (
    <Suspense fallback={<Loader fullPage />}>
      <PaymentFormInner />
    </Suspense>
  );
}
