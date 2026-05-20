"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { startResume, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const themes = ["sb2nov", "classic", "modern", "compact"];

export default function NewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [jd, setJd] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("onboarding_jd") ?? "" : "";
    if (saved) localStorage.removeItem("onboarding_jd");
    return saved;
  });
  const [theme, setTheme] = useState("sb2nov");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Selected GitHub repos stored during onboarding in localStorage
  const selectedRepos: string[] = JSON.parse(typeof window !== "undefined" ? localStorage.getItem("selected_repos") ?? "[]" : "[]");

  async function handleGenerate() {
    if (!jd.trim()) return;
    if (selectedRepos.length < 2) {
      const msg = "Connect at least 2 GitHub repos in Settings first.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const session = await startResume({
        jd_text: jd,
        selected_github_repos: selectedRepos,
        theme,
      });
      toast.success("Resume generation started!");
      router.push(`/running?session=${session.session_id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to start. Try again.";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
          {/* Left: Inputs */}
          <div className="flex flex-col gap-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">step 1 of 1</p>
              <h1 className="text-2xl font-bold tracking-tighter">New résumé</h1>
            </div>

            {error && (
              <div className="border border-red-500/40 bg-red-500/5 rounded p-3">
                <p className="text-xs text-red-500">{error}</p>
              </div>
            )}

            {/* JD Input */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-widest">1. Job description</Label>
              <Textarea
                placeholder="paste a job description..."
                className="font-mono text-sm resize-none min-h-[200px] border-border focus:border-accent"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
            </div>

            {/* Theme */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-widest">2. Theme</Label>
              <div className="flex flex-wrap gap-2">
                {themes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`text-xs px-3 py-1.5 border font-mono rounded transition-colors duration-150 cursor-pointer ${
                      theme === t ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Evidence + Generate */}
          <div className="flex flex-col gap-6">
            <div className="border border-border rounded p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-widest ${selectedRepos.length >= 2 ? "text-accent" : "text-muted-foreground"}`}>
                  {selectedRepos.length >= 2 ? "● EVIDENCE READY" : "○ EVIDENCE PENDING"}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono">GH · {selectedRepos.length} repos</span>
                  <Badge variant="outline" className="text-[10px]">{selectedRepos.length >= 2 ? "connected" : "not set"}</Badge>
                </div>
              </div>
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left mt-1"
                onClick={() => router.push("/settings")}
              >
                edit allowlist →
              </button>
            </div>

            <div className="flex flex-col gap-3 sticky top-24">
              <Button
                onClick={handleGenerate}
                disabled={!jd.trim() || loading}
                className="h-12 font-bold text-sm transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-0"
                style={{ backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" }}
              >
                {loading ? "starting…" : "Generate résumé →"}
              </Button>
              {!jd.trim() && (
                <p className="text-xs text-muted-foreground text-center">paste a job description to continue</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
