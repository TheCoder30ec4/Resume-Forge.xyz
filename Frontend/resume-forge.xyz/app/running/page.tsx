"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/navbar";

const stages = [
  { id: "parse", label: "Parsing job description", detail: "extracting requirements" },
  { id: "gap", label: "Gap analysis", detail: "comparing JD requirements against your evidence" },
  { id: "draft", label: "Drafting résumé", detail: "tailoring bullets to JD keywords" },
  { id: "ats", label: "ATS scoring", detail: "checking keyword coverage" },
  { id: "format", label: "Formatting PDF", detail: "applying theme sb2nov" },
];

const gapRows = [
  { ask: "React performance optimization", found: "LCP-streaming-ssr · commit 4f3b" },
  { ask: "design system experience", found: "stripe-design-tokens · README" },
  { ask: "TypeScript proficiency", found: "12 repos / 9 grant-of-fluency" },
  { ask: "Next.js App Router", found: "vercel-app-router · 3 PRs merged" },
  { ask: "cross-functional collaboration", found: "LI · 4 recommendations" },
];

export default function RunningPage() {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentStage >= stages.length) {
      setDone(true);
      setTimeout(() => router.push("/shipped"), 800);
      return;
    }
    const delay = currentStage === 1 ? 4000 : 2000;
    const t = setTimeout(() => setCurrentStage((s) => s + 1), delay);
    return () => clearTimeout(t);
  }, [currentStage, router]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-start px-6 py-12">
        <div className="w-full max-w-3xl">
          {/* Status bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent pulse-dot inline-block" />
              <span className="text-sm font-mono">
                {done ? "● done" : `● running · ${formatTime(elapsed)}`}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">Senior FE @ Linear</span>
          </div>

          {/* Stage progress */}
          <div className="flex flex-col gap-4 mb-10">
            {stages.map((stage, i) => {
              const isActive = i === currentStage;
              const isDone = i < currentStage;
              return (
                <div
                  key={stage.id}
                  className={`flex items-start gap-4 transition-opacity duration-300 ${
                    i > currentStage ? "opacity-20" : "opacity-100"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-300 ${
                      isDone
                        ? "bg-foreground border-foreground"
                        : isActive
                        ? "border-accent bg-accent/10"
                        : "border-border"
                    }`}
                  >
                    {isDone && (
                      <svg viewBox="0 0 12 12" className="w-3 h-3 text-background" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent pulse-dot inline-block" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${isActive ? "text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground"}`}>
                      {stage.label}
                    </p>
                    {isActive && (
                      <p className="text-xs text-muted-foreground mt-0.5">{stage.detail}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gap analysis river — visible during stage 1 */}
          {currentStage >= 1 && (
            <div className="border border-border rounded overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-muted/30">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">gap analysis</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-muted-foreground font-normal uppercase tracking-widest">
                        JD asks for
                      </th>
                      <th className="text-left px-4 py-2 text-muted-foreground font-normal uppercase tracking-widest">
                        found in evidence
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {gapRows.slice(0, Math.min(currentStage + 1, gapRows.length)).map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0 animate-in fade-in slide-in-from-bottom-1 duration-300">
                        <td className="px-4 py-2.5 text-foreground">{row.ask}</td>
                        <td className="px-4 py-2.5 text-accent">{row.found}</td>
                      </tr>
                    ))}
                    {currentStage < 4 && (
                      <tr>
                        <td colSpan={2} className="px-4 py-2 text-muted-foreground">
                          <span className="shimmer inline-block w-32 h-3 rounded" />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
