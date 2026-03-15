import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import type { ReservationResponse } from "@/types";
import {
  formatCurrency,
  formatDateShort,
  RESERVATION_STATUS_VARIANT,
  RESERVATION_STATUS_LABEL,
} from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

interface ReservationCardProps {
  reservation: ReservationResponse;
}

export default function ReservationCard({ reservation }: ReservationCardProps) {
  const { trip } = reservation;

  return (
    <Link href={`/reservations/detail?id=${reservation.id}`}>
      <Card hoverable padding="none">
        <div className="flex flex-col gap-3 p-5">
          {/* Route + status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-semibold text-neutral-900">
                {trip.origin}
              </span>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-neutral-400" />
              <span className="truncate font-semibold text-neutral-900">
                {trip.destination}
              </span>
            </div>
            <Badge variant={RESERVATION_STATUS_VARIANT[reservation.status]}>
              {RESERVATION_STATUS_LABEL[reservation.status]}
            </Badge>
          </div>

          {/* Details */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-neutral-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-neutral-400" />
              {formatDateShort(trip.departureTime)}
            </span>
            <span>
              {reservation.seatsReserved} seat
              {reservation.seatsReserved !== 1 ? "s" : ""}
            </span>
            <span className="font-medium text-neutral-700">
              {formatCurrency(reservation.totalPrice)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
