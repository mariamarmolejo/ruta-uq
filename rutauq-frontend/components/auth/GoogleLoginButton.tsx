"use client";

import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { getErrorMessage } from "@/lib/utils";

export function GoogleLoginButton() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;
    setError(null);
    setLoading(true);
    try {
      const authResponse = await authService.googleLogin(credentialResponse.credential);
      setAuth(authResponse);
      router.push(authResponse.role === "DRIVER" ? "/driver/trips" : "/trips");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className={loading ? "opacity-50 pointer-events-none" : ""}>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() =>
            setError("No se pudo iniciar sesión con Google. Intenta de nuevo.")
          }
          width="100%"
          text="continue_with"
          shape="rectangular"
          logo_alignment="center"
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
