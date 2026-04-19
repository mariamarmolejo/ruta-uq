"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function CancellationPolicyPage() {
  const t = useTranslations("policies.cancellations");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-2">
        <Link href="/policies" className="text-sm text-neutral-500 hover:text-primary-600">
          ← {t("back")}
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="mt-1 text-xs text-neutral-400">{t("lastUpdated")}</p>
      </div>

      <div className="space-y-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-card">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("whoTitle")}
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>{t("who1")}</p>
            <p>{t("who2")}</p>
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("windowTitle")}
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>{t("window1")}</p>
            <p>{t("window2")}</p>
            <p>{t("window3")}</p>
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("refundTitle")}
          </h2>
          <ul className="space-y-2 text-sm text-neutral-700">
            {(["refund1", "refund2", "refund3"] as const).map((key) => (
              <li key={key} className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 translate-y-1.5 rounded-full bg-secondary-500" />
                {t(key)}
              </li>
            ))}
          </ul>
        </section>

        <div className="border-t border-neutral-100" />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("processingTitle")}
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>{t("processing1")}</p>
            <p>{t("processing2")}</p>
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("noRefundTitle")}
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>{t("noRefund1")}</p>
            <p>{t("noRefund2")}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
