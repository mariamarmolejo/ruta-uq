"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { tripsService, type TripSearchParams } from "@/services/trips.service";
import type { TripResponse } from "@/types";
import { getErrorMessage } from "@/lib/utils";
import TripCard from "@/components/trips/TripCard";
import TripFilters from "@/components/trips/TripFilters";
import Loader from "@/components/ui/Loader";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";

function TripsList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [trips, setTrips] = useState<TripResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramsFromUrl = useMemo((): TripSearchParams => ({
    origin: searchParams.get("origin") ?? undefined,
    destination: searchParams.get("destination") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    minSeats: searchParams.get("minSeats")
      ? Number(searchParams.get("minSeats"))
      : undefined,
  }), [searchParams]);

  const fetchTrips = useCallback(async (params: TripSearchParams) => {
    setLoading(true);
    setError(null);
    try {
      const data = await tripsService.search(params);
      setTrips(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips(paramsFromUrl);
  }, [fetchTrips, paramsFromUrl]);

  const handleSearch = (params: TripSearchParams) => {
    const qs = new URLSearchParams();
    if (params.origin) qs.set("origin", params.origin);
    if (params.destination) qs.set("destination", params.destination);
    if (params.date) qs.set("date", params.date);
    if (params.minSeats) qs.set("minSeats", String(params.minSeats));
    router.push(`/trips?${qs.toString()}`);
  };

  return (
    <>
      <TripFilters
        defaultValues={paramsFromUrl}
        onSearch={handleSearch}
        loading={loading}
      />

      {loading ? (
        <Loader fullPage />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => fetchTrips(paramsFromUrl)}
        />
      ) : trips.length === 0 ? (
        <EmptyState
          title="No trips found"
          description="Try adjusting your filters or check back later."
          icon={
            <svg
              className="h-6 w-6"
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
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </>
  );
}

export default function TripsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">
          Available Trips
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Find and book a seat for your next trip to or from UQ.
        </p>
      </div>

      <Suspense fallback={<Loader fullPage />}>
        <TripsList />
      </Suspense>
    </div>
  );
}
