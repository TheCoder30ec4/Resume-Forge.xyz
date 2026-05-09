"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const coversTags = ["React", "TS", "Next.js", "design-system", "perf", "mentorship", "GraphQL", "a11y"];
const themes = ["sb2nov", "classic", "modern", "compact"];

const resumePreview = {
  name: "ALEX MORGAN",
  contact: "alex@morg.dev · github.com/amorg · linkedin.com/in/amorg",
  summary: "Senior frontend engineer with 7+ years shipping React at scale. Led design-system migrations across 12 surfaces and owned perf budgets for high-traffic flows.",
  experience: [
    {
      company: "Stripe · Senior Engineer",
      dates: "2022 — Present",
      bullets: [
        "Led migration to Next.js App Router across 12 surfaces",
        "Built design-system tokens consumed by 40+ teams",
        "Cut p75 LCP by 38% via streaming SSR",
      ],
    },
    {
      company: "Vercel · Engineer",
      dates: "2020 — 2022",
      bullets: [
        "Owned core rendering pipeline for vercel.com",
      ],
    },
  ],
  skills: "TypeScript · React · Next.js · Postgres · GraphQL · Tailwind",
};

export default function ShippedPage() {
  const router = useRouter();
  const [theme, setTheme] = useState("sb2nov");

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
        {/* Left: Controls */}
        <div className="w-full lg:w-80 flex-shrink-0 border-r border-border flex flex-col gap-6 p-6">
          {/* Shipped banner */}
          <div>
            <p className="text-xl font-bold tracking-tight">
              shipped ✦
            </p>
            <p className="text-xs text-muted-foreground mt-1">Senior FE @ Linear</p>
            <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground mt-2">
              <span>47 seconds</span>
              <span>·</span>
              <span>1 attempt</span>
              <span>·</span>
              <span>₹3.40</span>
              <span>·</span>
              <span className="text-accent font-bold">ATS 94/100</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              className="h-10 font-bold text-sm cursor-pointer transition-colors duration-150 border-0"
              style={{
                backgroundColor: "oklch(0.22 0.03 55)",
                color: "oklch(0.96 0.005 80)",
              }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Download PDF
            </Button>
            <div className="flex gap-2">
              <button className="flex-1 text-xs border border-border rounded px-3 py-2 font-mono hover:border-foreground transition-colors cursor-pointer">
                YAML
              </button>
              <button
                className="flex-1 text-xs border border-border rounded px-3 py-2 font-mono hover:border-foreground transition-colors cursor-pointer"
                onClick={() => router.push("/new")}
              >
                ↻ duplicate
              </button>
            </div>
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left"
              onClick={() => router.push("/history")}
            >
              history →
            </button>
          </div>

          {/* Covers */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">covers</p>
            <div className="flex flex-wrap gap-1.5">
              {coversTags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] font-mono border-accent/30 text-accent">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Theme switcher */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">switch theme</p>
            <div className="flex flex-wrap gap-1.5">
              {themes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`text-[10px] px-2 py-1 border rounded font-mono transition-colors duration-150 cursor-pointer ${
                    theme === t
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Edit link */}
          <button
            onClick={() => router.push("/editor")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left mt-auto border border-border rounded px-3 py-2 hover:border-foreground"
          >
            Edit sections ↗
          </button>
        </div>

        {/* Right: Resume preview */}
        <div className="flex-1 bg-muted/20 flex items-start justify-center p-8 overflow-auto">
          <div
            className="w-full max-w-[640px] bg-card border border-border p-10 font-mono text-sm shadow-sm"
            style={{ minHeight: "792px" }}
          >
            {/* Header */}
            <div className="text-center mb-6 pb-4 border-b border-foreground/20">
              <h1 className="text-xl font-bold tracking-widest uppercase">{resumePreview.name}</h1>
              <p className="text-xs text-muted-foreground mt-1">{resumePreview.contact}</p>
            </div>

            {/* Summary */}
            <section className="mb-5">
              <h2 className="text-xs font-bold uppercase tracking-widest border-b border-foreground/20 pb-1 mb-2">Summary</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">{resumePreview.summary}</p>
            </section>

            {/* Experience */}
            <section className="mb-5">
              <h2 className="text-xs font-bold uppercase tracking-widest border-b border-foreground/20 pb-1 mb-3">Experience</h2>
              {resumePreview.experience.map((exp, i) => (
                <div key={i} className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{exp.company}</span>
                    <span className="text-xs text-muted-foreground">{exp.dates}</span>
                  </div>
                  <ul className="list-disc list-inside flex flex-col gap-0.5">
                    {exp.bullets.map((b, j) => (
                      <li key={j} className="text-xs text-muted-foreground leading-relaxed">{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            {/* Skills */}
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest border-b border-foreground/20 pb-1 mb-2">Skills</h2>
              <p className="text-xs text-muted-foreground">{resumePreview.skills}</p>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
