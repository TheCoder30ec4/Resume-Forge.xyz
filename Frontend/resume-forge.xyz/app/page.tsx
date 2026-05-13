"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function LandingPage() {
  const router = useRouter();
  const [jd, setJd] = useState("");

  function handleTry() {
    router.push("/signin");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <main className="flex-1 flex flex-col justify-center px-6 pt-24 pb-16 max-w-4xl mx-auto w-full">

        {/* Eyebrow */}
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-4">
          so. another job posting.
        </p>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold leading-none tracking-tighter mb-5">
          résumé,
          <br />
          <span className="text-accent">forged.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-sm md:text-base text-muted-foreground max-w-lg mb-12 leading-relaxed">
          Drop a job description. Get a résumé that hits every keyword — built
          from your actual GitHub commits and LinkedIn work history, not
          hallucinated fluff. ATS-clean. Interview-ready.
        </p>

        {/* JD Input + CTA */}
        <div className="flex flex-col gap-3 max-w-2xl">
          <Textarea
            placeholder="paste a job description..."
            className="font-mono text-sm resize-none min-h-[120px] border-foreground/20 focus:border-accent focus:ring-accent bg-card"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
          <div className="flex items-center gap-4">
            <Button
              onClick={handleTry}
              className="font-bold text-sm px-8 h-11 transition-colors duration-150 cursor-pointer border-0"
              style={{
                backgroundColor: "oklch(0.22 0.03 55)",
                color: "oklch(0.96 0.005 80)",
              }}
            >
              Try it →
            </Button>
            <span className="text-xs text-muted-foreground">
              free · no credit card · BYOK or buy credits
            </span>
          </div>
        </div>

        {/* Social proof strip */}
        <div className="mt-16 pt-8 border-t border-border flex flex-wrap gap-8 text-xs text-muted-foreground">
          <div>
            <span className="text-foreground font-bold text-2xl block leading-none">47s</span>
            average run
          </div>
          <div>
            <span className="text-foreground font-bold text-2xl block leading-none">94</span>
            avg ATS score
          </div>
          <div>
            <span className="text-foreground font-bold text-2xl block leading-none">100%</span>
            backed by evidence
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-5 px-6 flex flex-col items-center gap-3">
        <p className="text-[11px] text-muted-foreground text-center max-w-md leading-relaxed italic">
          Built with hate — because perfection isn&apos;t born out of love, it is forged in frustration, obsession, and an unrelenting pursuit of something better.
        </p>
        <div className="flex items-center gap-5 mt-1">
          <a
            href="https://www.linkedin.com/in/ch-varun/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="LinkedIn"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
          <a
            href="https://github.com/TheCoder30ec4/Resume-Forge.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          <a
            href="https://x.com/The_coder30ec4"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="X"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
