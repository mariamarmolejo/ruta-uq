"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRequireRole } from "@/hooks/useRequireRole";
import { tripsService } from "@/services/trips.service";
import type { TripResponse, TripStatus } from "@/types";
import {
  formatCurrency,
  formatDateShort,
  getErrorMessage,
  TRIP_STATUS_VARIANT,
} from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";

const ALL = "ALL" as const;
type Filter = TripStatus | typeof ALL;

export default function AdminTripsPage() {
  const roleLoading = useRequireRole(["ADMIN"]);
  const t = useTranslations("admin.trips");
  const tStatus = useTranslations("tripStatus");

  const [trips, setTrips] = useState<TripResponse[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(ALL);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    setFetchLoading(true);
    setFetchError(null);
    try {
      const data = await tripsService.search();
      setTrips(data);
    } catch (err) {
      setFetchError(getErrorMessage(err));
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!roleLoading) fetchTrips();
  }, [roleLoading, fetchTrips]);

  const handleCancel = async (tripId: string) => {
    if (!confirm(t("confirmCancel"))) return;
    setCancelError(null);
    setCancelling(tripId);
    try {
      await tripsService.cancel(tripId);
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId ? { ...t, status: "CANCELLED" as TripStatus } : t
        )
      );
    } catch (err) {
      setCancelError(getErrorMessage(err));
    } finally {
      setCancelling(null);
    }
  };

  if (roleLoading || fetchLoading) return <Loader fullPage />;
  if (fetchError)
    return <ErrorState message={fetchError} onRetry={fetchTrips} />;

  const filters: Filter[] = [ALL, "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  const visible =
    filter === ALL ? trips : trips.filter((t) => t.status === filter);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {trips.length === 1 ? t("subtitle", { n: trips.length }) : t("subtitlePlural", { n: trips.length })}
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm font-medium text-neutral-500 hover:text-neutral-700"
        >
          {t("backToOverview")}
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-primary-600 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {f === ALL ? t("all") : tStatus(f)}
            {f === ALL
              ? ` (${trips.length})`
              : ` (${trips.filter((t) => t.status === f).length})`}
          </button>
        ))}
      </div>

      {cancelError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {cancelError}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title={t("noTrips")}
          description={t("noTripsDesc")}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {t("colRoute")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {t("colDeparture")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {t("colDriver")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {t("colSeats")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {t("colPrice")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {t("colStatus")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {t("colActions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visible.map((trip) => (
                <tr key={trip.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/trips/detail?id=${trip.id}`}
                      className="font-medium text-neutral-900 hover:text-primary-600"
                    >
                      {trip.origin} → {trip.destination}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {formatDateShort(trip.departureTime)}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {trip.driver.firstName} {trip.driver.lastName}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {trip.availableSeats}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {formatCurrency(trip.pricePerSeat)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={TRIP_STATUS_VARIANT[trip.status]}>
                      {tStatus(trip.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/trips/detail?id=${trip.id}`}
                        className="text-xs font-medium text-neutral-500 hover:text-neutral-700"
                      >
                        {t("view")}
                      </Link>
                      <Link
                        href={`/trips/reservations?id=${trip.id}`}
                        className="text-xs font-medium text-primary-600 hover:text-primary-800"
                      >
                        {t("reservations")}
                      </Link>
                      {trip.status === "SCHEDULED" && (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={cancelling === trip.id}
                          disabled={cancelling !== null}
                          onClick={() => handleCancel(trip.id)}
                        >
                          {t("cancel")}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
