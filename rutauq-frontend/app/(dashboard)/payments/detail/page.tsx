"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { PaymentResponse, PaymentStatus } from "@/types";
import { paymentsService } from "@/services/payments.service";
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

const statusConfig: Record<
  PaymentStatus,
  {
    variant: "success" | "warning" | "danger" | "default" | "primary";
    label: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    bg: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  APPROVED: {
    variant: "success",
    label: "Approved",
    title: "Payment approved!",
    description: "Your reservation is confirmed. See you on the trip.",
    bg: "bg-green-50 border-green-200",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  PENDING: {
    variant: "warning",
    label: "Pending",
    title: "Payment is being processed",
    description: "We will update your reservation once the payment clears. This usually takes a few minutes.",
    bg: "bg-yellow-50 border-yellow-200",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  REJECTED: {
    variant: "danger",
    label: "Rejected",
    title: "Payment was rejected",
    description: "The payment could not be processed. Please check your card details and try again.",
    bg: "bg-red-50 border-red-200",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  CANCELLED: {
    variant: "default",
    label: "Cancelled",
    title: "Payment was cancelled",
    description: "The payment was cancelled. Your seat has been released.",
    bg: "bg-neutral-50 border-neutral-200",
    iconBg: "bg-neutral-100",
    iconColor: "text-neutral-500",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
  REFUNDED: {
    variant: "primary",
    label: "Refunded",
    title: "Payment refunded",
    description: "The payment has been refunded to your original payment method.",
    bg: "bg-blue-50 border-blue-200",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    ),
  },
};

function PaymentDetail() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const router = useRouter();

  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayment = useCallback(() => {
    if (!id) {
      setError("No payment ID provided.");
      setLoading(false);
      return;
    }
    paymentsService
      .getById(id)
      .then(setPayment)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  if (loading) return <Loader fullPage />;
  if (error || !payment)
    return <ErrorState message={error ?? "Payment not found."} onRetry={() => router.back()} />;

  const config = statusConfig[payment.status];

  return (
    <div className="mx-auto max-w-lg">
      <div className={`mb-6 flex items-center gap-4 rounded-xl border p-6 ${config.bg}`}>
        <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full ${config.iconBg} ${config.iconColor}`}>
          {config.icon}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">{config.title}</h1>
          <p className="mt-1 text-sm text-neutral-600">{config.description}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Payment details</p>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <Detail label="Status"><Badge variant={config.variant}>{config.label}</Badge></Detail>
              <Detail label="Amount"><span className="font-semibold text-neutral-900">{formatCurrency(payment.amount, payment.currency)}</span></Detail>
              <Detail label="Method"><span className="font-medium text-neutral-700 capitalize">{payment.paymentMethod ?? "—"}</span></Detail>
              <Detail label="MP Payment ID"><span className="font-mono text-xs text-neutral-600">{payment.mercadoPagoPaymentId}</span></Detail>
              <Detail label="Created"><span className="text-neutral-700">{formatDate(payment.createdAt)}</span></Detail>
              <Detail label="Updated"><span className="text-neutral-700">{formatDate(payment.updatedAt)}</span></Detail>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Link href={`/reservations/detail?id=${payment.reservationId}`} className="flex-1">
            <Button variant="outline" className="w-full">View reservation</Button>
          </Link>
          {payment.status === "REJECTED" && (
            <Link href={`/payments/new?reservationId=${payment.reservationId}`} className="flex-1">
              <Button className="w-full">Try again</Button>
            </Link>
          )}
          {payment.status === "APPROVED" && (
            <Link href="/trips" className="flex-1">
              <Button className="w-full">Browse more trips</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentDetailPage() {
  return (
    <Suspense fallback={<Loader fullPage />}>
      <PaymentDetail />
    </Suspense>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
