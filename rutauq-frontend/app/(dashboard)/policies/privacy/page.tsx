"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function PrivacyPolicyPage() {
  const t = useTranslations("policies.privacy");

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
            {t("legalTitle")}
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>{t("legal1")}</p>
            <p>{t("legal2")}</p>
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("collectedTitle")}
          </h2>
          <ul className="space-y-2 text-sm text-neutral-700">
            {(["collected1", "collected2", "collected3", "collected4"] as const).map((key) => (
              <li key={key} className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 translate-y-1.5 rounded-full bg-primary-500" />
                {t(key)}
              </li>
            ))}
          </ul>
        </section>

        <div className="border-t border-neutral-100" />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("useTitle")}
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>{t("use1")}</p>
            <p>{t("use2")}</p>
            <p>{t("use3")}</p>
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("thirdPartyTitle")}
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>
              <span className="font-medium">Mercado Pago — </span>
              {t("thirdPartyMP")}
            </p>
            <p>
              <span className="font-medium">Google OAuth — </span>
              {t("thirdPartyGoogle")}
            </p>
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("rightsTitle")}
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>{t("rights1")}</p>
            <p>
              {t("rights2")}{" "}
              <a
                href="mailto:studioflowia@gmail.com"
                className="font-medium text-primary-600 hover:underline"
              >
                studioflowia@gmail.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
