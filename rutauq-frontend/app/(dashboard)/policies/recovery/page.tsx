"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function AccountRecoveryPage() {
  const t = useTranslations("policies.recovery");

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
            {t("resetTitle")}
          </h2>
          <ol className="space-y-2 text-sm text-neutral-700">
            {(["reset1", "reset2", "reset3", "reset4"] as const).map((key, i) => (
              <li key={key} className="flex items-start gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                  {i + 1}
                </span>
                {t(key)}
              </li>
            ))}
          </ol>
        </section>

        <div className="border-t border-neutral-100" />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("lockedTitle")}
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>{t("locked1")}</p>
            <p>{t("locked2")}</p>
            <p>
              {t("locked3")}{" "}
              <a
                href="mailto:studioflowia@gmail.com"
                className="font-medium text-primary-600 hover:underline"
              >
                studioflowia@gmail.com
              </a>
            </p>
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("googleTitle")}
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>{t("google1")}</p>
            <p>{t("google2")}</p>
            <p>
              {t("google3")}{" "}
              <a
                href="mailto:studioflowia@gmail.com"
                className="font-medium text-primary-600 hover:underline"
              >
                studioflowia@gmail.com
              </a>
            </p>
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("verificationTitle")}
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>{t("verification1")}</p>
            <p>{t("verification2")}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
