"use client";

import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import type { TripSearchParams } from "@/services/trips.service";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface TripFiltersProps {
  defaultValues?: TripSearchParams;
  onSearch: (params: TripSearchParams) => void;
  loading?: boolean;
}

export default function TripFilters({
  defaultValues,
  onSearch,
  loading,
}: TripFiltersProps) {
  const t = useTranslations("trips.filters");
  const { register, handleSubmit, reset } = useForm<TripSearchParams>({
    defaultValues,
  });

  const handleClear = () => {
    reset({});
    onSearch({});
  };

  return (
    <form
      onSubmit={handleSubmit(onSearch)}
      className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label={t("origin")}
          placeholder={t("originPlaceholder")}
          {...register("origin")}
        />
        <Input
          label={t("destination")}
          placeholder={t("destinationPlaceholder")}
          {...register("destination")}
        />
        <Input
          label={t("date")}
          type="date"
          {...register("date")}
        />
        <Input
          label={t("minSeats")}
          type="number"
          min={1}
          placeholder="1"
          {...register("minSeats", { valueAsNumber: true })}
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" loading={loading} size="sm">
          {t("search")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
        >
          {t("clear")}
        </Button>
      </div>
    </form>
  );
}
