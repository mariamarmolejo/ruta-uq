"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const tAuth = useTranslations("auth");
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const loginSchema = z.object({
    email: z.string().email(t("emailRequired")),
    password: z.string().min(1, t("passwordRequired")),
  });

  type LoginFormValues = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setEmailNotVerified(false);
    setResendSent(false);
    try {
      await login(values);
    } catch (err) {
      if (
        err instanceof AxiosError &&
        err.response?.data?.errorCode === "EMAIL_NOT_VERIFIED"
      ) {
        setEmailNotVerified(true);
        setServerError(err.response.data.message ?? "Email not verified.");
      } else {
        setServerError(getErrorMessage(err));
      }
    }
  };

  const handleResend = async () => {
    const email = getValues("email");
    if (!email) return;
    setResendLoading(true);
    try {
      await authService.resendVerification(email);
      setResendSent(true);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setResendLoading(false);
    }
  };

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

        <div className="flex flex-col gap-1">
          <Input
            label={t("passwordLabel")}
            type="password"
            autoComplete="current-password"
            placeholder={t("passwordPlaceholder")}
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-xs text-primary-600 hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
        </div>

        {serverError && (
          <div className="rounded-md bg-red-50 px-3 py-2">
            <p className="text-sm text-red-600">{serverError}</p>
            {emailNotVerified && !resendSent && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="mt-1 text-sm font-medium text-red-700 underline hover:text-red-800 disabled:opacity-50"
              >
                {resendLoading ? t("sending") : t("resendVerification")}
              </button>
            )}
            {resendSent && (
              <p className="mt-1 text-sm font-medium text-green-700">
                {t("verificationSent")}
              </p>
            )}
          </div>
        )}

        <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
          {t("submit")}
        </Button>
      </form>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-neutral-500">{tAuth("orContinueWith")}</span>
        </div>
      </div>
      <GoogleLoginButton />

      <p className="mt-6 text-center text-sm text-neutral-500">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="font-medium text-primary-600 hover:underline"
        >
          {t("createOne")}
        </Link>
      </p>
    </>
  );
}
