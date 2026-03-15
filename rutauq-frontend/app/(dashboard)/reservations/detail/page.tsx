"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { ReservationResponse, ReservationStatus } from "@/types";
import { reservationsService } from "@/services/reservations.service";
import {
  formatCurrency,
  formatDate,
  getErrorMessage,
  RESERVATION_STATUS_VARIANT,
  RESERVATION_STATUS_LABEL,
} from "@/lib/utils";
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

  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchReservation = useCallback(() => {
    if (!id) {
      setError("No reservation ID provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    reservationsService
      .getById(id)
      .then(setReservation)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;
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

  if (loading) return <Loader fullPage />;
  if (error || !reservation)
    return <ErrorState message={error ?? "Reservation not found."} onRetry={() => router.back()} />;

  const { trip } = reservation;
  const canCancel = cancellableStatuses.includes(reservation.status);
  const canPay = reservation.status === "PENDING_PAYMENT";

  return (
    <div className="mx-auto max-w-lg">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
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
          <p className="mt-1 text-sm text-neutral-500">Reservation ID: {reservation.id.slice(0, 8)}…</p>
        </div>
        <Badge variant={RESERVATION_STATUS_VARIANT[reservation.status]}>{RESERVATION_STATUS_LABEL[reservation.status]}</Badge>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Seats" value={String(reservation.seatsReserved)} />
          <StatCard label="Total" value={formatCurrency(reservation.totalPrice)} />
          <StatCard label="Per seat" value={formatCurrency(trip.pricePerSeat)} />
        </div>

        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Trip details</p>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <Detail label="Departure" value={formatDate(trip.departureTime)} />
              <Detail label="Trip status" value={trip.status} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Passenger</p>
          <CardContent>
            <p className="text-sm font-medium text-neutral-900">{reservation.passenger.firstName} {reservation.passenger.lastName}</p>
            <p className="text-xs text-neutral-500">{reservation.passenger.email}</p>
          </CardContent>
        </Card>

        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Timeline</p>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <Detail label="Booked" value={formatDate(reservation.createdAt)} />
              <Detail label="Last updated" value={formatDate(reservation.updatedAt)} />
            </div>
          </CardContent>
        </Card>

        {reservation.status === "PENDING_PAYMENT" && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            Your seat is held. Complete the payment to confirm your reservation.
          </div>
        )}
        {reservation.status === "PAYMENT_FAILED" && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            The payment for this reservation was unsuccessful. Your seat has been released.
          </div>
        )}
        {reservation.status === "CONFIRMED" && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Your reservation is confirmed. See you on the trip!
          </div>
        )}

        <div className="flex gap-3 pt-1">
          {canPay && (
            <Link href={`/payments/new?reservationId=${reservation.id}`} className="flex-1">
              <Button className="w-full">Pay now — {formatCurrency(reservation.totalPrice)}</Button>
            </Link>
          )}
          {canCancel && (
            <Button
              variant={canPay ? "outline" : "danger"}
              loading={cancelling}
              onClick={handleCancel}
              className={canPay ? "" : "flex-1"}
            >
              Cancel reservation
            </Button>
          )}
        </div>
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
