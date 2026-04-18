"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = z.object({
    email: z.string().email(t("emailInvalid")),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await authService.forgotPassword(values.email);
      setSent(true);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50">
          <svg className="h-7 w-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("sentTitle")}</h1>
        <p className="mt-2 text-sm text-neutral-500">{t("sentDesc")}</p>
        <Link href="/login" className="mt-6 block">
          <Button variant="outline" className="w-full">
            {t("backToLogin")}
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
          label={t("emailLabel")}
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          error={errors.email?.message}
          {...register("email")}
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

      <p className="mt-6 text-center text-sm text-neutral-500">
        <Link href="/login" className="font-medium text-primary-600 hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </>
  );
}
