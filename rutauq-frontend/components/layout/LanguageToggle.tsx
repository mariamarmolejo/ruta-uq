"use client";

import { useTranslations } from "next-intl";
import { useLocale, type Locale } from "@/contexts/LocaleContext";

export default function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const t = useTranslations("lang");

  const next: Locale = locale === "es" ? "en" : "es";

  return (
    <button
      onClick={() => setLocale(next)}
      className="rounded px-2.5 py-1 text-xs font-semibold tracking-wide text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
      title={t("toggle")}
    >
      <span className="text-neutral-300">{t("current")}</span>
      <span className="mx-1 text-neutral-200">|</span>
      <span>{t("toggle")}</span>
    </button>
  );
}
