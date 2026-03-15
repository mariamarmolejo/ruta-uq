"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      setServerError("Invalid reset link. Please request a new one.");
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
        <h1 className="text-xl font-semibold text-neutral-900">Password updated!</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Your password has been reset. You can now log in.
        </p>
        <Link href="/login" className="mt-6 block">
          <Button variant="primary" className="w-full">
            Go to login
          </Button>
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-semibold text-neutral-900">Invalid link</h1>
        <p className="mt-2 text-sm text-neutral-500">
          This reset link is missing a token. Please request a new one.
        </p>
        <Link href="/forgot-password" className="mt-6 block">
          <Button variant="outline" className="w-full">
            Request new link
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Set new password</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Choose a strong password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />

        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {serverError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {serverError}
          </p>
        )}

        <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
          Reset password
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
