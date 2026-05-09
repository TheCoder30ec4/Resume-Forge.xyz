"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const resumes = [
  { id: 1, title: "Senior FE @ Linear", ats: 94, date: "May 5", theme: "sb2nov" },
  { id: 2, title: "Staff Eng @ Vercel", ats: 88, date: "May 3", theme: "classic" },
  { id: 3, title: "Product Eng @ Ramp", ats: 91, date: "May 1", theme: "modern" },
  { id: 4, title: "FE Eng @ Notion", ats: 86, date: "Apr 27", theme: "sb2nov" },
  { id: 5, title: "SWE @ Stripe", ats: 92, date: "Apr 22", theme: "compact" },
  { id: 6, title: "Frontend @ Figma", ats: 89, date: "Apr 18", theme: "classic" },
];

function atsColor(score: number) {
  if (score >= 90) return "text-accent";
  if (score >= 80) return "text-foreground";
  return "text-muted-foreground";
}

export default function DashboardPage() {
  const router = useRouter();
  const [view, setView] = useState<"grid" | "table">("grid");

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] px-6 py-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter">All résumés</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{resumes.length} total</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex border border-border rounded overflow-hidden">
              <button
                onClick={() => setView("grid")}
                aria-label="Grid view"
                className={`px-3 py-2 text-xs font-mono transition-colors duration-150 cursor-pointer ${
                  view === "grid" ? "bg-foreground text-background" : "hover:bg-muted"
                }`}
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3A1.5 1.5 0 0115 10.5v3A1.5 1.5 0 0113.5 15h-3A1.5 1.5 0 019 13.5v-3z" />
                </svg>
              </button>
              <button
                onClick={() => setView("table")}
                aria-label="Table view"
                className={`px-3 py-2 text-xs font-mono transition-colors duration-150 cursor-pointer ${
                  view === "table" ? "bg-foreground text-background" : "hover:bg-muted"
                }`}
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M0 2a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V2zm15 2H1v2h14V4zm0 3H1v2h14V7zm0 3H1v2h14v-2zm0 3H1v2h14v-2z" />
                </svg>
              </button>
            </div>
            <Button
              onClick={() => router.push("/new")}
              className="h-9 font-bold text-xs cursor-pointer transition-colors duration-150 border-0"
              style={{
                backgroundColor: "oklch(0.22 0.03 55)",
                color: "oklch(0.96 0.005 80)",
              }}
            >
              + New
            </Button>
          </div>
        </div>

        {/* Grid view */}
        {view === "grid" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {resumes.map((r) => (
              <button
                key={r.id}
                onClick={() => router.push("/editor")}
                className="group relative flex flex-col border border-border rounded p-5 text-left hover:border-foreground transition-colors duration-150 cursor-pointer bg-card"
              >
                {/* ATS score */}
                <span className={`text-3xl font-bold tabular-nums mb-3 ${atsColor(r.ats)}`}>
                  {r.ats}
                </span>
                <p className="text-sm font-bold leading-tight mb-1">{r.title}</p>
                <div className="flex items-center justify-between mt-auto pt-4">
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">{r.theme}</Badge>
                </div>
                {/* Hover action */}
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <span className="text-xs font-bold">✎ edit</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Table view */}
        {view === "table" && (
          <div className="border border-border rounded overflow-hidden">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-normal">Title</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-normal">ATS</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-normal">Theme</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-normal">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {resumes.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors duration-150 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                    onClick={() => router.push("/editor")}
                  >
                    <td className="px-4 py-3 font-bold text-xs">{r.title}</td>
                    <td className={`px-4 py-3 text-xs font-bold tabular-nums ${atsColor(r.ats)}`}>{r.ats}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.theme}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.date}</td>
                    <td className="px-4 py-3 text-xs text-right text-muted-foreground hover:text-foreground">↓ open</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hero CTA for empty state / prompt */}
        <div className="mt-12 border border-border rounded p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-sm text-muted-foreground">got a job posting?</p>
            <p className="text-lg font-bold tracking-tight">Build your next résumé →</p>
            <p className="text-xs text-muted-foreground mt-1">average run: 47 seconds</p>
          </div>
          <Button
            onClick={() => router.push("/new")}
            className="h-10 font-bold text-sm cursor-pointer transition-colors duration-150 whitespace-nowrap border-0"
            style={{
              backgroundColor: "oklch(0.22 0.03 55)",
              color: "oklch(0.96 0.005 80)",
            }}
          >
            + New
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
