"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CreateVehicleRequest, VehicleSummary } from "@/types";
import { getErrorMessage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const vehicleSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  year: z
    .number({ message: "Enter a year" })
    .min(1990)
    .max(new Date().getFullYear() + 1),
  color: z.string().min(1, "Color is required"),
  plate: z.string().min(3, "Plate is required"),
  seats: z.number({ message: "Enter a number" }).min(1).max(20),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehicleFormProps {
  defaultValues?: Partial<VehicleFormValues>;
  onSubmit: (data: CreateVehicleRequest) => Promise<void>;
  submitLabel?: string;
}

export default function VehicleForm({
  defaultValues,
  onSubmit,
  submitLabel = "Save vehicle",
}: VehicleFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues,
  });

  const handleFormSubmit = async (values: VehicleFormValues) => {
    setServerError(null);
    try {
      await onSubmit(values as CreateVehicleRequest);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Brand"
          placeholder="e.g. Chevrolet"
          error={errors.brand?.message}
          {...register("brand")}
        />
        <Input
          label="Model"
          placeholder="e.g. Spark"
          error={errors.model?.message}
          {...register("model")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Year"
          type="number"
          placeholder={String(new Date().getFullYear())}
          error={errors.year?.message}
          {...register("year", { valueAsNumber: true })}
        />
        <Input
          label="Color"
          placeholder="e.g. White"
          error={errors.color?.message}
          {...register("color")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Plate"
          placeholder="e.g. ABC123"
          error={errors.plate?.message}
          {...register("plate")}
        />
        <Input
          label="Seats"
          type="number"
          min={1}
          max={20}
          placeholder="4"
          error={errors.seats?.message}
          {...register("seats", { valueAsNumber: true })}
        />
      </div>

      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {serverError}
        </p>
      )}

      <Button type="submit" loading={isSubmitting} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}

/** Converts a VehicleSummary to form default values. */
export function vehicleToFormValues(
  v: VehicleSummary
): Partial<VehicleFormValues> {
  return {
    brand: v.brand,
    model: v.model,
    year: v.year,
    color: v.color,
    plate: v.plate,
    seats: v.seats,
  };
}
