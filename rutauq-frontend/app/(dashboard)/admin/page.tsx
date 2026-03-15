"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole } from "@/hooks/useRequireRole";
import { tripsService } from "@/services/trips.service";
import type { TripResponse, TripStatus } from "@/types";
import { getErrorMessage } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

const STATUS_ORDER: TripStatus[] = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const statusConfig: Record<
  TripStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  SCHEDULED: {
    label: "Scheduled",
    bg: "bg-primary-50",
    text: "text-primary-700",
    border: "border-primary-200",
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  COMPLETED: {
    label: "Completed",
    bg: "bg-neutral-50",
    text: "text-neutral-700",
    border: "border-neutral-200",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
};

export default function AdminOverviewPage() {
  const loading = useRequireRole(["ADMIN"]);

  const [trips, setTrips] = useState<TripResponse[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = async () => {
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
  };

  useEffect(() => {
    if (!loading) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading || fetchLoading) return <Loader fullPage />;
  if (fetchError)
    return <ErrorState message={fetchError} onRetry={fetchData} />;

  const counts = STATUS_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: trips.filter((t) => t.status === s).length }),
    {} as Record<TripStatus, number>
  );

  const recentTrips = [...trips]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">
          Admin Overview
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Platform summary and quick links.
        </p>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATUS_ORDER.map((status) => {
          const cfg = statusConfig[status];
          return (
            <div
              key={status}
              className={`rounded-lg border ${cfg.border} ${cfg.bg} p-4`}
            >
              <p className={`text-2xl font-bold ${cfg.text}`}>
                {counts[status]}
              </p>
              <p className="mt-1 text-xs font-medium text-neutral-500">
                {cfg.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/admin/trips">
          <Card hoverable>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                <svg
                  className="h-5 w-5 text-primary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-neutral-900">All Trips</p>
                <p className="text-xs text-neutral-500">
                  {trips.length} total · manage &amp; cancel
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/users">
          <Card hoverable>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-100">
                <svg
                  className="h-5 w-5 text-secondary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-neutral-900">Users</p>
                <p className="text-xs text-neutral-500">View registered users</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent trips */}
      {recentTrips.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Recently created trips
            </p>
            <Link
              href="/admin/trips"
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-neutral-100">
            {recentTrips.map((trip) => {
              const cfg = statusConfig[trip.status];
              return (
                <Link
                  key={trip.id}
                  href={`/trips/detail?id=${trip.id}`}
                  className="flex items-center justify-between gap-4 py-3 text-sm hover:bg-neutral-50 -mx-5 px-5 transition-colors"
                >
                  <span className="font-medium text-neutral-800">
                    {trip.origin} → {trip.destination}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}
                  >
                    {cfg.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
