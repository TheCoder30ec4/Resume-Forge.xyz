"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const steps = [
  {
    id: "authorize",
    label: "GitHub",
    title: "Authorize GitHub",
    desc: "We read your public repos and commit messages to extract real evidence for your résumés.",
    cta: "Connect GitHub →",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    title: "Connect LinkedIn",
    desc: "Pull your work history, recommendations, and skills automatically.",
    cta: "Connect LinkedIn →",
  },
  {
    id: "apikey",
    label: "API key",
    title: "Add an API key (optional)",
    desc: "Bring your own Anthropic key to reduce cost to ~₹0.50 per run. Skip to use our credits.",
    cta: "Save & continue →",
    skipLabel: "skip for now →",
  },
  {
    id: "experience",
    label: "Experience",
    title: "Tell us about yourself",
    desc: "Describe your work experience in your own words — type it out or just speak. We'll extract the highlights.",
    cta: "Continue →",
    skipLabel: "skip for now →",
  },
  {
    id: "firstrun",
    label: "First run",
    title: "Paste your first JD",
    desc: "Drop in any job description. We'll generate a tailored résumé in under a minute.",
    cta: "Build first résumé →",
  },
  {
    id: "done",
    label: "Done",
    title: "You're set.",
    desc: "Everything is connected. Head to your dashboard to get started.",
    cta: "Go to dashboard →",
  },
];

/* ── Web Speech API types ── */
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

