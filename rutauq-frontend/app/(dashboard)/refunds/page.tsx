"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { RefundResponse } from "@/types";
import { refundsService } from "@/services/refunds.service";
import { REFUND_STATUS_VARIANT, formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Loader from "@/components/ui/Loader";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";

export default function RefundsPage() {
  const t = useTranslations("refunds");
  const tStatus = useTranslations("refundStatus");

  const [refunds, setRefunds] = useState<RefundResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRefunds = async () => {
    setLoading(true);
    setError(null);
    try {
      setRefunds(await refundsService.getMy());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  if (loading) return <Loader fullPage />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchRefunds} />
      ) : refunds.length === 0 ? (
        <EmptyState
          title={t("noRefunds")}
          description={t("noRefundsDesc")}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                <th className="px-5 py-3">{t("colReservation")}</th>
                <th className="px-5 py-3">{t("colAmount")}</th>
                <th className="px-5 py-3">{t("colStatus")}</th>
                <th className="px-5 py-3">{t("colRequested")}</th>
                <th className="px-5 py-3">{t("colProcessed")}</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((refund) => (
                <tr key={refund.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/reservations/detail?id=${refund.reservationId}`}
                      className="font-mono text-xs text-primary-600 hover:underline"
                    >
                      {refund.reservationId.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-medium text-neutral-900">
                    {formatCurrency(refund.amount)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={REFUND_STATUS_VARIANT[refund.status]}>
                      {tStatus(refund.status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-neutral-500">{formatDate(refund.requestedAt)}</td>
                  <td className="px-5 py-3 text-neutral-500">
                    {refund.processedAt ? formatDate(refund.processedAt) : "—"}
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
