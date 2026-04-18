"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const t = useTranslations("auth.verifyEmail");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(t("noToken"));
      return;
    }

    authService
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(getErrorMessage(err));
      });
  }, [token, t]);

  if (status === "loading") {
    return <Loader />;
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("successTitle")}</h1>
        <p className="mt-2 text-sm text-neutral-500">{t("successDesc")}</p>
        <Link href="/login" className="mt-6 block">
          <Button variant="primary" className="w-full">
            {t("goToLogin")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-neutral-900">{t("failTitle")}</h1>
      <p className="mt-2 text-sm text-neutral-500">{message}</p>
      <Link href="/login" className="mt-6 block">
        <Button variant="outline" className="w-full">
          {t("backToLogin")}
        </Button>
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Loader />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
