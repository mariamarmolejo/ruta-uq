"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage, cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  role: z.enum(["CLIENT", "DRIVER"] as const, {
    message: "Select a role",
  }),
  privacyAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the privacy policy to continue",
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const roles = [
  {
    value: "CLIENT" as const,
    label: "Passenger",
    description: "Search and book seats on available trips",
  },
  {
    value: "DRIVER" as const,
    label: "Driver",
    description: "Publish trips and offer seats to passengers",
  },
];

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

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
        <h1 className="text-xl font-semibold text-neutral-900">Create account</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Join Ruta Compartida UQ
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {/* Role selector */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-700">I am a</span>
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
            label="First name"
            autoComplete="given-name"
            placeholder="Maria"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <Input
            label="Last name"
            autoComplete="family-name"
            placeholder="Gomez"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          helperText="At least 6 characters"
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          placeholder="+57 300 000 0000"
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
              I have read and accept the{" "}
              <span className="font-medium text-neutral-800">
                personal data processing policy
              </span>{" "}
              in accordance with{" "}
              <span className="font-medium text-neutral-800">
                Ley 1581 de 2012
              </span>{" "}
              (Colombia&apos;s Habeas Data law). My data will be used solely to
              manage carpooling services at Universidad de Quindío.
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
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary-600 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
