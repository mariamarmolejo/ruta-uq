"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { TripResponse } from "@/types";
import { tripsService } from "@/services/trips.service";
import { useRequireRole } from "@/hooks/useRequireRole";
import {
  formatCurrency,
  formatDate,
  getErrorMessage,
  TRIP_STATUS_VARIANT,
} from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";

export default function DriverTripsPage() {
  const loading = useRequireRole(["DRIVER", "ADMIN"]);
  const t = useTranslations("driverTrips");
  const tStatus = useTranslations("tripStatus");

  const [trips, setTrips] = useState<TripResponse[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchTrips = async () => {
    setFetching(true);
    setError(null);
    try {
      setTrips(await tripsService.getMyTrips());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading) fetchTrips();
  }, [loading]);

  const handleStart = async (id: string) => {
    if (!confirm(t("confirmStart"))) return;
    setStartingId(id);
    try {
      const updated = await tripsService.start(id);
      setTrips((prev) => prev.map((tr) => (tr.id === id ? updated : tr)));
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setStartingId(null);
    }
  };

  const handleComplete = async (id: string) => {
    if (!confirm(t("confirmComplete"))) return;
    setCompletingId(id);
    try {
      const updated = await tripsService.complete(id);
      setTrips((prev) => prev.map((tr) => (tr.id === id ? updated : tr)));
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setCompletingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm(t("confirmCancel"))) return;
    setCancellingId(id);
    try {
      await tripsService.cancel(id);
      await fetchTrips();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setCancellingId(null);
    }
  };

  if (loading || fetching) return <Loader fullPage />;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
        </div>
        <Link href="/driver/trips/new">
          <Button size="sm">{t("newTrip")}</Button>
        </Link>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchTrips} />
      ) : trips.length === 0 ? (
        <EmptyState
          title={t("noTrips")}
          description={t("noTripsDesc")}
          action={
            <Link href="/driver/trips/new">
              <Button size="sm">{t("newTrip")}</Button>
            </Link>
          }
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="rounded-lg border border-neutral-200 bg-white p-5 shadow-card"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: route info */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900">{trip.origin}</span>
                    <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                    </svg>
                    <span className="font-semibold text-neutral-900">{trip.destination}</span>
                    <Badge variant={TRIP_STATUS_VARIANT[trip.status]}>
                      {tStatus(trip.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-500">{formatDate(trip.departureTime)}</p>
                  <p className="text-sm text-neutral-500">
                    {t("seatsAvailable", { seats: trip.availableSeats, price: formatCurrency(trip.pricePerSeat) })}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {trip.vehicle.brand} {trip.vehicle.model} · {trip.vehicle.plate}
                  </p>
                </div>

                {/* Right: actions */}
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Link href={`/trips/reservations?id=${trip.id}`}>
                    <Button variant="outline" size="sm">{t("reservations")}</Button>
                  </Link>
                  {trip.status === "SCHEDULED" && (
                    <>
                      <Link href={`/driver/trips/edit?id=${trip.id}`}>
                        <Button variant="outline" size="sm">{t("edit")}</Button>
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={startingId === trip.id}
                        onClick={() => handleStart(trip.id)}
                      >
                        {t("startTrip")}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={cancellingId === trip.id}
                        onClick={() => handleCancel(trip.id)}
                      >
                        {t("cancel")}
                      </Button>
                    </>
                  )}
                  {trip.status === "IN_PROGRESS" && (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={completingId === trip.id}
                      onClick={() => handleComplete(trip.id)}
                    >
                      {t("completeTrip")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
