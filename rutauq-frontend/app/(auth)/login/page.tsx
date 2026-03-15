"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

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
        <h1 className="text-xl font-semibold text-neutral-900">Welcome back</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sign in to your account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="flex flex-col gap-1">
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-xs text-primary-600 hover:underline"
            >
              Forgot password?
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
                {resendLoading ? "Sending…" : "Resend verification email"}
              </button>
            )}
            {resendSent && (
              <p className="mt-1 text-sm font-medium text-green-700">
                Verification email sent — check your inbox.
              </p>
            )}
          </div>
        )}

        <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary-600 hover:underline"
        >
          Create one
        </Link>
      </p>
    </>
  );
}
