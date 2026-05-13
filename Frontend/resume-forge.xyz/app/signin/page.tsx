"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";


export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sent, setSent] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  function validate() {
    const e: Record<string, string> = {};

    if (!email.trim()) {
      e.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = "Enter a valid email address.";
    }

    if (!password) {
      e.password = "Password is required.";
    } else if (password.length < 8) {
      e.password = "Password must be at least 8 characters.";
    } else if (!/[A-Z]/.test(password)) {
      e.password = "Include at least one uppercase letter.";
    } else if (!/[0-9]/.test(password)) {
      e.password = "Include at least one number.";
    }

    if (isNewUser) {
      if (!confirmPassword) {
        e.confirmPassword = "Please confirm your password.";
      } else if (password !== confirmPassword) {
        e.confirmPassword = "Passwords do not match.";
      }
    }

    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSent(true);
    setTimeout(() => router.push(isNewUser ? "/onboarding" : "/dashboard"), 1500);
  }

  function handleGoogle() {
    router.push(isNewUser ? "/onboarding" : "/dashboard");
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: Auth form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-16 max-w-lg">
        <Link href="/" className="mb-12 inline-block">
          <span className="text-4xl font-extrabold tracking-tight">
            Resume-<span style={{ color: "#f59e0b" }}>Forge</span>
          </span>
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
            ? `Redirecting you ${isNewUser ? "to onboarding" : "to your dashboard"}…`
            : isNewUser
            ? "Start free. No credit card required."
            : "Enter your credentials to continue."}
        </p>

        {!sent ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
                className={`font-mono text-sm h-11 border-border focus:border-accent focus:ring-accent ${errors.email ? "border-red-500" : ""}`}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-widest">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
                  className={`font-mono text-sm h-11 border-border focus:border-accent focus:ring-accent pr-10 ${errors.password ? "border-red-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            {isNewUser && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm-password" className="text-xs uppercase tracking-widest">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: "" })); }}
                    className={`font-mono text-sm h-11 border-border focus:border-accent focus:ring-accent pr-10 ${errors.confirmPassword ? "border-red-500" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 font-bold text-sm transition-colors duration-150 cursor-pointer border-0 mt-1"
              style={{
                backgroundColor: "oklch(0.22 0.03 55)",
                color: "oklch(0.96 0.005 80)",
              }}
            >
              {isNewUser ? "Create account →" : "Sign in →"}
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

      {/* Right: Brand panel */}
      <div
        className="hidden md:flex flex-1 flex-col justify-center px-12 py-16 relative overflow-hidden"
        style={{ backgroundColor: "oklch(0.22 0.03 55)" }}
      >
        {/* Background texture — large faint wordmark */}
        <p
          className="absolute -bottom-6 -right-4 text-[11rem] font-extrabold leading-none select-none pointer-events-none tracking-tighter"
          style={{ color: "oklch(0.17 0.03 55)" }}
          aria-hidden="true"
        >
          RF
        </p>

        {/* Main content */}
        <div className="relative z-10">
          <p
            className="text-4xl font-extrabold tracking-tighter leading-tight mb-6"
            style={{ color: "oklch(0.96 0.005 80)" }}
          >
            Your résumé,<br />
            <span style={{ color: "oklch(0.75 0.12 60)" }}>forged to fit.</span>
          </p>

          <div className="flex flex-col gap-4">
            {[
              { stat: "47s", label: "Average time to generate" },
              { stat: "94", label: "Average ATS score" },
              { stat: "0%", label: "Hallucinated experience" },
            ].map(({ stat, label }) => (
              <div key={stat} className="flex items-center gap-4" style={{ borderLeft: "2px solid oklch(0.40 0.05 55)", paddingLeft: "1rem" }}>
                <span className="text-2xl font-extrabold tabular-nums" style={{ color: "oklch(0.96 0.005 80)" }}>{stat}</span>
                <span className="text-xs" style={{ color: "oklch(0.60 0.02 60)" }}>{label}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
