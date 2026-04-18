"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import type { CreateVehicleRequest, VehicleSummary } from "@/types";
import { getErrorMessage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type VehicleFormValues = {
  brand: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  seats: number;
};

interface VehicleFormProps {
  defaultValues?: Partial<VehicleFormValues>;
  onSubmit: (data: CreateVehicleRequest) => Promise<void>;
  submitLabel?: string;
}

export default function VehicleForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: VehicleFormProps) {
  const t = useTranslations("vehicleForm");
  const [serverError, setServerError] = useState<string | null>(null);

  const vehicleSchema = z.object({
    brand: z.string().min(1, t("brandRequired")),
    model: z.string().min(1, t("modelRequired")),
    year: z
      .number({ message: t("yearRequired") })
      .min(1990)
      .max(new Date().getFullYear() + 1),
    color: z.string().min(1, t("colorRequired")),
    plate: z.string().min(3, t("plateRequired")),
    seats: z.number({ message: t("seatsRequired") }).min(1).max(20),
  });

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
          label={t("brand")}
          placeholder={t("brandPlaceholder")}
          error={errors.brand?.message}
          {...register("brand")}
        />
        <Input
          label={t("model")}
          placeholder={t("modelPlaceholder")}
          error={errors.model?.message}
          {...register("model")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t("year")}
          type="number"
          placeholder={String(new Date().getFullYear())}
          error={errors.year?.message}
          {...register("year", { valueAsNumber: true })}
        />
        <Input
          label={t("color")}
          placeholder={t("colorPlaceholder")}
          error={errors.color?.message}
          {...register("color")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t("plate")}
          placeholder={t("platePlaceholder")}
          error={errors.plate?.message}
          {...register("plate")}
        />
        <Input
          label={t("seats")}
          type="number"
          min={1}
          max={20}
          placeholder={t("seatsPlaceholder")}
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
        {submitLabel ?? t("save")}
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
