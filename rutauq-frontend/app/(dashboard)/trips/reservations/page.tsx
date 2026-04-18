"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReservationResponse, ReservationStatus } from "@/types";
import { reservationsService } from "@/services/reservations.service";
import { useRequireRole } from "@/hooks/useRequireRole";
import {
  formatCurrency,
  formatDate,
  getErrorMessage,
  RESERVATION_STATUS_VARIANT,
} from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";

const CANCELLABLE: ReservationStatus[] = ["PENDING_PAYMENT", "CONFIRMED"];

function TripReservations() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const roleLoading = useRequireRole(["DRIVER", "ADMIN"]);
  const router = useRouter();
  const t = useTranslations("tripReservations");
  const tStatus = useTranslations("reservationStatus");

  const [reservations, setReservations] = useState<ReservationResponse[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    if (!id) {
      setError(t("noTripId"));
      setFetching(false);
      return;
    }
    setFetching(true);
    setError(null);
    try {
      setReservations(await reservationsService.getByTrip(id));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setFetching(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (!roleLoading) fetchReservations();
  }, [roleLoading, fetchReservations]);

  const handleCancel = async (reservationId: string) => {
    if (!confirm(t("confirmCancel"))) return;
    setCancelError(null);
    setCancellingId(reservationId);
    try {
      await reservationsService.cancel(reservationId);
      setReservations((prev) =>
        prev.map((r) =>
          r.id === reservationId ? { ...r, status: "CANCELLED" as ReservationStatus } : r
        )
      );
    } catch (err) {
      setCancelError(getErrorMessage(err));
    } finally {
      setCancellingId(null);
    }
  };

  if (roleLoading || fetching) return <Loader fullPage />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          {t("back")}
        </button>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
          <p className="text-sm text-neutral-500">
            {reservations.length === 1
              ? t("count", { n: reservations.length })
              : t("countPlural", { n: reservations.length })}
          </p>
        </div>
      </div>

      {cancelError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {cancelError}
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={fetchReservations} />
      ) : reservations.length === 0 ? (
        <EmptyState
          title={t("noReservations")}
          description={t("noReservationsDesc")}
        />
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                <th className="px-5 py-3">{t("colPassenger")}</th>
                <th className="px-5 py-3">{t("colSeats")}</th>
                <th className="px-5 py-3">{t("colTotal")}</th>
                <th className="px-5 py-3">{t("colStatus")}</th>
                <th className="px-5 py-3">{t("colBooked")}</th>
                <th className="px-5 py-3 text-right">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-neutral-900">
                      {r.passenger.firstName} {r.passenger.lastName}
                    </p>
                    <p className="text-xs text-neutral-400">{r.passenger.email}</p>
                  </td>
                  <td className="px-5 py-3 text-neutral-700">{r.seatsReserved}</td>
                  <td className="px-5 py-3 font-medium text-neutral-700">
                    {formatCurrency(r.totalPrice)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={RESERVATION_STATUS_VARIANT[r.status]}>
                      {tStatus(r.status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-neutral-400">{formatDate(r.createdAt)}</td>
                  <td className="px-5 py-3 text-right">
                    {CANCELLABLE.includes(r.status) && (
                      <Button
                        variant="danger"
                        size="sm"
                        loading={cancellingId === r.id}
                        disabled={cancellingId !== null}
                        onClick={() => handleCancel(r.id)}
                      >
                        {t("cancel")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TripReservationsPage() {
  return (
    <Suspense fallback={<Loader fullPage />}>
      <TripReservations />
    </Suspense>
  );
}
