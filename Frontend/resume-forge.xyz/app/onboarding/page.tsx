"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { connectLinkedin, listGithubRepos, githubLoginUrl, updateProfile, ApiError, type GithubRepo } from "@/lib/api";
import { useAuth, needsOnboarding } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";
import { toast } from "sonner";

const steps = [
  {
    id: "authorize",
    label: "GitHub",
    title: "Connect GitHub",
    desc: "Select up to 10 repos — we'll pull commit messages and README evidence. Only the ones relevant to each JD will appear in your résumé.",
    cta: "Save & continue →",
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
    title: "How do you want to run?",
    desc: "Pick how Resume-Forge should power your résumé generations.",
    cta: "Save & continue →",
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

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Go: "#00add8",
  Python: "#3572A5",
  CSS: "#563d7c",
  Shell: "#89e051",
  SQL: "#e38c00",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  "C#": "#178600",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
};

/* ── GitHub step component ── */
function GitHubStep({
  selectedRepos,
  onSelectedChange,
}: {
  selectedRepos: string[];
  onSelectedChange: (repos: string[]) => void;
}) {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const username = typeof window !== "undefined" ? localStorage.getItem("github_username") : null;
    const connected = typeof window !== "undefined" && localStorage.getItem("github_connected") === "1";
    if (username) setGithubUsername(username);
    if (connected) {
      setIsConnected(true);
      fetchRepos();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRepos() {
    setLoading(true);
    try {
      const data = await listGithubRepos();
      setRepos(data);
    } catch {
      toast.error("Failed to load repos. Reconnect GitHub.");
      setIsConnected(false);
      localStorage.removeItem("github_connected");
      localStorage.removeItem("github_username");
    } finally {
      setLoading(false);
    }
  }

  function handleConnect() {
    window.location.href = githubLoginUrl();
  }

  function toggleRepo(fullName: string) {
    if (selectedRepos.includes(fullName)) {
      onSelectedChange(selectedRepos.filter((r) => r !== fullName));
    } else {
      if (selectedRepos.length >= 10) return;
      onSelectedChange([...selectedRepos, fullName]);
    }
  }

  const filtered = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
  );

  const count = selectedRepos.length;
  const atMax = count >= 10;

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-4 mb-6">
        <div className="border border-border rounded p-4 flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <div>
            <p className="text-sm font-bold">GitHub OAuth</p>
            <p className="text-xs text-muted-foreground">Read-only · your repositories</p>
          </div>
        </div>
        <button
          onClick={handleConnect}
          className="h-10 px-5 font-bold text-sm rounded-lg transition-colors duration-150 cursor-pointer border-0 w-fit"
          style={{ backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" }}
        >
          Connect GitHub →
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border border-border rounded p-3 flex items-center gap-3 animate-pulse">
            <div className="w-3 h-3 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3 bg-muted rounded w-1/3" />
              <div className="h-2.5 bg-muted rounded w-2/3" />
            </div>
            <div className="h-2.5 bg-muted rounded w-10" />
          </div>
        ))}
        <p className="text-xs text-muted-foreground font-mono">Fetching your repositories…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-accent inline-block" />
        <span className="text-xs font-mono text-accent font-bold">Connected · @{githubUsername}</span>
        <span className="text-xs text-muted-foreground font-mono">· {repos.length} repos found</span>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-mono font-bold ${count < 2 ? "text-muted-foreground" : count === 10 ? "text-accent" : "text-foreground"}`}>
          {count} / 10 selected
          {count < 2 && " · pick at least 2"}
          {count >= 2 && count < 10 && " · good"}
          {count === 10 && " · max reached"}
        </span>
        {count > 0 && (
          <button
            onClick={() => onSelectedChange([])}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono cursor-pointer"
          >
            clear all
          </button>
        )}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="filter repos…"
        className="w-full h-8 px-3 rounded-lg border border-border bg-card text-xs font-mono focus:outline-none focus:border-foreground transition-colors"
      />

      <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground font-mono py-4 text-center">No repos match.</p>
        )}
        {filtered.map((repo) => {
          const isSelected = selectedRepos.includes(repo.full_name);
          const isDisabled = atMax && !isSelected;
          const pushedAgo = repo.pushed_at
            ? (() => {
                const diff = Date.now() - new Date(repo.pushed_at).getTime();
                const d = Math.floor(diff / 86400000);
                if (d === 0) return "today";
                if (d === 1) return "1d ago";
                if (d < 30) return `${d}d ago`;
                const m = Math.floor(d / 30);
                if (m < 12) return `${m}mo ago`;
                return `${Math.floor(m / 12)}y ago`;
              })()
            : "";
          return (
            <button
              key={repo.full_name}
              type="button"
              onClick={() => !isDisabled && toggleRepo(repo.full_name)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "border-foreground bg-foreground/5"
                  : isDisabled
                  ? "border-border opacity-40 cursor-not-allowed"
                  : "border-border hover:border-foreground/50"
              }`}
            >
              <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors duration-150 ${
                isSelected ? "bg-foreground border-foreground" : "border-border"
              }`}>
                {isSelected && (
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-background" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{repo.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{repo.description || <span className="italic opacity-50">no description</span>}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {repo.language && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: LANG_COLORS[repo.language] ?? "#888" }} />
                    {repo.language}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground font-mono">★ {repo.stargazers_count}</span>
                <span className="text-[11px] text-muted-foreground font-mono">{pushedAgo}</span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
        Only repos relevant to your JD will appear in the résumé — we pick the best evidence automatically.
      </p>
    </div>
  );
}

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
  const { user, loading: authLoading } = useAuth();

  // Redirect to dashboard if onboarding already complete
  useEffect(() => {
    if (!authLoading && user && !needsOnboarding()) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const [currentStep, setCurrentStep] = useState(0);
  // Real repos stored as "owner/repo" strings
  const [selectedRepos, setSelectedRepos] = useState<string[]>(() =>
    JSON.parse(typeof window !== "undefined" ? localStorage.getItem("selected_repos") ?? "[]" : "[]")
  );
  const [repoError, setRepoError] = useState(false);

  // LinkedIn
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("linkedin_connected") === "1"
  );
  const [apiKey, setApiKey] = useState("");
  const [apiPlan, setApiPlan] = useState<"byok" | "paid" | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [paidPlan, setPaidPlan] = useState<"starter" | "pro" | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking" | "wallet">("upi");
  const [upiId, setUpiId] = useState("");
  const [paymentDone, setPaymentDone] = useState(false);
  const [paying, setPaying] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("claude-sonnet-4-6");
  const [customModelUrl, setCustomModelUrl] = useState("");
  const [customModelNeedsKey, setCustomModelNeedsKey] = useState(true);
  const [customModelKey, setCustomModelKey] = useState("");
  const [showCustomKey, setShowCustomKey] = useState(false);
  const [experience, setExperience] = useState("");
  const [isFresher, setIsFresher] = useState(false);
  const [rememberExperience, setRememberExperience] = useState(true);
  const [jd, setJd] = useState("");
  const [jdError, setJdError] = useState(false);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  async function handleLinkedinConnect() {
    if (!linkedinUrl.trim()) return;
    setLinkedinLoading(true);
    try {
      await connectLinkedin(linkedinUrl.trim());
      localStorage.setItem("linkedin_connected", "1");
      setLinkedinConnected(true);
      toast.success("LinkedIn connected!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to connect LinkedIn.");
    } finally {
      setLinkedinLoading(false);
    }
  }

  function handleReposChange(repos: string[]) {
    setSelectedRepos(repos);
    localStorage.setItem("selected_repos", JSON.stringify(repos));
    if (repos.length >= 2) setRepoError(false);
  }

  function handleNext() {
    const step = steps[currentStep];
    if (step.id === "authorize") {
      if (selectedRepos.length < 2) { setRepoError(true); return; }
      setRepoError(false);
      localStorage.setItem("selected_repos", JSON.stringify(selectedRepos));
    }
    if (step.id === "experience") {
      // Persist the Fresher flag — the resume workflow uses it to decide
      // whether to include a work-experience section.
      updateProfile({ is_fresher: isFresher }).catch(() => {});
    }
    if (step.id === "firstrun") {
      if (!jd.trim()) { setJdError(true); return; }
      setCompleted((prev) => new Set([...prev, currentStep]));
      localStorage.setItem("onboarding_jd", jd);
      router.push("/new");
      return;
    }
    setCompleted((prev) => new Set([...prev, currentStep]));
    if (currentStep >= steps.length - 1) {
      // Mark onboarding complete
      localStorage.setItem("onboarding_done", "1");
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
        <span className="text-xs text-muted-foreground">{currentStep + 1} / {steps.length}</span>
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
              <>
                <GitHubStep selectedRepos={selectedRepos} onSelectedChange={handleReposChange} />
                {repoError && (
                  <p className="text-xs text-red-500 font-mono mb-4">Select at least 2 repositories to continue.</p>
                )}
              </>
            )}

            {step.id === "linkedin" && (
              <div className="flex flex-col gap-4 mb-6">
                {linkedinConnected ? (
                  <div className="border border-accent/40 bg-accent/5 rounded p-4 flex items-center gap-3">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="#0A66C2">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-accent">✓ LinkedIn connected</p>
                      <p className="text-xs text-muted-foreground">Profile will be pulled during resume generation</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="border border-border rounded p-4 flex items-center gap-3">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="#0A66C2">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      <div>
                        <p className="text-sm font-bold">LinkedIn Import</p>
                        <p className="text-xs text-muted-foreground">Paste your LinkedIn profile URL</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleLinkedinConnect(); }}
                        placeholder="https://www.linkedin.com/in/yourname"
                        className="font-mono text-xs h-9 flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleLinkedinConnect}
                        disabled={linkedinLoading || !linkedinUrl.trim()}
                        className="h-9 text-xs font-bold border-0 disabled:opacity-50"
                        style={{ backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" }}
                      >
                        {linkedinLoading ? "…" : "Connect"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step.id === "apikey" && (
              <div className="flex flex-col gap-3 mb-6">
                {/* Option cards */}
                {(
                  [
                    {
                      id: "byok" as const,
                      label: "Bring your own key",
                      tag: "BYOK",
                      price: "~₹0.50 / run",
                      desc: "Use your Anthropic API key. Cheapest option.",
                    },
                    {
                      id: "paid" as const,
                      label: "Get a paid plan",
                      tag: "PRO",
                      price: "From ₹199 / mo",
                      desc: "Unlimited runs + priority queue.",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { setApiPlan(opt.id); if (opt.id !== "paid") setPaidPlan(null); }}
                    className={`w-full flex items-start gap-4 px-4 py-3.5 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                      apiPlan === opt.id
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/50"
                    }`}
                  >
                    {/* Radio dot */}
                    <div className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors duration-150 ${
                      apiPlan === opt.id ? "border-foreground" : "border-border"
                    }`}>
                      {apiPlan === opt.id && (
                        <span className="w-2 h-2 rounded-full bg-foreground inline-block" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold">{opt.label}</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-border text-muted-foreground">{opt.tag}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>

                    <span className="text-xs font-mono font-bold text-foreground flex-shrink-0 mt-0.5">{opt.price}</span>
                  </button>
                ))}

                {/* BYOK expanded */}
                {apiPlan === "byok" && (() => {
                  const MODELS = [
                    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "Anthropic", keyHint: "sk-ant-..." },
                    { id: "claude-opus-4-7", label: "Claude Opus 4.7", provider: "Anthropic", keyHint: "sk-ant-..." },
                    { id: "gpt-4o", label: "GPT-4o", provider: "OpenAI", keyHint: "sk-..." },
                    { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI", keyHint: "sk-..." },
                    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "Google", keyHint: "AIza..." },
                    { id: "custom", label: "Custom / self-hosted", provider: "Custom", keyHint: "" },
                  ];
                  const model = MODELS.find((m) => m.id === selectedModel);
                  const isCustom = selectedModel === "custom";
                  return (
                    <div className="flex flex-col gap-3 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      {/* Model picker */}
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs uppercase tracking-widest">Model</Label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {MODELS.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setSelectedModel(m.id)}
                              className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                                selectedModel === m.id
                                  ? "border-foreground bg-foreground/5"
                                  : "border-border hover:border-foreground/50"
                              }`}
                            >
                              <span className="text-xs font-bold leading-tight">{m.label}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{m.provider}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom model URL */}
                      {isCustom && (
                        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          <Label className="text-xs uppercase tracking-widest">Base URL</Label>
                          <Input
                            type="url"
                            placeholder="https://your-endpoint.com/v1"
                            value={customModelUrl}
                            onChange={(e) => setCustomModelUrl(e.target.value)}
                            className="font-mono text-sm h-10"
                          />
                          {/* API key needed checkbox */}
                          <label className="flex items-center gap-2.5 cursor-pointer group w-fit mt-0.5">
                            <div className="relative flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={customModelNeedsKey}
                                onChange={(e) => setCustomModelNeedsKey(e.target.checked)}
                                className="peer sr-only"
                              />
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors duration-150 ${
                                customModelNeedsKey ? "bg-foreground border-foreground" : "border-border group-hover:border-foreground"
                              }`}>
                                {customModelNeedsKey && (
                                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-background" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors duration-150">
                              This endpoint requires an API key
                            </span>
                          </label>
                        </div>
                      )}

                      {/* API key input — for preset or custom-with-key */}
                      {(!isCustom || customModelNeedsKey) && (
                        <div className="flex flex-col gap-1.5 animate-in fade-in duration-200">
                          <Label className="text-xs uppercase tracking-widest">
                            {isCustom ? "API Key" : `${model?.provider} API Key`}
                          </Label>
                          <div className="relative">
                            <Input
                              type={isCustom ? (showCustomKey ? "text" : "password") : (showApiKey ? "text" : "password")}
                              placeholder={isCustom ? "your-api-key" : model?.keyHint}
                              value={isCustom ? customModelKey : apiKey}
                              onChange={(e) => isCustom ? setCustomModelKey(e.target.value) : setApiKey(e.target.value)}
                              className="font-mono text-sm h-10 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => isCustom ? setShowCustomKey((v) => !v) : setShowApiKey((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              tabIndex={-1}
                            >
                              {(isCustom ? showCustomKey : showApiKey) ? (
                                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" strokeLinecap="round"/>
                                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" strokeLinecap="round"/>
                                  <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round"/>
                                  <circle cx="12" cy="12" r="3"/>
                                </svg>
                              )}
                            </button>
                          </div>
                          {!isCustom && (
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {selectedModel.startsWith("claude") && "console.anthropic.com"}
                              {selectedModel.startsWith("gpt") && "platform.openai.com/api-keys"}
                              {selectedModel.startsWith("gemini") && "aistudio.google.com/app/apikey"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Paid plan picker — shown inline, no redirect */}
                {apiPlan === "paid" && (
                  <div className="flex flex-col gap-2 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Choose a plan</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: "starter" as const, name: "Starter", price: "₹199", runs: "30 runs / mo", badge: "" },
                          { id: "pro" as const, name: "Pro", price: "₹499", runs: "Unlimited", badge: "POPULAR" },
                        ] as const
                      ).map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setPaidPlan(plan.id)}
                          className={`flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                            paidPlan === plan.id
                              ? "border-foreground bg-foreground/5"
                              : "border-border hover:border-foreground/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold">{plan.name}</span>
                            {plan.badge && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
                                style={{ borderColor: "oklch(0.75 0.15 75)", color: "oklch(0.75 0.15 75)" }}>
                                {plan.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-base font-bold">{plan.price}<span className="text-xs font-normal text-muted-foreground"> / mo</span></span>
                          <span className="text-xs text-muted-foreground mt-0.5">{plan.runs}</span>
                        </button>
                      ))}
                    </div>
                    {paidPlan && (
                      <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* Order summary */}
                        <div className="border border-border rounded-lg overflow-hidden">
                          <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Order summary</span>
                            <span className="text-xs font-mono font-bold">
                              {paidPlan === "starter" ? "₹199 / mo" : "₹499 / mo"}
                            </span>
                          </div>
                          <div className="px-4 py-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold">{paidPlan === "starter" ? "Starter" : "Pro"} plan</p>
                              <p className="text-xs text-muted-foreground">{paidPlan === "starter" ? "30 runs / mo" : "Unlimited runs"} · billed monthly</p>
                            </div>
                            <span className="text-sm font-bold">{paidPlan === "starter" ? "₹199" : "₹499"}</span>
                          </div>
                        </div>

                        {/* Razorpay-style gateway */}
                        {!paymentDone ? (
                          <div className="border border-border rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                            {/* Gateway header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                              <div className="flex items-center gap-2">
                                {/* Razorpay-style logo */}
                                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                                  <rect width="24" height="24" rx="4" fill="#072654"/>
                                  <path d="M7 17L10.5 7h3l-2 6h3.5L9.5 17H7z" fill="#3395FF"/>
                                </svg>
                                <span className="text-xs font-bold text-foreground">Secure Payment</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M8 1l1.5 3 3.5.5-2.5 2.5.5 3.5L8 9l-3 1.5.5-3.5L3 4.5 6.5 4z" strokeLinejoin="round"/>
                                </svg>
                                <span className="text-[11px] text-muted-foreground font-mono">256-bit SSL</span>
                              </div>
                            </div>

                            <div className="flex" style={{ minHeight: 320 }}>
                              {/* Left: method tabs */}
                              <div className="flex flex-col border-r border-border bg-muted/10 w-28 flex-shrink-0">
                                {(
                                  [
                                    { id: "upi" as const, label: "UPI", icon: "⚡" },
                                    { id: "card" as const, label: "Card", icon: "💳" },
                                    { id: "netbanking" as const, label: "Netbanking", icon: "🏦" },
                                    { id: "wallet" as const, label: "Wallet", icon: "👛" },
                                  ] as const
                                ).map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setPaymentMethod(m.id)}
                                    className={`flex flex-col items-center gap-1 px-2 py-3.5 text-center transition-colors duration-150 cursor-pointer border-l-2 ${
                                      paymentMethod === m.id
                                        ? "border-l-blue-500 bg-background text-foreground"
                                        : "border-l-transparent text-muted-foreground hover:text-foreground hover:bg-background/50"
                                    }`}
                                  >
                                    <span className="text-base">{m.icon}</span>
                                    <span className="text-[10px] font-mono font-bold leading-tight">{m.label}</span>
                                  </button>
                                ))}
                              </div>

                              {/* Right: method content */}
                              <div className="flex-1 p-4 flex flex-col gap-3">
                                {/* UPI */}
                                {paymentMethod === "upi" && (
                                  <div className="flex flex-col gap-3">
                                    <p className="text-xs font-bold">Pay via UPI</p>
                                    {/* UPI apps */}
                                    <div className="grid grid-cols-3 gap-2">
                                      {[
                                        { name: "GPay", color: "#4285F4" },
                                        { name: "PhonePe", color: "#5F259F" },
                                        { name: "Paytm", color: "#00BAF2" },
                                      ].map((app) => (
                                        <button key={app.name} type="button"
                                          className="flex flex-col items-center gap-1 border border-border rounded-lg py-2.5 text-xs font-mono font-bold hover:border-foreground transition-colors cursor-pointer"
                                          style={{ color: app.color }}>
                                          <span className="text-lg">{app.name === "GPay" ? "G" : app.name === "PhonePe" ? "Pe" : "P"}</span>
                                          <span className="text-[10px] text-muted-foreground">{app.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-px bg-border" />
                                      <span className="text-[11px] text-muted-foreground font-mono">or enter UPI ID</span>
                                      <div className="flex-1 h-px bg-border" />
                                    </div>
                                    <div className="flex gap-2">
                                      <Input
                                        type="text"
                                        placeholder="yourname@upi"
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                        className="font-mono text-sm h-9 flex-1"
                                      />
                                      <button type="button"
                                        className="px-3 h-9 text-xs font-mono font-bold border border-border rounded-lg hover:border-foreground transition-colors cursor-pointer">
                                        Verify
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Card */}
                                {paymentMethod === "card" && (
                                  <div className="flex flex-col gap-2.5">
                                    <p className="text-xs font-bold">Debit / Credit Card</p>
                                    <div className="flex flex-col gap-1.5">
                                      <Label className="text-[11px] text-muted-foreground">Card number</Label>
                                      <div className="relative">
                                        <Input type="text" placeholder="1234 5678 9012 3456" maxLength={19}
                                          className="font-mono text-sm h-9 pr-16"
                                          onChange={(e) => {
                                            const r = e.target.value.replace(/\D/g, "").slice(0, 16);
                                            e.target.value = r.replace(/(.{4})/g, "$1 ").trim();
                                          }} />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                          <svg viewBox="0 0 38 24" className="h-3.5 w-auto"><rect width="38" height="24" rx="3" fill="#1A1F71"/><text x="19" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">VISA</text></svg>
                                          <svg viewBox="0 0 38 24" className="h-3.5 w-auto"><rect width="38" height="24" rx="3" fill="#252525"/><circle cx="15" cy="12" r="6" fill="#EB001B" opacity="0.9"/><circle cx="23" cy="12" r="6" fill="#F79E1B" opacity="0.9"/></svg>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="flex flex-col gap-1.5">
                                        <Label className="text-[11px] text-muted-foreground">Expiry</Label>
                                        <Input type="text" placeholder="MM / YY" maxLength={7} className="font-mono text-sm h-9"
                                          onChange={(e) => {
                                            const r = e.target.value.replace(/\D/g, "").slice(0, 4);
                                            e.target.value = r.length > 2 ? `${r.slice(0, 2)} / ${r.slice(2)}` : r;
                                          }} />
                                      </div>
                                      <div className="flex flex-col gap-1.5">
                                        <Label className="text-[11px] text-muted-foreground">CVV</Label>
                                        <Input type="password" placeholder="•••" maxLength={4} className="font-mono text-sm h-9" />
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      <Label className="text-[11px] text-muted-foreground">Name on card</Label>
                                      <Input type="text" placeholder="Full name" className="text-sm h-9" />
                                    </div>
                                  </div>
                                )}

                                {/* Netbanking */}
                                {paymentMethod === "netbanking" && (
                                  <div className="flex flex-col gap-3">
                                    <p className="text-xs font-bold">Select your bank</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {["SBI", "HDFC", "ICICI", "Axis", "Kotak", "Yes Bank"].map((bank) => (
                                        <button key={bank} type="button"
                                          className="px-3 py-2 border border-border rounded-lg text-xs font-mono font-bold text-left hover:border-foreground transition-colors cursor-pointer">
                                          {bank}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      <Label className="text-[11px] text-muted-foreground">Or choose another bank</Label>
                                      <select className="h-9 px-3 rounded-lg border border-border bg-card text-xs font-mono focus:outline-none focus:border-foreground transition-colors">
                                        <option value="">-- Select bank --</option>
                                        {["Punjab National Bank", "Bank of Baroda", "Canara Bank", "Union Bank", "IndusInd Bank"].map((b) => (
                                          <option key={b}>{b}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {/* Wallet */}
                                {paymentMethod === "wallet" && (
                                  <div className="flex flex-col gap-3">
                                    <p className="text-xs font-bold">Select wallet</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      {[
                                        { name: "Paytm", color: "#00BAF2" },
                                        { name: "Amazon Pay", color: "#FF9900" },
                                        { name: "Mobikwik", color: "#1DBFEF" },
                                        { name: "Freecharge", color: "#ED1C24" },
                                      ].map((w) => (
                                        <button key={w.name} type="button"
                                          className="flex items-center gap-2 px-3 py-2.5 border border-border rounded-lg text-xs font-mono font-bold hover:border-foreground transition-colors cursor-pointer">
                                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: w.color }} />
                                          {w.name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Pay button */}
                                <button
                                  type="button"
                                  disabled={paying}
                                  onClick={() => {
                                    setPaying(true);
                                    setTimeout(() => { setPaying(false); setPaymentDone(true); }, 2000);
                                  }}
                                  className="mt-auto w-full h-10 rounded-lg font-bold text-sm transition-all duration-150 cursor-pointer border-0 flex items-center justify-center gap-2 disabled:opacity-70"
                                  style={{ backgroundColor: "#072654", color: "#fff" }}
                                >
                                  {paying ? (
                                    <>
                                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                      </svg>
                                      Processing…
                                    </>
                                  ) : (
                                    <>Pay ₹{paidPlan === "starter" ? "199" : "499"}</>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-2 border-t border-border bg-muted/10 flex items-center justify-center gap-3">
                              <span className="text-[10px] text-muted-foreground font-mono">Powered by</span>
                              <svg viewBox="0 0 80 20" className="h-3.5 w-auto opacity-50">
                                <rect width="80" height="20" rx="3" fill="#072654"/>
                                <text x="8" y="14" fill="#3395FF" fontSize="11" fontWeight="bold" fontFamily="Arial">razorpay</text>
                              </svg>
                              <span className="text-[10px] text-muted-foreground font-mono">· Demo only</span>
                            </div>
                          </div>
                        ) : (
                          /* Payment success */
                          <div className="border border-border rounded-xl p-6 flex flex-col items-center gap-3 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-bold">Payment successful!</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {paidPlan === "starter" ? "Starter · ₹199 / mo" : "Pro · ₹499 / mo"} activated
                              </p>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono">Demo transaction · no real charge</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
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
                  `GitHub · ${selectedRepos.length} repo${selectedRepos.length !== 1 ? "s" : ""} selected`,
                  "LinkedIn · profile synced",
                  apiPlan === "byok" ? "API key · BYOK saved" : paidPlan ? `Plan · ${paidPlan === "pro" ? "Pro" : "Starter"} selected` : "Plan · not set",
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
