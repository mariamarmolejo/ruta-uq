"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CreateTripRequest, VehicleSummary } from "@/types";
import { vehiclesService } from "@/services/vehicles.service";
import { getErrorMessage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const tripSchema = z.object({
  origin: z.string().min(2, "Origin is required"),
  destination: z.string().min(2, "Destination is required"),
  departureTime: z.string().min(1, "Departure time is required"),
  availableSeats: z.number({ message: "Enter a number" }).min(1).max(20),
  pricePerSeat: z.number({ message: "Enter a number" }).min(0),
  vehicleId: z.string().min(1, "Select a vehicle"),
  description: z.string().optional(),
});

type TripFormValues = z.infer<typeof tripSchema>;

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
  // Treat the entered value as America/Bogota (UTC-5) → add 5h to get UTC
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes) + COLOMBIA_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

/**
 * Converts a UTC ISO string from the backend to datetime-local format
 * displayed in Colombian time (America/Bogota).
 */
export function toDatetimeLocal(iso: string): string {
  // sv-SE locale produces an ISO-like "YYYY-MM-DD HH:MM" string
  const formatted = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  // Replace the space separator with T to match datetime-local input format
  return formatted.replace(" ", "T");
}

export default function TripForm({
  defaultValues,
  onSubmit,
  submitLabel = "Save trip",
}: TripFormProps) {
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

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
          label="Origin"
          placeholder="e.g. Armenia Centro"
          error={errors.origin?.message}
          {...register("origin")}
        />
        <Input
          label="Destination"
          placeholder="e.g. Universidad UQ"
          error={errors.destination?.message}
          {...register("destination")}
        />
      </div>

      <Input
        label="Departure date & time"
        type="datetime-local"
        error={errors.departureTime?.message}
        {...register("departureTime")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Available seats"
          type="number"
          min={1}
          max={20}
          placeholder="1"
          error={errors.availableSeats?.message}
          {...register("availableSeats", { valueAsNumber: true })}
        />
        <Input
          label="Price per seat (COP)"
          type="number"
          min={0}
          step={100}
          placeholder="5000"
          error={errors.pricePerSeat?.message}
          {...register("pricePerSeat", { valueAsNumber: true })}
        />
      </div>

      {/* Vehicle select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700">Vehicle</label>
        {vehiclesLoading ? (
          <p className="text-sm text-neutral-400">Loading vehicles…</p>
        ) : vehicles.length === 0 ? (
          <p className="text-sm text-red-500">
            You have no vehicles registered. Add one from the Vehicles page first.
          </p>
        ) : (
          <select
            className="h-10 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            {...register("vehicleId")}
          >
            <option value="">Select a vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model} ({v.year}) · {v.plate} · {v.seats} seats
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
          Notes{" "}
          <span className="font-normal text-neutral-400">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Meeting point, luggage notes, etc."
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
        {submitLabel}
      </Button>
    </form>
  );
}
