"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const t = useTranslations("auth.checkEmail");

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50">
        <svg className="h-7 w-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      </div>

      <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {t("sentTo")}{" "}
        {email ? (
          <span className="font-medium text-neutral-700">{email}</span>
        ) : (
          t("sentToFallback")
        )}
        .
      </p>
      <p className="mt-1 text-sm text-neutral-500">{t("clickLink")}</p>

      <div className="mt-6 flex flex-col gap-3">
        <Link href="/login">
          <Button variant="primary" className="w-full">
            {t("goToLogin")}
          </Button>
        </Link>
        <p className="text-xs text-neutral-400">
          {t("notReceived")}{" "}
          <Link href="/login" className="text-primary-600 hover:underline">
            {t("requestNew")}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  );
}
