"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function SecurityPolicyPage() {
  const t = useTranslations("policies.security");

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
            {t("passwordTitle")}
          </h2>
          <ul className="space-y-2 text-sm text-neutral-700">
            {(["password1", "password2", "password3"] as const).map((key) => (
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
            {t("sessionTitle")}
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>{t("session1")}</p>
            <p>{t("session2")}</p>
            <p>{t("session3")}</p>
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("dataTitle")}
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>{t("data1")}</p>
            <p>{t("data2")}</p>
            <p>{t("data3")}</p>
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t("reportTitle")}
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>{t("report1")}</p>
            <p>
              {t("report2")}{" "}
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
