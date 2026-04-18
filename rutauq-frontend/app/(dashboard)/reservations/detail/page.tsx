"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReservationResponse, ReservationStatus, RefundResponse } from "@/types";
import { reservationsService } from "@/services/reservations.service";
import { refundsService } from "@/services/refunds.service";
  import {
    formatCurrency,
    formatDate,
    getErrorMessage,
    RESERVATION_STATUS_VARIANT,
  } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

const cancellableStatuses: ReservationStatus[] = ["PENDING_PAYMENT", "CONFIRMED"];

function ReservationDetail() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const router = useRouter();
  const t = useTranslations("reservationDetail");
  const tStatus = useTranslations("reservationStatus");
  const tRefunds = useTranslations("refunds");
  const tRefundStatus = useTranslations("refundStatus");

  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [refund, setRefund] = useState<RefundResponse | null | undefined>(undefined);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [requestingRefund, setRequestingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const fetchReservation = useCallback(() => {
    if (!id) {
      setError("No reservation ID provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    reservationsService
      .getById(id)
      .then((res) => {
        setReservation(res);
        // Fetch existing refund in parallel (null = none exists)
        refundsService.getByReservation(id)
          .then(setRefund)
          .catch(() => setRefund(null));
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  const handleCancel = async () => {
    if (!confirm(t("confirmCancel"))) return;
    setCancelling(true);
    try {
      await reservationsService.cancel(id);
      fetchReservation();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const handleRefund = async () => {
    setRefundError(null);
    setRequestingRefund(true);
    try {
      const result = await refundsService.request(id);
      setRefund(result);
      setShowRefundModal(false);
    } catch (err) {
      setRefundError(getErrorMessage(err));
    } finally {
      setRequestingRefund(false);
    }
  };

  if (loading) return <Loader fullPage />;
  if (error || !reservation)
    return <ErrorState message={error ?? t("notFound")} onRetry={() => router.back()} />;

  const { trip } = reservation;
  const canCancel = cancellableStatuses.includes(reservation.status);
  const canPay = reservation.status === "PENDING_PAYMENT";
  const canRequestRefund =
    trip.status === "CANCELLED" &&
    (reservation.status === "CONFIRMED" || reservation.status === "CANCELLED") &&
    refund === null;

  return (
    <div className="mx-auto max-w-lg">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        {t("back")}
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xl font-bold text-neutral-900">
            <span>{trip.origin}</span>
            <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
            <span>{trip.destination}</span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {t("reservationId", { id: reservation.id.slice(0, 8) })}
          </p>
        </div>
        <Badge variant={RESERVATION_STATUS_VARIANT[reservation.status]}>
          {tStatus(reservation.status)}
        </Badge>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label={t("seats")} value={String(reservation.seatsReserved)} />
          <StatCard label={t("total")} value={formatCurrency(reservation.totalPrice)} />
          <StatCard label={t("perSeat")} value={formatCurrency(trip.pricePerSeat)} />
        </div>

        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("tripDetails")}</p>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <Detail label={t("departure")} value={formatDate(trip.departureTime)} />
              <Detail label={t("tripStatus")} value={trip.status} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("passenger")}</p>
          <CardContent>
            <p className="text-sm font-medium text-neutral-900">
              {reservation.passenger.firstName} {reservation.passenger.lastName}
            </p>
            <p className="text-xs text-neutral-500">{reservation.passenger.email}</p>
          </CardContent>
        </Card>

        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("timeline")}</p>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <Detail label={t("booked")} value={formatDate(reservation.createdAt)} />
              <Detail label={t("lastUpdated")} value={formatDate(reservation.updatedAt)} />
            </div>
          </CardContent>
        </Card>

        {reservation.status === "PENDING_PAYMENT" && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {t("pendingPaymentNotice")}
          </div>
        )}
        {reservation.status === "PAYMENT_FAILED" && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {t("paymentFailedNotice")}
          </div>
        )}
        {reservation.status === "CONFIRMED" && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {t("confirmedNotice")}
          </div>
        )}

        {/* Refund status notice */}
        {refund && (
          <div className={`rounded-md border px-4 py-3 text-sm ${
            refund.status === "PROCESSED"
              ? "border-green-200 bg-green-50 text-green-800"
              : refund.status === "FAILED"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-yellow-200 bg-yellow-50 text-yellow-800"
          }`}>
            <span className="font-medium">
              {tRefunds("refundBadge", { status: tRefundStatus(refund.status) })}
            </span>
            {refund.status === "PROCESSED" && refund.processedAt && (
              <span className="ml-2 text-xs opacity-75">{formatDate(refund.processedAt)}</span>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          {canPay && (
            <Link href={`/payments/new?reservationId=${reservation.id}`} className="flex-1">
              <Button className="w-full">
                {t("payNow", { price: formatCurrency(reservation.totalPrice) })}
              </Button>
            </Link>
          )}
          {canCancel && (
            <Button
              variant={canPay ? "outline" : "danger"}
              loading={cancelling}
              onClick={handleCancel}
              className={canPay ? "" : "flex-1"}
            >
              {t("cancelReservation")}
            </Button>
          )}
          {canRequestRefund && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setRefundError(null); setShowRefundModal(true); }}
            >
              {tRefunds("requestRefund")}
            </Button>
          )}
        </div>

        {/* Refund confirmation modal */}
        <Modal
          open={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          title={tRefunds("confirmTitle")}
        >
          <p className="text-sm text-neutral-600">
            {tRefunds("confirmDesc", { amount: formatCurrency(reservation.totalPrice) })}
          </p>
          {refundError && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {refundError}
            </p>
          )}
          <div className="mt-5 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowRefundModal(false)}
              disabled={requestingRefund}
            >
              {tRefunds("cancel")}
            </Button>
            <Button loading={requestingRefund} onClick={handleRefund} className="flex-1">
              {tRefunds("confirmButton")}
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default function ReservationDetailPage() {
  return (
    <Suspense fallback={<Loader fullPage />}>
      <ReservationDetail />
    </Suspense>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-neutral-400">{label}: </span>
      <span className="font-medium text-neutral-700">{value}</span>
    </div>
  );
}
