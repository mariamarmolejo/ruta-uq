"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import type { UserProfile } from "@/types";
import { usersService } from "@/services/users.service";
import { useAuthStore } from "@/stores/auth.store";
import { formatDate, getErrorMessage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card, { CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

type FormValues = {
  firstName: string;
  lastName: string;
  phone?: string;
};

export default function ProfilePage() {
  const { updateUser } = useAuthStore();
  const t = useTranslations("profile");

  const schema = z.object({
    firstName: z.string().min(2, t("firstNameMin")),
    lastName: z.string().min(2, t("lastNameMin")),
    phone: z.string().optional(),
  });

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await usersService.getMe();
      setProfile(data);
      reset({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? "",
      });
    } catch (err) {
      setFetchError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleEdit = () => {
    setSaveSuccess(false);
    setServerError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone ?? "",
      });
    }
    setServerError(null);
    setEditing(false);
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const updated = await usersService.updateMe({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || undefined,
      });
      setProfile(updated);
      // Sync name into the navbar without touching the token or cookie
      updateUser({
        firstName: updated.firstName,
        lastName: updated.lastName,
      });
      setEditing(false);
      setSaveSuccess(true);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  if (loading) return <Loader fullPage />;
  if (fetchError || !profile)
    return (
      <ErrorState
        message={fetchError ?? t("notLoaded")}
        onRetry={fetchProfile}
      />
    );

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={handleEdit}>
            {t("edit")}
          </Button>
        )}
      </div>

      {saveSuccess && !editing && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {t("savedSuccess")}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {editing ? (
          <Card>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {t("editSection")}
            </p>
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("firstNameLabel")}
                  autoComplete="given-name"
                  error={errors.firstName?.message}
                  {...register("firstName")}
                />
                <Input
                  label={t("lastNameLabel")}
                  autoComplete="family-name"
                  error={errors.lastName?.message}
                  {...register("lastName")}
                />
              </div>

              <Input
                label={t("phoneLabel")}
                type="tel"
                autoComplete="tel"
                placeholder={t("phonePlaceholder")}
                error={errors.phone?.message}
                {...register("phone")}
              />

              {/* Email is read-only */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  {t("emailLabel")}
                </label>
                <p className="flex h-10 items-center rounded border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500">
                  {profile.email}
                </p>
                <p className="text-xs text-neutral-400">
                  {t("emailReadOnly")}
                </p>
              </div>

              {serverError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {serverError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  disabled={!isDirty}
                >
                  {t("saveChanges")}
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <>
            <Card>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {t("personalInfo")}
              </p>
              <CardContent>
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <Field label={t("firstName")} value={profile.firstName} />
                  <Field label={t("lastName")} value={profile.lastName} />
                  <Field label={t("email")} value={profile.email} />
                  <Field label={t("phone")} value={profile.phone || "—"} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {t("account")}
              </p>
              <CardContent>
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                    <p className="text-xs text-neutral-400">{t("role")}</p>
                    <Badge
                      variant={
                        profile.role === "DRIVER"
                          ? "secondary"
                          : profile.role === "ADMIN"
                          ? "danger"
                          : "primary"
                      }
                      className="mt-1"
                    >
                      {profile.role === "DRIVER"
                        ? t("roleDriver")
                        : profile.role === "ADMIN"
                        ? t("roleAdmin")
                        : t("rolePassenger")}
                    </Badge>
                  </div>
                  <Field
                    label={t("memberSince")}
                    value={formatDate(profile.createdAt)}
                  />
                  <Field
                    label={t("lastUpdated")}
                    value={formatDate(profile.updatedAt)}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-0.5 font-medium text-neutral-800">{value}</p>
    </div>
  );
}
