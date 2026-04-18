"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import type { TripResponse } from "@/types";
import { tripsService } from "@/services/trips.service";
import { reservationsService } from "@/services/reservations.service";
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

function NewReservationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("tripId");
  const t = useTranslations("newReservation");

  const schema = z.object({
    seatsReserved: z
      .number({ message: t("seatsRequired") })
      .min(1, t("atLeastOne"))
      .max(10, t("maxTen")),
  });

  type FormValues = z.infer<typeof schema>;

  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { seatsReserved: 1 },
  });

  const seats = watch("seatsReserved") || 1;

  useEffect(() => {
    if (!tripId) {
      setFetchError(t("noTrip"));
      setFetching(false);
      return;
    }
    tripsService
      .getById(tripId)
      .then(setTrip)
      .catch((err) => setFetchError(getErrorMessage(err)))
      .finally(() => setFetching(false));
  }, [tripId, t]);

  const onSubmit = async (values: FormValues) => {
    if (!tripId) return;
    setServerError(null);
    try {
      const reservation = await reservationsService.create({
        tripId,
        seatsReserved: values.seatsReserved,
      });
      router.push(`/reservations/detail?id=${reservation.id}`);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  if (fetching) return <Loader fullPage />;
  if (fetchError || !trip)
    return <ErrorState message={fetchError ?? t("tripNotFound")} />;

  if (trip.status !== "SCHEDULED" || trip.availableSeats === 0) {
    return (
      <ErrorState
        title={t("tripUnavailable")}
        message={
          trip.availableSeats === 0
            ? t("noSeatsLeft")
            : t("notAccepting")
        }
      />
    );
  }

  const total = trip.pricePerSeat * (Number.isNaN(seats) ? 1 : seats);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      {/* Trip summary card */}
      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-5 shadow-card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {t("tripSection")}
        </p>
        <div className="flex items-center gap-2 text-base font-semibold text-neutral-900">
          <span>{trip.origin}</span>
          <svg
            className="h-4 w-4 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
            />
          </svg>
          <span>{trip.destination}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-neutral-500">
          <div>
            <p className="text-xs text-neutral-400">{t("departure")}</p>
            <p className="font-medium text-neutral-700">{formatDate(trip.departureTime)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">{t("pricePerSeat")}</p>
            <p className="font-medium text-neutral-700">{formatCurrency(trip.pricePerSeat)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">{t("driver")}</p>
            <p className="font-medium text-neutral-700">
              {trip.driver.firstName} {trip.driver.lastName}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">{t("availableSeats")}</p>
            <p className="font-medium text-neutral-700">{trip.availableSeats}</p>
          </div>
        </div>
      </div>

      {/* Reservation form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="rounded-lg border border-neutral-200 bg-white p-5 shadow-card"
      >
        <Input
          label={t("numberOfSeats")}
          type="number"
          min={1}
          max={trip.availableSeats}
          error={errors.seatsReserved?.message}
          helperText={
            trip.availableSeats === 1
              ? t("maxSeats", { count: trip.availableSeats })
              : t("maxSeatsPlural", { count: trip.availableSeats })
          }
          {...register("seatsReserved", { valueAsNumber: true })}
        />

        {/* Price breakdown */}
        <div className="mt-5 rounded-md bg-neutral-50 p-4">
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <span>
              {Number.isNaN(seats) ? 1 : seats}{" "}
              {(Number.isNaN(seats) ? 1 : seats) !== 1
                ? "seats"
                : "seat"}{" "}
              × {formatCurrency(trip.pricePerSeat)}
            </span>
            <span className="text-base font-semibold text-neutral-900">
              {formatCurrency(total)}
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-400">{t("paymentNote")}</p>
        </div>

        {serverError && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {serverError}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            {t("back")}
          </Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">
            {t("confirm", { price: formatCurrency(total) })}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewReservationPage() {
  return (
    <Suspense fallback={<Loader fullPage />}>
      <NewReservationForm />
    </Suspense>
  );
}
