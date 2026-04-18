"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage, cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const tAuth = useTranslations("auth");
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const registerSchema = z.object({
    firstName: z.string().min(2, t("firstNameMin")),
    lastName: z.string().min(2, t("lastNameMin")),
    email: z.string().email(t("emailInvalid")),
    password: z.string().min(6, t("passwordMin")),
    phone: z.string().optional(),
    role: z.enum(["CLIENT", "DRIVER"] as const, { message: t("roleRequired") }),
    privacyAccepted: z.boolean().refine((val) => val === true, {
      message: t("privacyRequired"),
    }),
  });

  type RegisterFormValues = z.infer<typeof registerSchema>;

  const roles = [
    {
      value: "CLIENT" as const,
      label: t("rolePassenger"),
      description: t("rolePassengerDesc"),
    },
    {
      value: "DRIVER" as const,
      label: t("roleDriver"),
      description: t("roleDriverDesc"),
    },
  ];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "CLIENT" },
  });

  const selectedRole = watch("role");

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerUser(values);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {/* Role selector */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-700">{t("iAmA")}</span>
          <div className="grid grid-cols-2 gap-2">
            {roles.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setValue("role", r.value, { shouldValidate: true })}
                className={cn(
                  "flex flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors",
                  selectedRole === r.value
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-neutral-200 hover:border-neutral-300"
                )}
              >
                <span className="text-sm font-medium">{r.label}</span>
                <span className="text-xs text-neutral-500">{r.description}</span>
              </button>
            ))}
          </div>
          {errors.role && (
            <p className="text-xs text-red-600">{errors.role.message}</p>
          )}
        </div>

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t("firstNameLabel")}
            autoComplete="given-name"
            placeholder={t("firstNamePlaceholder")}
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <Input
            label={t("lastNameLabel")}
            autoComplete="family-name"
            placeholder={t("lastNamePlaceholder")}
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

        <Input
          label={t("emailLabel")}
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label={t("passwordLabel")}
          type="password"
          autoComplete="new-password"
          placeholder={t("passwordPlaceholder")}
          helperText={t("passwordHelper")}
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          label={t("phoneLabel")}
          type="tel"
          autoComplete="tel"
          placeholder={t("phonePlaceholder")}
          error={errors.phone?.message}
          {...register("phone")}
        />

        {/* Habeas data — Ley 1581 de 2012 */}
        <div className="flex flex-col gap-1">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              {...register("privacyAccepted")}
            />
            <span className="text-sm text-neutral-600">
              {t("privacyText")}{" "}
              <span className="font-medium text-neutral-800">
                {t("privacyPolicy")}
              </span>{" "}
              {t("privacyIn")}{" "}
              <span className="font-medium text-neutral-800">
                {t("privacyLaw")}
              </span>{" "}
              {t("privacyDetail")}
            </span>
          </label>
          {errors.privacyAccepted && (
            <p className="text-xs text-red-600">{errors.privacyAccepted.message}</p>
          )}
        </div>

        {serverError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {serverError}
          </p>
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
        {t("haveAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-primary-600 hover:underline"
        >
          {t("signIn")}
        </Link>
      </p>
    </>
  );
}
