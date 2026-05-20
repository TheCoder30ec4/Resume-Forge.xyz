"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listSessions, ResumeSession } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

function atsColor(score: number) {
  if (score >= 0.9) return "text-accent";
  if (score >= 0.8) return "text-foreground";
  return "text-muted-foreground";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusBadge(status: ResumeSession["status"]) {
  const map: Record<string, string> = {
    pending: "text-muted-foreground",
    running: "text-accent",
    done: "",
    error: "text-red-500",
  };
  return map[status] ?? "";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<ResumeSession[]>([]);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    listSessions()
      .then(setSessions)
      .catch(() => { toast.error("Failed to load sessions."); setSessions([]); })
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <p className="text-xs text-muted-foreground font-mono">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] px-6 py-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter">All résumés</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{sessions.length} total</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex border border-border rounded overflow-hidden">
              <button
                onClick={() => setView("grid")}
                aria-label="Grid view"
                className={`px-3 py-2 text-xs font-mono transition-colors duration-150 cursor-pointer ${view === "grid" ? "bg-foreground text-background" : "hover:bg-muted"}`}
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3A1.5 1.5 0 0115 10.5v3A1.5 1.5 0 0113.5 15h-3A1.5 1.5 0 019 13.5v-3z" />
                </svg>
              </button>
              <button
                onClick={() => setView("table")}
                aria-label="Table view"
                className={`px-3 py-2 text-xs font-mono transition-colors duration-150 cursor-pointer ${view === "table" ? "bg-foreground text-background" : "hover:bg-muted"}`}
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M0 2a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V2zm15 2H1v2h14V4zm0 3H1v2h14V7zm0 3H1v2h14v-2zm0 3H1v2h14v-2z" />
                </svg>
              </button>
            </div>
            <Button
              onClick={() => router.push("/new")}
              className="h-9 font-bold text-xs cursor-pointer transition-colors duration-150 border-0"
              style={{ backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" }}
            >
              + New
            </Button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="border border-dashed border-border rounded p-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">No résumés yet.</p>
            <Button onClick={() => router.push("/new")} className="h-9 font-bold text-xs border-0" style={{ backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" }}>
              Build your first résumé →
            </Button>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/running?session=${s.session_id}`)}
                className="group relative flex flex-col border border-border rounded p-5 text-left hover:border-foreground transition-colors duration-150 cursor-pointer bg-card"
              >
                <span className={`text-3xl font-bold tabular-nums mb-3 ${atsColor(s.ats_score)}`}>
                  {s.status === "done" ? Math.round(s.ats_score * 100) : "—"}
                </span>
                <p className="text-sm font-bold leading-tight mb-1 truncate">{(s.jd_text ?? "").slice(0, 40)}…</p>
                <div className="flex items-center justify-between mt-auto pt-4">
                  <span className="text-xs text-muted-foreground">{fmtDate(s.created_at)}</span>
                  <Badge variant="outline" className={`text-[10px] font-mono ${statusBadge(s.status)}`}>{s.status}</Badge>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <span className="text-xs font-bold">↗ open</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="border border-border rounded overflow-hidden">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-normal">JD</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-normal">ATS</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-normal">Theme</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-normal">Status</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-normal">Date</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors duration-150 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                    onClick={() => router.push(`/running?session=${s.session_id}`)}
                  >
                    <td className="px-4 py-3 text-xs max-w-[200px] truncate">{(s.jd_text ?? "").slice(0, 50)}</td>
                    <td className={`px-4 py-3 text-xs font-bold tabular-nums ${atsColor(s.ats_score)}`}>{s.status === "done" ? Math.round(s.ats_score * 100) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.theme}</td>
                    <td className={`px-4 py-3 text-xs ${statusBadge(s.status)}`}>{s.status}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-12 border border-border rounded p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-sm text-muted-foreground">got a job posting?</p>
            <p className="text-lg font-bold tracking-tight">Build your next résumé →</p>
            <p className="text-xs text-muted-foreground mt-1">average run: 47 seconds</p>
          </div>
          <Button onClick={() => router.push("/new")} className="h-10 font-bold text-sm cursor-pointer whitespace-nowrap border-0" style={{ backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" }}>
            + New
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
