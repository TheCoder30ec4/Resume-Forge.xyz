"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

function GithubCallback() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const username = params.get("username");
    const error = params.get("github_error");

    if (error) {
      toast.error(`GitHub connection failed: ${error}`);
      router.replace("/onboarding");
      return;
    }

    if (username) {
      localStorage.setItem("github_connected", "1");
      localStorage.setItem("github_username", username);
      toast.success(`GitHub connected as @${username}`);
    }

    router.replace("/onboarding");
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-xs text-muted-foreground font-mono animate-pulse">Connecting GitHub…</p>
    </div>
  );
}

export default function GithubCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-xs text-muted-foreground font-mono animate-pulse">Connecting GitHub…</p>
        </div>
      }
    >
      <GithubCallback />
    </Suspense>
  );
}
