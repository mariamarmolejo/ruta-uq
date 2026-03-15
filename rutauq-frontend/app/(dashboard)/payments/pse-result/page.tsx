"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { reservationsService } from "@/services/reservations.service";
import type { ReservationStatus } from "@/types";
import { getErrorMessage } from "@/lib/utils";
import Loader from "@/components/ui/Loader";
import Button from "@/components/ui/Button";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // ~60 seconds

type ResultState = "pending" | "confirmed" | "failed" | "timeout" | "error";

function PseResultInner() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId");
  const router = useRouter();

  const [result, setResult] = useState<ResultState>("pending");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollCount = useRef(0);

  useEffect(() => {
    if (!reservationId) {
      setResult("error");
      setErrorMsg("No reservation ID found in the URL.");
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

        // Still PENDING_PAYMENT — keep polling
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

    // Start polling after a short initial delay to let the webhook arrive
    const timer = setTimeout(poll, 1500);
    return () => clearTimeout(timer);
  }, [reservationId]);

  // ---- Pending ----
  if (result === "pending") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <Loader size="md" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Verifying payment…</h1>
          <p className="mt-2 text-sm text-neutral-500">
            We&apos;re waiting for your bank to confirm the transaction.
            This usually takes a few seconds.
          </p>
        </div>
        <p className="text-xs text-neutral-400">Do not close this page.</p>
      </div>
    );
  }

  // ---- Confirmed ----
  if (result === "confirmed") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Payment confirmed!</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Your reservation is confirmed. See you on the road!
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/reservations">
            <Button variant="outline">My reservations</Button>
          </Link>
          <Link href="/trips">
            <Button>Browse trips</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ---- Failed ----
  if (result === "failed") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Payment failed</h1>
          <p className="mt-2 text-sm text-neutral-500">
            The bank declined or cancelled the transaction.
            Your seat has been released.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>Try again</Button>
          <Link href="/trips">
            <Button>Browse trips</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ---- Timeout ----
  if (result === "timeout") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Payment is being processed</h1>
          <p className="mt-2 text-sm text-neutral-500">
            We couldn&apos;t confirm the status yet. PSE payments can take a few minutes.
            Check your reservations shortly — it will update automatically.
          </p>
        </div>
        <Link href="/reservations">
          <Button>Check my reservations</Button>
        </Link>
      </div>
    );
  }

  // ---- Error ----
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-neutral-500">{errorMsg ?? "Could not check payment status."}</p>
      </div>
      <Link href="/reservations">
        <Button>Check my reservations</Button>
      </Link>
    </div>
  );
}

export default function PseResultPage() {
  return (
    <Suspense fallback={<Loader fullPage />}>
      <PseResultInner />
    </Suspense>
  );
}
