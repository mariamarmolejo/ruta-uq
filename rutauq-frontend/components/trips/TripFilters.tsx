"use client";

import { useForm } from "react-hook-form";
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
          label="Origin"
          placeholder="e.g. Armenia"
          {...register("origin")}
        />
        <Input
          label="Destination"
          placeholder="e.g. Universidad UQ"
          {...register("destination")}
        />
        <Input
          label="Date"
          type="date"
          {...register("date")}
        />
        <Input
          label="Min. seats"
          type="number"
          min={1}
          placeholder="1"
          {...register("minSeats", { valueAsNumber: true })}
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" loading={loading} size="sm">
          Search
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
        >
          Clear
        </Button>
      </div>
    </form>
  );
}
