"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { tripsService } from "@/services/trips.service";
import { useRequireRole } from "@/hooks/useRequireRole";
import TripForm from "@/components/driver/TripForm";
import Loader from "@/components/ui/Loader";

export default function NewTripPage() {
  const loading = useRequireRole(["DRIVER", "ADMIN"]);
  const router = useRouter();
  const t = useTranslations("newTrip");

  if (loading) return <Loader fullPage />;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-card">
        <TripForm
          onSubmit={async (data) => {
            await tripsService.create(data);
            router.push("/driver/trips");
          }}
          submitLabel={t("publish")}
        />
      </div>
    </div>
  );
}
