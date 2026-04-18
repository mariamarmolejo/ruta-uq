"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { IntlProvider } from "@/contexts/IntlProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <LocaleProvider>
        <IntlProvider>{children}</IntlProvider>
      </LocaleProvider>
    </GoogleOAuthProvider>
  );
}
