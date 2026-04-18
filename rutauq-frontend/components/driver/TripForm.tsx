"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import type { CreateTripRequest, VehicleSummary } from "@/types";
import { vehiclesService } from "@/services/vehicles.service";
import { getErrorMessage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type TripFormValues = {
  origin: string;
  destination: string;
  departureTime: string;
  availableSeats: number;
  pricePerSeat: number;
  vehicleId: string;
  description?: string;
};

interface TripFormProps {
  defaultValues?: Partial<TripFormValues>;
  onSubmit: (data: CreateTripRequest) => Promise<void>;
  submitLabel?: string;
}

// Colombia is always UTC-5 (no DST)
const COLOMBIA_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Converts a datetime-local string entered as Colombian time (YYYY-MM-DDTHH:MM)
 * to a UTC ISO 8601 string for the backend.
 */
function toIso(local: string): string {
  const [datePart, timePart] = local.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes) + COLOMBIA_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

/**
 * Converts a UTC ISO string from the backend to datetime-local format
 * displayed in Colombian time (America/Bogota).
 */
export function toDatetimeLocal(iso: string): string {
  const formatted = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return formatted.replace(" ", "T");
}

export default function TripForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: TripFormProps) {
  const t = useTranslations("tripForm");
  const tVehicle = useTranslations("vehicleForm");
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const tripSchema = z.object({
    origin: z.string().min(2, t("originRequired")),
    destination: z.string().min(2, t("destinationRequired")),
    departureTime: z.string().min(1, t("departureRequired")),
    availableSeats: z.number({ message: t("enterNumber") }).min(1).max(20),
    pricePerSeat: z
      .number({ message: t("enterNumber") })
      .min(0, t("priceNegative"))
      .refine((n) => Number.isInteger(n), t("priceDecimal")),
    vehicleId: z.string().min(1, t("vehicleRequired")),
    description: z.string().optional(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues,
  });

  useEffect(() => {
    vehiclesService
      .getAll()
      .then(setVehicles)
      .finally(() => setVehiclesLoading(false));
  }, []);

  const handleFormSubmit = async (values: TripFormValues) => {
    setServerError(null);
    try {
      await onSubmit({
        ...values,
        departureTime: toIso(values.departureTime),
      });
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t("origin")}
          placeholder={t("originPlaceholder")}
          error={errors.origin?.message}
          {...register("origin")}
        />
        <Input
          label={t("destination")}
          placeholder={t("destinationPlaceholder")}
          error={errors.destination?.message}
          {...register("destination")}
        />
      </div>

      <Input
        label={t("departureTime")}
        type="datetime-local"
        error={errors.departureTime?.message}
        {...register("departureTime")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t("availableSeats")}
          type="number"
          min={1}
          max={20}
          placeholder={t("seatsPlaceholder")}
          error={errors.availableSeats?.message}
          {...register("availableSeats", { valueAsNumber: true })}
        />
        <Input
          label={t("pricePerSeat")}
          type="number"
          min={0}
          step={1}
          placeholder={t("pricePlaceholder")}
          helperText={t("priceHelper")}
          error={errors.pricePerSeat?.message}
          {...register("pricePerSeat", { valueAsNumber: true })}
        />
      </div>

      {/* Vehicle select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700">{t("vehicleLabel")}</label>
        {vehiclesLoading ? (
          <p className="text-sm text-neutral-400">{t("loadingVehicles")}</p>
        ) : vehicles.length === 0 ? (
          <p className="text-sm text-red-500">{t("noVehicles")}</p>
        ) : (
          <select
            className="h-10 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            {...register("vehicleId")}
          >
            <option value="">{t("selectVehicle")}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model} ({v.year}) · {v.plate} · {v.seats} {tVehicle("seats")}
              </option>
            ))}
          </select>
        )}
        {errors.vehicleId && (
          <p className="text-xs text-red-600">{errors.vehicleId.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700">
          {t("notes")}{" "}
          <span className="font-normal text-neutral-400">{t("notesOptional")}</span>
        </label>
        <textarea
          rows={3}
          placeholder={t("notesPlaceholder")}
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          {...register("description")}
        />
      </div>

      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {serverError}
        </p>
      )}

      <Button type="submit" loading={isSubmitting}>
        {submitLabel ?? t("save")}
      </Button>
    </form>
  );
}
