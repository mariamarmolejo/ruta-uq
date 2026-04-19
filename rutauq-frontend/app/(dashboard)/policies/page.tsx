"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

const POLICY_LINKS = [
  {
    href: "/policies/security",
    titleKey: "index.securityTitle" as const,
    descKey: "index.securityDesc" as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    href: "/policies/privacy",
    titleKey: "index.privacyTitle" as const,
    descKey: "index.privacyDesc" as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
  },
  {
    href: "/policies/cancellations",
    titleKey: "index.cancellationsTitle" as const,
    descKey: "index.cancellationsDesc" as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    ),
  },
  {
    href: "/policies/recovery",
    titleKey: "index.recoveryTitle" as const,
    descKey: "index.recoveryDesc" as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
  },
];

export default function PoliciesPage() {
  const t = useTranslations("policies");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-neutral-900">{t("pageTitle")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("pageSubtitle")}</p>
        <p className="mt-1 text-xs text-neutral-400">{t("lastUpdated")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {POLICY_LINKS.map((policy) => (
          <Link
            key={policy.href}
            href={policy.href}
            className="group flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <span className="mt-0.5 flex-shrink-0 text-primary-600">{policy.icon}</span>
            <div>
              <p className="font-medium text-neutral-900 group-hover:text-primary-700">
                {t(policy.titleKey)}
              </p>
              <p className="mt-1 text-sm text-neutral-500">{t(policy.descKey)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
