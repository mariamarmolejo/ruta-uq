"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const t = useTranslations("auth.resetPassword");
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = z
    .object({
      newPassword: z.string().min(8, t("passwordMin")),
      confirmPassword: z.string().min(1, t("confirmRequired")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("passwordMismatch"),
      path: ["confirmPassword"],
    });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      setServerError(t("invalidLinkError"));
      return;
    }
    setServerError(null);
    try {
      await authService.resetPassword(token, values.newPassword);
      setSuccess(true);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  if (success) {
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

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-semibold text-neutral-900">{t("invalidLinkTitle")}</h1>
        <p className="mt-2 text-sm text-neutral-500">{t("invalidLinkDesc")}</p>
        <Link href="/forgot-password" className="mt-6 block">
          <Button variant="outline" className="w-full">
            {t("requestNewLink")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input
          label={t("newPasswordLabel")}
          type="password"
          autoComplete="new-password"
          placeholder={t("placeholder")}
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />

        <Input
          label={t("confirmPasswordLabel")}
          type="password"
          autoComplete="new-password"
          placeholder={t("placeholder")}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {serverError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {serverError}
          </p>
        )}

        <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
          {t("submit")}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loader />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
