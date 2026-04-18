"use client";

import { NextIntlClientProvider } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { useLocale } from "./LocaleContext";
import esMessages from "@/messages/es.json";
import enMessages from "@/messages/en.json";

const messages = { es: esMessages, en: enMessages };

export function IntlProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();

  // Keep the html lang attribute in sync
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}
