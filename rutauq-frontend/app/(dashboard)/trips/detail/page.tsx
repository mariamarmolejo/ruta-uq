"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { TripResponse, TripStatus } from "@/types";
import { tripsService } from "@/services/trips.service";
import { useAuthStore } from "@/stores/auth.store";
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";

const statusVariant: Record<TripStatus, "primary" | "success" | "default" | "danger"> = {
  SCHEDULED: "primary",
  IN_PROGRESS: "success",
  COMPLETED: "default",
  CANCELLED: "danger",
};

const statusLabel: Record<TripStatus, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function TripDetail() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const router = useRouter();
  const { user } = useAuthStore();

  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No trip ID provided.");
      setLoading(false);
      return;
    }
    tripsService
      .getById(id)
      .then(setTrip)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader fullPage />;
  if (error || !trip)
    return (
      <ErrorState
        message={error ?? "Trip not found."}
        onRetry={() => router.back()}
      />
    );

  const isDriver = user?.role === "DRIVER";
  const isOwnTrip = isDriver && trip.driver.email === user?.email;
  const canReserve =
    user?.role === "CLIENT" &&
    trip.status === "SCHEDULED" &&
    trip.availableSeats > 0;

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to trips
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-2xl font-bold text-neutral-900">
            <span>{trip.origin}</span>
            <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
            <span>{trip.destination}</span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">{formatDate(trip.departureTime)}</p>
        </div>
        <Badge variant={statusVariant[trip.status]}>{statusLabel[trip.status]}</Badge>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Price per seat" value={formatCurrency(trip.pricePerSeat)} />
          <StatCard label="Available seats" value={String(trip.availableSeats)} />
          <StatCard label="Vehicle capacity" value={`${trip.vehicle.seats} seats`} />
        </div>

        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Driver</p>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900">{trip.driver.firstName} {trip.driver.lastName}</p>
              <p className="text-xs text-neutral-500">{trip.driver.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Vehicle</p>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <Detail label="Brand" value={trip.vehicle.brand} />
              <Detail label="Model" value={trip.vehicle.model} />
              <Detail label="Year" value={String(trip.vehicle.year)} />
              <Detail label="Color" value={trip.vehicle.color} />
              <Detail label="Plate" value={trip.vehicle.plate} />
              <Detail label="Capacity" value={`${trip.vehicle.seats} seats`} />
            </div>
          </CardContent>
        </Card>

        {trip.description && (
          <Card>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Notes</p>
            <CardContent>
              <p className="text-sm text-neutral-700">{trip.description}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3 pt-2">
          {canReserve && (
            <Link href={`/reservations/new?tripId=${trip.id}`} className="flex-1">
              <Button className="w-full">Reserve a seat — {formatCurrency(trip.pricePerSeat)}</Button>
            </Link>
          )}
          {isOwnTrip && (
            <Link href={`/driver/trips/edit?id=${trip.id}`}>
              <Button variant="outline">Edit trip</Button>
            </Link>
          )}
          {!canReserve && !isOwnTrip && trip.status === "SCHEDULED" && trip.availableSeats === 0 && (
            <p className="text-sm text-neutral-500">No seats available.</p>
          )}
          {!canReserve && !isOwnTrip && trip.status !== "SCHEDULED" && (
            <p className="text-sm text-neutral-500">This trip is no longer accepting reservations.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TripDetailPage() {
  return (
    <Suspense fallback={<Loader fullPage />}>
      <TripDetail />
    </Suspense>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900">{value}</p>
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
