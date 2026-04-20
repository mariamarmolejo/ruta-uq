"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { reservationsService } from "@/services/reservations.service";
import type { ReservationStatus } from "@/types";
import { getErrorMessage } from "@/lib/utils";
import Loader from "@/components/ui/Loader";
import Button from "@/components/ui/Button";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // ~60 seconds

type ResultState = "pending" | "confirmed" | "failed" | "timeout" | "error";

function CheckoutResultInner() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId");
  // MP appends ?status=success|failure|pending to back_urls
  const mpStatus = searchParams.get("status");
  const t = useTranslations("pseResult");

  const [result, setResult] = useState<ResultState>(
    mpStatus === "failure" ? "failed" : "pending"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollCount = useRef(0);

  useEffect(() => {
    // If MP already told us it failed, no need to poll
    if (mpStatus === "failure" || !reservationId) {
      if (!reservationId) {
        setResult("error");
        setErrorMsg(t("noReservationId"));
      }
      return;
    }

    const poll = async () => {
      try {
        const reservation = await reservationsService.getById(reservationId);
        const status: ReservationStatus = reservation.status;

        if (status === "CONFIRMED" || status === "COMPLETED") {
          setResult("confirmed");
          return;
        }
        if (status === "PAYMENT_FAILED" || status === "CANCELLED") {
          setResult("failed");
          return;
        }

        pollCount.current += 1;
        if (pollCount.current >= MAX_POLLS) {
          setResult("timeout");
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        setResult("error");
        setErrorMsg(getErrorMessage(err));
      }
    };

    const timer = setTimeout(poll, 1500);
    return () => clearTimeout(timer);
  }, [reservationId, mpStatus, t]);

  if (result === "pending") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <Loader size="md" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("pendingTitle")}</h1>
          <p className="mt-2 text-sm text-neutral-500">{t("pendingDesc")}</p>
        </div>
        <p className="text-xs text-neutral-400">{t("doNotClose")}</p>
      </div>
    );
  }

  if (result === "confirmed") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("confirmedTitle")}</h1>
          <p className="mt-2 text-sm text-neutral-500">{t("confirmedDesc")}</p>
        </div>
        <div className="flex gap-3">
          {reservationId && (
            <Link href={`/reservations/detail?id=${reservationId}`}>
              <Button variant="outline">{t("myReservations")}</Button>
            </Link>
          )}
          <Link href="/trips">
            <Button>{t("browseTrips")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (result === "failed") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("failedTitle")}</h1>
          <p className="mt-2 text-sm text-neutral-500">{t("failedDesc")}</p>
        </div>
        <div className="flex gap-3">
          {reservationId && (
            <Link href={`/payments/new?reservationId=${reservationId}`}>
              <Button variant="outline">{t("tryAgain")}</Button>
            </Link>
          )}
          <Link href="/trips">
            <Button>{t("browseTrips")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (result === "timeout") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("timeoutTitle")}</h1>
          <p className="mt-2 text-sm text-neutral-500">{t("timeoutDesc")}</p>
        </div>
        <Link href="/reservations">
          <Button>{t("checkReservations")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("errorTitle")}</h1>
        <p className="mt-2 text-sm text-neutral-500">{errorMsg ?? t("errorFallback")}</p>
      </div>
      <Link href="/reservations">
        <Button>{t("checkReservations")}</Button>
      </Link>
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense fallback={<Loader fullPage />}>
      <CheckoutResultInner />
    </Suspense>
  );
}
