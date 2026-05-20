"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/navbar";
import { getSession, ResumeSession } from "@/lib/api";
import { toast } from "sonner";

const STAGES = [
  { id: "jd",      label: "Parsing job description",   detail: "extracting requirements" },
  { id: "gap",     label: "Gap analysis",               detail: "comparing JD requirements against your evidence" },
  { id: "draft",   label: "Drafting résumé",            detail: "tailoring bullets to JD keywords" },
  { id: "ats",     label: "ATS scoring",                detail: "checking keyword coverage" },
  { id: "format",  label: "Formatting PDF",             detail: "applying theme" },
];

export default function RunningPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session");

  const [session, setSession] = useState<ResumeSession | null>(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll backend for session status
  useEffect(() => {
    if (!sessionId) { router.push("/dashboard"); return; }

    let cancelled = false;
    async function poll() {
      while (!cancelled) {
        try {
          const s = await getSession(sessionId!);
          if (cancelled) break;
          setSession(s);

          if (s.status === "done") {
            setCurrentStage(STAGES.length);
            setDone(true);
            toast.success("Resume generated!");
            setTimeout(() => router.push(`/shipped?session=${sessionId}`), 1200);
            return;
          }
          if (s.status === "error") {
            const msg = s.error_message ?? "Workflow failed.";
            setError(msg);
            toast.error(msg);
            return;
          }
        } catch {
          // transient network error — keep polling
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    poll();
    return () => { cancelled = true; };
  }, [sessionId, router]);

  // Animate stages forward (cosmetic — actual state comes from poll)
  useEffect(() => {
    if (done || error) return;
    if (currentStage >= STAGES.length) return;
    const delay = currentStage === 1 ? 4000 : 3500;
    const t = setTimeout(() => setCurrentStage((s) => Math.min(s + 1, STAGES.length - 1)), delay);
    return () => clearTimeout(t);
  }, [currentStage, done, error]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-start px-6 py-12">
        <div className="w-full max-w-3xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent pulse-dot inline-block" />
              <span className="text-sm font-mono">
                {error ? "✕ error" : done ? "● done" : `● running · ${formatTime(elapsed)}`}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{sessionId}</span>
          </div>

          {error && (
            <div className="border border-red-500/40 bg-red-500/5 rounded p-4 mb-6">
              <p className="text-sm text-red-500">{error}</p>
              <button onClick={() => router.push("/new")} className="text-xs text-muted-foreground hover:text-foreground mt-2 cursor-pointer">
                ← try again
              </button>
            </div>
          )}

          <div className="flex flex-col gap-4 mb-10">
            {STAGES.map((stage, i) => {
              const isActive = i === currentStage && !done;
              const isDone = i < currentStage || done;
              return (
                <div
                  key={stage.id}
                  className={`flex items-start gap-4 transition-opacity duration-300 ${i > currentStage && !done ? "opacity-20" : "opacity-100"}`}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-300 ${
                    isDone ? "bg-foreground border-foreground" : isActive ? "border-accent bg-accent/10" : "border-border"
                  }`}>
                    {isDone && (
                      <svg viewBox="0 0 12 12" className="w-3 h-3 text-background" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-accent pulse-dot inline-block" />}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{stage.label}</p>
                    {isActive && <p className="text-xs text-muted-foreground mt-0.5">{stage.detail}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {currentStage >= 1 && session && (
            <div className="border border-border rounded overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-muted/30">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">session info</p>
              </div>
              <div className="px-4 py-3 text-xs font-mono flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">session</span>
                  <span>{session.session_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">theme</span>
                  <span>{session.theme}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">status</span>
                  <span className={session.status === "running" ? "text-accent" : ""}>{session.status}</span>
                </div>
                {session.ats_score > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ATS score</span>
                    <span>{Math.round(session.ats_score * 100)}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
