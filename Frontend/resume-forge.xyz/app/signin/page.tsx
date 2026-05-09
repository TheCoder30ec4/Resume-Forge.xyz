"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const recentJobs = [
  "◇ Senior FE @ Linear",
  "◇ Staff Eng @ Vercel",
  "◇ Product Eng @ Ramp",
  "◇ FE Eng @ Notion",
];

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
    // Simulate: new user → onboarding, returning → dashboard
    setTimeout(() => router.push(isNewUser ? "/onboarding" : "/dashboard"), 1500);
  }

  function handleGoogle() {
    router.push(isNewUser ? "/onboarding" : "/dashboard");
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: Auth form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-16 max-w-lg">
        <Link href="/" className="text-sm font-bold mb-12 inline-block">
          Resume-Forge
        </Link>

        {/* New / Returning toggle */}
        <div className="flex items-center gap-1 mb-8 border border-border rounded-lg p-1 w-fit">
          <button
            onClick={() => setIsNewUser(false)}
            className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold transition-colors duration-150 cursor-pointer ${
              !isNewUser ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setIsNewUser(true)}
            className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold transition-colors duration-150 cursor-pointer ${
              isNewUser ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign up
          </button>
        </div>

        <h1 className="text-3xl font-bold tracking-tighter mb-2">
          {sent ? "Magic link sent." : isNewUser ? "Create account." : "Welcome back."}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {sent
            ? `Check your inbox. Redirecting you ${isNewUser ? "to onboarding" : "to your dashboard"}…`
            : isNewUser
            ? "Start free. No credit card required."
            : "Magic link to your inbox."}
        </p>

        {!sent ? (
          <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="font-mono text-sm h-11 border-border focus:border-accent focus:ring-accent"
              />
            </div>

            <Button
              type="submit"
              className="h-11 font-bold text-sm transition-colors duration-150 cursor-pointer border-0"
              style={{
                backgroundColor: "oklch(0.22 0.03 55)",
                color: "oklch(0.96 0.005 80)",
              }}
            >
              Send link →
            </Button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              className="h-11 font-mono text-sm border-border hover:border-foreground cursor-pointer transition-colors duration-150"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="border border-accent/40 bg-accent/5 rounded p-4">
              <p className="text-sm font-mono">
                Link sent to <span className="font-bold">{email}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Redirecting you {isNewUser ? "to onboarding" : "to dashboard"}…
              </p>
            </div>
            <button
              onClick={() => setSent(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left"
            >
              ← Use a different email
            </button>
          </div>
        )}
      </div>

      {/* Right: Social proof — espresso brown panel */}
      <div
        className="hidden md:flex flex-1 flex-col justify-center px-12 py-16"
        style={{ backgroundColor: "oklch(0.22 0.03 55)" }}
      >
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 text-xs" style={{ color: "oklch(0.70 0.02 65)" }}>
            <span className="w-2 h-2 rounded-full bg-accent pulse-dot inline-block" />
            live
          </span>
        </div>
        <p className="text-sm mb-4 uppercase tracking-widest" style={{ color: "oklch(0.60 0.02 60)" }}>
          last week&apos;s jobs:
        </p>
        <ul className="flex flex-col gap-3 mb-12">
          {recentJobs.map((job, i) => (
            <li key={i} className="text-lg font-bold tracking-tight" style={{ color: "oklch(0.92 0.005 80)" }}>
              {job}
            </li>
          ))}
        </ul>

        <div className="pt-8" style={{ borderTop: "1px solid oklch(0.30 0.03 55)" }}>
          <p className="text-base italic leading-relaxed mb-4" style={{ color: "oklch(0.78 0.01 70)" }}>
            &ldquo;4 résumés. ~3 minutes total.&rdquo;
          </p>
          <p className="text-xs" style={{ color: "oklch(0.55 0.02 60)" }}>— alex m., shipped from beta</p>
        </div>
      </div>
    </div>
  );
}
