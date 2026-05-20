"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getMe } from "@/lib/api";
import { toast } from "sonner";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { setTokens } = useAuth();

  useEffect(() => {
    async function handle() {
      const access = params.get("access_token");
      const refresh = params.get("refresh_token");
      const error = params.get("error");

      if (error) {
        toast.error(`Google login failed: ${error}`);
        router.replace("/signin");
        return;
      }

      if (access && refresh) {
        const dest = await setTokens(access, refresh);
        toast.success("Signed in with Google!");
        // New user (incomplete profile) → collect details first.
        try {
          const me = await getMe();
          const p = me.profile;
          if (!p?.full_name || !p?.location || !p?.phone) {
            router.replace("/profile-setup");
            return;
          }
        } catch {
          // ignore — fall through to default destination
        }
        router.replace(`/${dest}`);
      } else {
        toast.error("Invalid callback. Please try again.");
        router.replace("/signin");
      }
    }
    handle();
  }, [params, router, setTokens]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-xs text-muted-foreground font-mono animate-pulse">Signing you in…</p>
    </div>
  );
}