/* ── Experience step component ── */
function ExperienceStep({
  value,
  onChange,
  isFresher,
  onFresherChange,
  rememberExperience,
  onRememberChange,
}: {
  value: string;
  onChange: (v: string) => void;
  isFresher: boolean;
  onFresherChange: (v: boolean) => void;
  rememberExperience: boolean;
  onRememberChange: (v: boolean) => void;
}) {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalChunk += t;
        else interimChunk += t;
      }
      if (finalChunk) {
        onChange(value + (value ? " " : "") + finalChunk.trim());
        setInterim("");
      } else {
        setInterim(interimChunk);
      }
    };

    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  /* stop mic when switching to fresher */
  useEffect(() => {
    if (isFresher && isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterim("");
    }
  }, [isFresher, isListening]);

  function toggleListening() {
    if (!recognitionRef.current || isFresher) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterim("");
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }

  /* auto-grow textarea */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Fresher / Experienced toggle */}
      <div className="flex items-center gap-1 border border-border rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => onFresherChange(false)}
          className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold transition-colors duration-150 cursor-pointer ${
            !isFresher ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Experienced
        </button>
        <button
          type="button"
          onClick={() => onFresherChange(true)}
          className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold transition-colors duration-150 cursor-pointer ${
            isFresher ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Fresher
        </button>
      </div>

      {isFresher ? (
        /* Fresher state — disabled panel */
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 flex flex-col items-center gap-2 text-center select-none">
          <span className="text-2xl">🎓</span>
          <p className="text-sm font-bold text-foreground">No work experience yet — that&apos;s fine.</p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
            We&apos;ll build your résumé around your projects, education, and skills. Change this any time once you&apos;ve shipped your first role.
          </p>
        </div>
      ) : (
        <>
          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. I've worked as a frontend engineer for 5 years, mostly in React and TypeScript. At my last company I built a design system used by 20+ teams…"
              rows={6}
              className="w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-foreground transition-colors font-sans"
              spellCheck={false}
            />

            {/* Interim transcription overlay */}
            {interim && (
              <div className="absolute bottom-3 left-4 right-4 text-sm text-muted-foreground italic pointer-events-none">
                {interim}
                <span className="inline-block w-0.5 h-4 bg-foreground ml-0.5 animate-pulse align-middle" />
              </div>
            )}
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-mono">
              {wordCount} word{wordCount !== 1 ? "s" : ""}
              {wordCount > 0 && wordCount < 30 && " · add more detail for better results"}
              {wordCount >= 30 && " · great, we have enough to work with"}
            </span>

            {supported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all duration-150 cursor-pointer ${
                  isListening
                    ? "border-red-400 bg-red-50 text-red-600"
                    : "border-border hover:border-foreground text-muted-foreground hover:text-foreground"
                }`}
              >
                {isListening ? (
                  <>
                    <span className="relative flex items-center justify-center w-3.5 h-3.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60 animate-ping" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    Stop recording
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round"/>
                      <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round"/>
                    </svg>
                    Speak
                  </>
                )}
              </button>
            )}
          </div>

          {/* Remember for future resumes */}
          <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={rememberExperience}
                onChange={(e) => onRememberChange(e.target.checked)}
                className="peer sr-only"
              />
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors duration-150 ${
                rememberExperience ? "bg-foreground border-foreground" : "border-border group-hover:border-foreground"
              }`}>
                {rememberExperience && (
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-background" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors duration-150">
              Use this experience for all future résumés
            </span>
          </label>

          {/* Listening indicator bar */}
          {isListening && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
              <div className="flex gap-0.5 items-end h-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-400 rounded-full"
                    style={{
                      height: `${30 + Math.random() * 70}%`,
                      animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-red-600 font-mono">Listening… speak naturally</span>
            </div>
          )}

          {!supported && (
            <p className="text-xs text-muted-foreground font-mono">
              Voice input not supported in this browser. Use Chrome or Edge for live transcription.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [experience, setExperience] = useState("");
  const [isFresher, setIsFresher] = useState(false);
  const [rememberExperience, setRememberExperience] = useState(true);
  const [jd, setJd] = useState("");
  const [jdError, setJdError] = useState(false);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  function handleNext() {
    const step = steps[currentStep];
    if (step.id === "firstrun") {
      if (!jd.trim()) { setJdError(true); return; }
      setCompleted((prev) => new Set([...prev, currentStep]));
      router.push("/running");
      return;
    }
    setCompleted((prev) => new Set([...prev, currentStep]));
    if (currentStep >= steps.length - 1) {
      router.push("/dashboard");
    } else {
      setCurrentStep((s) => s + 1);
    }
  }

  const step = steps[currentStep];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border flex items-center justify-between">
        <Link href="/" className="text-xl font-extrabold tracking-tight">Resume-Forge</Link>
        <span className="text-xs text-muted-foreground font-mono">{currentStep + 1} / {steps.length}</span>
      </header>

      <div className="flex-1 flex flex-col md:flex-row max-w-4xl mx-auto w-full px-6 py-12 gap-12">

        {/* Left: Vertical timeline */}
        <div className="flex flex-col gap-0 md:w-48 flex-shrink-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">Setup</p>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Your first run, in {steps.length} steps.
          </p>
          {steps.map((s, i) => {
            const isDone = completed.has(i);
            const isActive = i === currentStep;
            const isFuture = i > currentStep;
            return (
              <div key={s.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                      isDone ? "bg-foreground border-foreground" : isActive ? "border-accent bg-accent/10" : "border-border"
                    }`}
                  >
                    {isDone ? (
                      <svg viewBox="0 0 12 12" className="w-3 h-3 text-background" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : isActive ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-border inline-block" />
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-px flex-1 my-1 min-h-[32px] transition-colors duration-200 ${isDone ? "bg-foreground" : "bg-border"}`} />
                  )}
                </div>
                <div className="pb-8">
                  <button
                    disabled={isFuture}
                    onClick={() => !isFuture && setCurrentStep(i)}
                    className={`text-xs font-mono text-left transition-colors duration-150 ${
                      isActive ? "text-foreground font-bold" : isDone ? "text-muted-foreground cursor-pointer hover:text-foreground" : "text-muted-foreground/40"
                    }`}
                  >
                    {s.label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Step content */}
        <div className="flex-1 flex flex-col justify-start max-w-lg">
          <div key={step.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h1 className="text-2xl font-bold tracking-tighter mb-2">{step.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">{step.desc}</p>

            {step.id === "authorize" && (
              <div className="border border-border rounded p-4 mb-6 flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <div>
                  <p className="text-sm font-bold">GitHub OAuth</p>
                  <p className="text-xs text-muted-foreground">Read-only · public repos</p>
                </div>
              </div>
            )}

            {step.id === "linkedin" && (
              <div className="border border-border rounded p-4 mb-6 flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="#0A66C2">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <div>
                  <p className="text-sm font-bold">LinkedIn Import</p>
                  <p className="text-xs text-muted-foreground">Profile, experience, recommendations</p>
                </div>
              </div>
            )}

            {step.id === "apikey" && (
              <div className="flex flex-col gap-3 mb-6">
                <Label className="text-xs uppercase tracking-widest">Anthropic API Key</Label>
                <Input
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono text-sm h-10"
                />
                <p className="text-xs text-muted-foreground">Runs at ~₹0.50 with your own key vs ₹3.40 from our credits.</p>
              </div>
            )}

            {step.id === "experience" && (
              <ExperienceStep
                value={experience}
                onChange={setExperience}
                isFresher={isFresher}
                onFresherChange={setIsFresher}
                rememberExperience={rememberExperience}
                onRememberChange={setRememberExperience}
              />
            )}

            {step.id === "firstrun" && (
              <div className="flex flex-col gap-2 mb-6">
                <textarea
                  value={jd}
                  onChange={(e) => { setJd(e.target.value); if (e.target.value.trim()) setJdError(false); }}
                  placeholder={"Paste a job description here…\n\ne.g. Senior Frontend Engineer at Linear — We're looking for someone with deep React and TypeScript experience…"}
                  rows={10}
                  className={`w-full resize-none rounded-lg border bg-card px-4 py-3 text-sm leading-relaxed focus:outline-none transition-colors font-mono ${
                    jdError ? "border-red-400 focus:border-red-400" : "border-border focus:border-foreground"
                  }`}
                  spellCheck={false}
                />
                {jdError && (
                  <p className="text-xs text-red-500 font-mono">Paste a job description to continue.</p>
                )}
                <p className="text-[11px] text-muted-foreground font-mono">
                  {jd.trim() ? `${jd.trim().split(/\s+/).length} words` : "paste any JD — LinkedIn, Greenhouse, Lever, anything"}
                </p>
              </div>
            )}

            {step.id === "done" && (
              <div className="flex flex-col gap-2 mb-6">
                {[
                  "GitHub · 12 repos connected",
                  "LinkedIn · profile synced",
                  "API key saved",
                  isFresher ? "Experience · fresher — projects-first mode" : "Experience · captured",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <svg viewBox="0 0 12 12" className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={handleNext}
                className="h-10 font-bold text-sm cursor-pointer transition-colors duration-150 border-0"
                style={{ backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" }}
              >
                {step.cta}
              </Button>
              {step.skipLabel && (
                <button
                  onClick={handleNext}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {step.skipLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
