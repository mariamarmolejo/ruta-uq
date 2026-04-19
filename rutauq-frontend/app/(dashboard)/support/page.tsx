"use client";

import { useTranslations } from "next-intl";

export default function SupportPage() {
  const t = useTranslations("support");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-card">
          <p className="text-sm text-neutral-600">{t("emailLabel")}</p>
          <p className="mt-1 font-medium text-neutral-900">studioflowia@gmail.com</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-card">
          <p className="text-sm text-neutral-600">{t("responsibleLabel")}</p>
          <p className="mt-1 font-medium text-neutral-900">{t("responsibleName")}</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-card">
          <p className="text-sm text-neutral-600">{t("scheduleLabel")}</p>
          <p className="mt-1 font-medium text-neutral-900">{t("scheduleTime")}</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-card">
          <p className="text-sm font-semibold text-neutral-900">{t("sloTitle")}</p>
          <ul className="mt-2 space-y-1 text-sm text-neutral-700">
            <li>
              • {t("sloCase")}
            </li>
            <li>
              • {t("sloFunctional")}
            </li>
            <li>
              • {t("sloCritical")}
            </li>
          </ul>
        </div>

        <p className="text-xs text-neutral-500">{t("note")}</p>
      </div>
    </div>
  );
}

