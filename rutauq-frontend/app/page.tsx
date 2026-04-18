"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import Navbar from "@/components/layout/Navbar";
import Button from "@/components/ui/Button";

export default function Home() {
  const t = useTranslations("home");
  const tBrand = useTranslations();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600">
            <svg
              className="h-9 w-9 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900">
            {tBrand("brand")}
          </h1>
          <p className="max-w-md text-neutral-500">{t("tagline")}</p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/register">
            <Button size="lg">{t("getStarted")}</Button>
          </Link>
          <Link href="/trips">
            <Button variant="outline" size="lg">
              {t("browseTrips")}
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
