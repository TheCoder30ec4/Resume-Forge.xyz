"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const themes = ["sb2nov", "classic", "modern", "compact"];
const models = [
  { id: "opus", label: "Opus 4.7", desc: "best · slow · ~₹4" },
  { id: "sonnet", label: "Sonnet 4.6", desc: "balanced" },
  { id: "groq", label: "Groq Qwen", desc: "fastest" },
];

export default function NewPage() {
  const router = useRouter();
  const [jd, setJd] = useState("");
  const [theme, setTheme] = useState("sb2nov");
  const [model, setModel] = useState("sonnet");
  const [loading, setLoading] = useState(false);

  function handleGenerate() {
    if (!jd.trim()) return;
    setLoading(true);
    setTimeout(() => router.push("/running"), 300);
  }

  const evidenceReady = true;

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
          {/* Left: Inputs */}
          <div className="flex flex-col gap-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                step 1 of 1
              </p>
              <h1 className="text-2xl font-bold tracking-tighter">New résumé</h1>
            </div>

            {/* JD Input */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-widest">
                1. Job description
              </Label>
              <div className="flex gap-2 mb-2">
                {["📎 .pdf", "🔗 from URL", "✏ paste"].map((opt) => (
                  <button
                    key={opt}
                    className="text-xs border border-border rounded px-2 py-1 font-mono hover:border-foreground transition-colors duration-150 cursor-pointer"
                  >
                    {opt}
                  </button>
                ))}
              </div>
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

            {/* Model */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-widest">3. Model</Label>
              <div className="flex flex-col gap-2">
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`flex items-center justify-between text-left px-4 py-3 border rounded font-mono transition-colors duration-150 cursor-pointer ${
                      model === m.id
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/50"
                    }`}
                  >
                    <span className="text-sm font-bold">{m.label}</span>
                    <span className="text-xs text-muted-foreground">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Evidence + Generate */}
          <div className="flex flex-col gap-6">
            {/* Evidence panel */}
            <div className="border border-border rounded p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${
                    evidenceReady ? "text-accent" : "text-muted-foreground"
                  }`}
                >
                  {evidenceReady ? "● EVIDENCE READY" : "○ EVIDENCE PENDING"}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono">GH · 12 repos</span>
                  <Badge variant="outline" className="text-[10px]">connected</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono">LI · profile</span>
                  <Badge variant="outline" className="text-[10px]">connected</Badge>
                </div>
              </div>
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left mt-1"
                onClick={() => router.push("/settings")}
              >
                edit allowlist →
              </button>
            </div>

            {/* Sticky generate button area */}
            <div className="flex flex-col gap-3 sticky top-24">
              <Button
                onClick={handleGenerate}
                disabled={!jd.trim() || loading}
                className="h-12 font-bold text-sm transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-0"
                style={{
                  backgroundColor: "oklch(0.22 0.03 55)",
                  color: "oklch(0.96 0.005 80)",
                }}
              >
                {loading ? "starting..." : "Generate résumé →"}
              </Button>
              {!jd.trim() && (
                <p className="text-xs text-muted-foreground text-center">
                  paste a job description to continue
                </p>
              )}
            </div>

            {/* Recent runs */}
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">recent</p>
              {[
                { label: "Senior FE @ Linear", ats: 91, time: "2h ago" },
                { label: "Staff Eng @ Vercel", ats: 88, time: "yesterday" },
              ].map((r, i) => (
                <button
                  key={i}
                  onClick={() => router.push("/dashboard")}
                  className="flex items-center justify-between text-xs border border-border rounded px-3 py-2 hover:border-foreground transition-colors cursor-pointer"
                >
                  <span className="font-mono">{r.label}</span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>ATS {r.ats}</span>
                    <span>{r.time}</span>
                    <span className="text-foreground">open ↗</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
