"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { TripResponse } from "@/types";
import { tripsService } from "@/services/trips.service";
import { useRequireRole } from "@/hooks/useRequireRole";
import { getErrorMessage } from "@/lib/utils";
import { toDatetimeLocal } from "@/components/driver/TripForm";
import TripForm from "@/components/driver/TripForm";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

function EditTrip() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const roleLoading = useRequireRole(["DRIVER", "ADMIN"]);
  const router = useRouter();
  const t = useTranslations("editTrip");

  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roleLoading) return;
    if (!id) {
      setError("No trip ID provided.");
      setFetching(false);
      return;
    }
    tripsService
      .getById(id)
      .then(setTrip)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setFetching(false));
  }, [id, roleLoading]);

  if (roleLoading || fetching) return <Loader fullPage />;
  if (error || !trip) return <ErrorState message={error ?? "Trip not found."} />;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {trip.origin} → {trip.destination}
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-card">
        <TripForm
          defaultValues={{
            origin: trip.origin,
            destination: trip.destination,
            departureTime: toDatetimeLocal(trip.departureTime),
            availableSeats: trip.availableSeats,
            pricePerSeat: trip.pricePerSeat,
            vehicleId: trip.vehicle.id,
            description: trip.description,
          }}
          onSubmit={async (data) => {
            await tripsService.update(id, data);
            router.push("/driver/trips");
          }}
          submitLabel={t("saveChanges")}
        />
      </div>
    </div>
  );
}

export default function EditTripPage() {
  return (
    <Suspense fallback={<Loader fullPage />}>
      <EditTrip />
    </Suspense>
  );
}
