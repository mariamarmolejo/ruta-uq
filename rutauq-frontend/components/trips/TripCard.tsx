import Link from "next/link";
import { ArrowRight, Calendar, Users } from "lucide-react";
import type { TripResponse } from "@/types";
import {
  formatCurrency,
  formatDateShort,
  TRIP_STATUS_VARIANT,
  TRIP_STATUS_LABEL,
} from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

interface TripCardProps {
  trip: TripResponse;
}

export default function TripCard({ trip }: TripCardProps) {
  return (
    <Link href={`/trips/detail?id=${trip.id}`}>
      <Card hoverable padding="none">
        <div className="flex flex-col gap-4 p-5">
          {/* Route header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="truncate text-base font-semibold text-neutral-900">
                {trip.origin}
              </span>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-neutral-400" />
              <span className="truncate text-base font-semibold text-neutral-900">
                {trip.destination}
              </span>
            </div>
            <Badge variant={TRIP_STATUS_VARIANT[trip.status]}>
              {TRIP_STATUS_LABEL[trip.status]}
            </Badge>
          </div>

          {/* Details row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-neutral-400" />
              {formatDateShort(trip.departureTime)}
            </span>

            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-neutral-400" />
              {trip.availableSeats} seat{trip.availableSeats !== 1 ? "s" : ""}
            </span>

            <span className="flex items-center gap-1.5 font-medium text-neutral-700">
              {formatCurrency(trip.pricePerSeat)}
              <span className="font-normal text-neutral-400">/ seat</span>
            </span>
          </div>

          {/* Driver & vehicle */}
          <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
            <span className="text-sm text-neutral-500">
              {trip.driver.firstName} {trip.driver.lastName}
            </span>
            <span className="text-xs text-neutral-400">
              {trip.vehicle.brand} {trip.vehicle.model} · {trip.vehicle.plate}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
