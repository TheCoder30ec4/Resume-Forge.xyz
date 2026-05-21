"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlignLeft,
  ArrowLeft,
  Award,
  Briefcase,
  Check,
  ChevronDown,
  Download,
  FileText,
  FolderGit2,
  GraduationCap,
  Link2,
  type LucideIcon,
  Plus,
  Save,
  Sparkles,
  User,
  Wrench,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/navbar";
import {
  getSession,
  approveVersion,
  updateDraft,
  pdfUrl,
  ResumeSession,
  ResumeVersion,
} from "@/lib/api";
import { toast } from "sonner";

// ── CV types ──────────────────────────────────────────────────────────────────
type SocialNetwork = { network?: string; username?: string };
type SectionItem = string | Record<string, unknown>;
interface Cv {
  name?: string;
  location?: string;
  email?: string;
  phone?: string;
  website?: string;
  social_networks?: SocialNetwork[];
  sections?: Record<string, SectionItem[]>;
  [k: string]: unknown;
}

const PERSONAL_FIELDS: (keyof Cv)[] = ["name", "email", "location"];

const SECTION_ICONS: Record<string, LucideIcon> = {
  summary: AlignLeft,
  experience: Briefcase,
  education: GraduationCap,
  skills: Wrench,
  projects: FolderGit2,
  certifications: Award,
};

// Section keys that are no longer part of the resume and must not be shown,
// even if an older saved draft still contains them.
const HIDDEN_SECTIONS = new Set(["summary"]);

function prettify(key: string): string {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function visibleSections(
  sections: Record<string, SectionItem[]>
): [string, SectionItem[]][] {
  return Object.entries(sections).filter(([k]) => !HIDDEN_SECTIONS.has(k.toLowerCase()));
}

// Sort key for an entry — newest first; "present" outranks any date.
function entryDateKey(item: SectionItem): string {
  if (typeof item !== "object" || item === null) return "";
  const e = item as Record<string, unknown>;
  const raw = String(e.end_date ?? e.date ?? e.start_date ?? "");
  return /present/i.test(raw) ? "9999-99" : raw;
}

function sortedByDateDesc(items: SectionItem[]): SectionItem[] {
  if (!items.every((i) => typeof i === "object" && i !== null)) return items;
  return [...items].sort((a, b) => entryDateKey(b).localeCompare(entryDateKey(a)));
}

// Parse a "[label](url)" markdown link; returns plain text if not a link.
function parseMdLink(text: string): { label: string; href: string | null } {
  const m = text.match(/^\[(.+?)\]\((.+?)\)$/);
  return m ? { label: m[1], href: m[2] } : { label: text, href: null };
}

function sectionIcon(key: string): LucideIcon {
  return SECTION_ICONS[key.toLowerCase()] ?? FileText;
}

function ShippedInner() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session");

  const [session, setSession] = useState<ResumeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState("");

  const [cv, setCv] = useState<Cv | null>(null);
  const [dirty, setDirty] = useState(false);

  const latestVersion: ResumeVersion | undefined = useMemo(
    () =>
      session
        ? [...session.versions].sort((a, b) => b.version_number - a.version_number)[0]
        : undefined,
    [session]
  );

  useEffect(() => {
    if (!sessionId) {
      router.push("/dashboard");
      return;
    }
    getSession(sessionId)
      .then(setSession)
      .catch(() => setError("Could not load session."))
      .finally(() => setLoading(false));
  }, [sessionId, router]);

  useEffect(() => {
    const draft = latestVersion?.resume_draft as { cv?: Cv } | null;
    if (draft?.cv) {
      setCv(structuredClone(draft.cv));
      setDirty(false);
      setApproved(latestVersion?.is_approved ?? false);
    }
  }, [latestVersion]);

  // ── edit helpers ──────────────────────────────────────────────────────────
  function mutate(fn: (draft: Cv) => void) {
    setCv((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setDirty(true);
  }

  async function handleSave() {
    if (!cv || !session || !latestVersion) return;
    setSaving(true);
    try {
      // Drop removed sections (e.g. summary) so stale keys leave the DB draft.
      const cleanCv = structuredClone(cv);
      if (cleanCv.sections) {
        for (const k of Object.keys(cleanCv.sections)) {
          if (HIDDEN_SECTIONS.has(k.toLowerCase())) delete cleanCv.sections[k];
        }
      }
      const updated = await updateDraft(session.session_id, latestVersion.id, { cv: cleanCv });
      setSession((s) =>
        s
          ? { ...s, versions: s.versions.map((v) => (v.id === updated.id ? updated : v)) }
          : s
      );
      setDirty(false);
      toast.success("Changes saved.");
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!latestVersion || !session) return;
    if (dirty) {
      toast.error("Save your changes before approving.");
      return;
    }
    setApproving(true);
    try {
      await approveVersion(session.session_id, latestVersion.id);
      setApproved(true);
      toast.success("Resume approved and saved!");
    } catch {
      const msg = "Failed to approve.";
      setError(msg);
      toast.error(msg);
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <p className="text-xs text-muted-foreground font-mono motion-safe:animate-pulse">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !session) {
    return (
      <AppLayout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <p className="text-xs text-destructive">{error || "Session not found."}</p>
        </div>
      </AppLayout>
    );
  }

  const pdfLink = latestVersion ? pdfUrl(session.session_id, latestVersion.id) : null;
  const sections = cv?.sections ?? {};
  const atsScore = Math.round(session.ats_score * 100);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
        {/* ── LEFT: editor ─────────────────────────────────────────────────── */}
        <div className="w-full lg:w-[46%] lg:max-w-2xl flex-shrink-0 border-r border-border flex flex-col min-h-0">
          {/* toolbar */}
          <div className="border-b border-border bg-background px-5 py-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <h1 className="text-lg font-bold tracking-tight">shipped</h1>
                <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
                  v{latestVersion?.version_number ?? 1}
                </span>
              </div>
              <AtsBadge score={atsScore} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-md text-xs font-bold text-[oklch(0.96_0.005_80)] bg-[oklch(0.22_0.03_55)] transition-all duration-200 hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving…" : "Save changes"}
              </button>

              {approved ? (
                <span className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md text-xs font-bold text-accent-foreground bg-accent">
                  <Check className="h-3.5 w-3.5" />
                  Approved
                </span>
              ) : (
                <button
                  onClick={handleApprove}
                  disabled={approving || !latestVersion}
                  className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-md text-xs font-bold border border-border transition-colors duration-200 hover:border-foreground hover:bg-muted/50 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Check className="h-3.5 w-3.5" />
                  {approving ? "Approving…" : "Approve & save"}
                </button>
              )}

              {pdfLink && (
                <a
                  href={pdfLink}
                  target="_blank"
                  rel="noreferrer"
                  className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-md text-xs font-mono border border-border transition-colors duration-200 hover:border-foreground hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </a>
              )}

              <button
                onClick={() => router.push("/dashboard")}
                className="h-9 px-2.5 ml-auto inline-flex items-center gap-1.5 rounded-md text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Dashboard
              </button>
            </div>

            {dirty && (
              <p className="text-[10px] font-mono text-accent flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-pulse" />
                Unsaved changes — save to update the PDF
              </p>
            )}
          </div>

          {/* editable content */}
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
            {!cv ? (
              <EmptyState status={session.status} />
            ) : (
              <>
                <SectionCard icon={User} title="Personal Info" defaultOpen>
                  <div className="grid grid-cols-2 gap-3">
                    {PERSONAL_FIELDS.map((f) => (
                      <Field
                        key={f}
                        label={prettify(f as string)}
                        value={(cv[f] as string) ?? ""}
                        onChange={(v) => mutate((d) => { d[f] = v as never; })}
                      />
                    ))}
                  </div>
                </SectionCard>

                <SectionCard
                  icon={Link2}
                  title="Social Networks"
                  count={cv.social_networks?.length}
                  onAdd={() =>
                    mutate((d) => {
                      d.social_networks = [
                        ...(d.social_networks ?? []),
                        { network: "", username: "" },
                      ];
                    })
                  }
                >
                  {(cv.social_networks ?? []).length === 0 && <EmptyHint label="social networks" />}
                  {(cv.social_networks ?? []).map((sn, i) => (
                    <ItemRow
                      key={i}
                      onRemove={() => mutate((d) => { d.social_networks?.splice(i, 1); })}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <Field
                          label="Network"
                          value={sn.network ?? ""}
                          onChange={(v) => mutate((d) => { d.social_networks![i].network = v; })}
                        />
                        <Field
                          label="Username"
                          value={sn.username ?? ""}
                          onChange={(v) => mutate((d) => { d.social_networks![i].username = v; })}
                        />
                      </div>
                    </ItemRow>
                  ))}
                </SectionCard>

                {visibleSections(sections).map(([key, items]) => (
                  <SectionCard
                    key={key}
                    icon={sectionIcon(key)}
                    title={prettify(key)}
                    count={items.length}
                    onAdd={() =>
                      mutate((d) => {
                        const list = d.sections![key];
                        const template =
                          typeof list[0] === "string"
                            ? ""
                            : blankItem(list[0] as Record<string, unknown>);
                        list.push(template);
                      })
                    }
                  >
                    {items.length === 0 && <EmptyHint label={prettify(key).toLowerCase()} />}
                    {items.map((item, i) => (
                      <ItemRow
                        key={i}
                        onRemove={() => mutate((d) => { d.sections![key].splice(i, 1); })}
                      >
                        {typeof item === "string" ? (
                          <Field
                            label="Text"
                            multiline
                            value={item}
                            onChange={(v) => mutate((d) => { d.sections![key][i] = v; })}
                          />
                        ) : (
                          <ObjectEditor
                            obj={item}
                            onFieldChange={(fk, fv) =>
                              mutate((d) => {
                                (d.sections![key][i] as Record<string, unknown>)[fk] = fv;
                              })
                            }
                            onArrayChange={(fk, arrIdx, fv) =>
                              mutate((d) => {
                                const arr = (d.sections![key][i] as Record<string, unknown>)[
                                  fk
                                ] as string[];
                                arr[arrIdx] = fv;
                              })
                            }
                            onArrayAdd={(fk) =>
                              mutate((d) => {
                                const arr = (d.sections![key][i] as Record<string, unknown>)[
                                  fk
                                ] as string[];
                                arr.push("");
                              })
                            }
                            onArrayRemove={(fk, arrIdx) =>
                              mutate((d) => {
                                const arr = (d.sections![key][i] as Record<string, unknown>)[
                                  fk
                                ] as string[];
                                arr.splice(arrIdx, 1);
                              })
                            }
                          />
                        )}
                      </ItemRow>
                    ))}
                  </SectionCard>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: live preview ──────────────────────────────────────────── */}
        <div className="flex-1 bg-muted/30 overflow-y-auto min-h-0">
          <div className="px-5 py-3 border-b border-border/60 sticky top-0 bg-muted/30 backdrop-blur-sm z-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
              Live Preview
            </p>
          </div>
          <div className="p-6 lg:p-10">
            {cv ? (
              <ResumePreview cv={cv} />
            ) : (
              <EmptyState status={session.status} />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function ShippedPage() {
  return (
    <Suspense fallback={null}>
      <ShippedInner />
    </Suspense>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────
function blankItem(template: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(template)) {
    out[k] = Array.isArray(v) ? [] : "";
  }
  return out;
}

function EmptyState({ status }: { status: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
      <FileText className="h-8 w-8 text-muted-foreground/50" />
      <p className="text-xs text-muted-foreground">
        {status === "running"
          ? "Resume is still being generated…"
          : "No draft available yet."}
      </p>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <p className="text-[11px] text-muted-foreground/70 italic py-1">
      No {label} yet — use “Add” above.
    </p>
  );
}

function AtsBadge({ score }: { score: number }) {
  const tier =
    score >= 90
      ? { label: "Strong", cls: "bg-accent text-accent-foreground border-accent" }
      : score >= 70
      ? { label: "Good", cls: "bg-accent/12 text-foreground border-accent/40" }
      : { label: "Low", cls: "bg-muted text-muted-foreground border-border" };
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 ${tier.cls}`}
      title={`ATS score: ${score} out of 100 (${tier.label})`}
    >
      <span className="text-sm font-bold tabular-nums leading-none">{score}</span>
      <span className="text-[9px] uppercase tracking-wider leading-none opacity-80">
        ATS / 100
      </span>
    </div>
  );
}

// ── editor sub-components ─────────────────────────────────────────────────────
function SectionCard({
  icon: Icon,
  title,
  count,
  children,
  onAdd,
  defaultOpen = false,
}: {
  icon: LucideIcon;
  title: string;
  count?: number;
  children: React.ReactNode;
  onAdd?: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="shrink-0 rounded-lg border border-border bg-card overflow-hidden">
      <header
        className={`flex items-center justify-between gap-2 bg-muted/40 px-3.5 py-2.5 ${
          open ? "border-b border-border" : ""
        }`}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer rounded transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
              open ? "" : "-rotate-90"
            }`}
          />
          <Icon className="h-3.5 w-3.5 text-accent flex-shrink-0" />
          <h2 className="text-xs font-bold uppercase tracking-widest truncate">{title}</h2>
          {count !== undefined && (
            <span className="text-[10px] font-mono text-muted-foreground bg-background border border-border rounded px-1.5 leading-relaxed flex-shrink-0">
              {count}
            </span>
          )}
        </button>
        {onAdd && (
          <button
            onClick={() => {
              onAdd();
              setOpen(true);
            }}
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground rounded px-1.5 py-1 flex-shrink-0 transition-colors duration-200 hover:text-accent hover:bg-accent/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        )}
      </header>
      {open && <div className="p-3.5 flex flex-col gap-3">{children}</div>}
    </section>
  );
}

function ItemRow({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="group relative rounded-md border border-border bg-background p-3 pr-10 transition-colors duration-200 hover:border-muted-foreground/40">
      <button
        onClick={onRemove}
        aria-label="Remove item"
        className="absolute top-2 right-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

const inputCls =
  "bg-background border border-border rounded-md px-2.5 py-2 text-xs font-mono transition-colors duration-200 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 placeholder:text-muted-foreground/50";

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`${inputCls} resize-y leading-relaxed`}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} h-9`}
        />
      )}
    </label>
  );
}

function ObjectEditor({
  obj,
  onFieldChange,
  onArrayChange,
  onArrayAdd,
  onArrayRemove,
}: {
  obj: Record<string, unknown>;
  onFieldChange: (key: string, value: string) => void;
  onArrayChange: (key: string, idx: number, value: string) => void;
  onArrayAdd: (key: string) => void;
  onArrayRemove: (key: string, idx: number) => void;
}) {
  const scalarKeys = Object.keys(obj).filter((k) => !Array.isArray(obj[k]));
  const arrayKeys = Object.keys(obj).filter((k) => Array.isArray(obj[k]));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3">
        {scalarKeys.map((k) => (
          <Field
            key={k}
            label={prettify(k)}
            value={String(obj[k] ?? "")}
            onChange={(v) => onFieldChange(k, v)}
          />
        ))}
      </div>
      {arrayKeys.map((k) => (
        <div key={k} className="flex flex-col gap-2 border-t border-border/60 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              {prettify(k)}
            </span>
            <button
              onClick={() => onArrayAdd(k)}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground rounded px-1.5 py-1 transition-colors duration-200 hover:text-accent hover:bg-accent/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
          {(obj[k] as string[]).map((entry, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="mt-2.5 h-1 w-1 rounded-full bg-accent flex-shrink-0" />
              <textarea
                value={String(entry ?? "")}
                onChange={(e) => onArrayChange(k, i, e.target.value)}
                rows={2}
                className={`${inputCls} flex-1 resize-y leading-relaxed`}
              />
              <button
                onClick={() => onArrayRemove(k, i)}
                aria-label="Remove entry"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── live preview ──────────────────────────────────────────────────────────────
function ResumePreview({ cv }: { cv: Cv }) {
  const contacts = [
    cv.email,
    ...(cv.social_networks ?? []).map((s) =>
      [s.network, s.username].filter(Boolean).join(": ")
    ),
    cv.location,
  ].filter(Boolean) as string[];

  return (
    <div className="max-w-3xl mx-auto bg-background border border-border rounded-lg shadow-[0_2px_24px_-8px_rgba(0,0,0,0.18)] px-10 py-9">
      {/* header */}
      <header className="text-center pb-5">
        <h1 className="text-[26px] font-bold tracking-tight leading-tight">
          {cv.name || "Unnamed"}
        </h1>
        {contacts.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            {contacts.join("   ·   ")}
          </p>
        )}
        <div className="mt-4 h-0.5 bg-accent/70 rounded-full" />
      </header>

      {/* sections */}
      <div className="flex flex-col gap-6">
        {visibleSections(cv.sections ?? {}).map(([key, items]) => (
          <section key={key}>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground pb-1.5 mb-3 border-b-2 border-foreground/15">
              {prettify(key)}
            </h2>
            <div className="flex flex-col gap-3.5">
              {sortedByDateDesc(items).map((item, i) =>
                typeof item === "string" ? (
                  <p key={i} className="text-xs leading-relaxed text-foreground/90">
                    {item}
                  </p>
                ) : (
                  <EntryPreview key={i} entry={item} />
                )
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function EntryPreview({ entry }: { entry: Record<string, unknown> }) {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = entry[k];
      if (typeof v === "string" && v.trim()) return v;
    }
    return "";
  };

  const primaryRaw = get("position", "title", "name", "degree", "area");
  const primary = parseMdLink(primaryRaw);
  const secondary = get("company", "institution", "organization", "publisher");
  const start = get("start_date");
  const end = get("end_date");
  const dateField = get("date");
  const dates = start || end ? `${start}${start && end ? " – " : ""}${end}` : dateField;
  const location = get("location");

  const bulletKey = Object.keys(entry).find(
    (k) => Array.isArray(entry[k]) && (entry[k] as unknown[]).every((x) => typeof x === "string")
  );
  const bullets = bulletKey ? (entry[bulletKey] as string[]) : [];

  const shown = new Set([
    "position", "title", "name", "degree", "area",
    "company", "institution", "organization", "publisher",
    "start_date", "end_date", "date", "location", bulletKey ?? "",
  ]);
  const extras = Object.entries(entry).filter(
    ([k, v]) => !shown.has(k) && typeof v === "string" && (v as string).trim()
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-bold text-foreground">
          {primary.href ? (
            <a
              href={primary.href}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2 hover:opacity-80"
            >
              {primary.label}
            </a>
          ) : (
            primary.label
          )}
          {secondary && (
            <span className="font-normal text-muted-foreground"> — {secondary}</span>
          )}
        </p>
        {dates && (
          <p className="text-[10px] font-mono text-muted-foreground whitespace-nowrap tabular-nums text-right w-28 flex-shrink-0">
            {dates}
          </p>
        )}
      </div>
      {location && (
        <p className="text-[10px] text-muted-foreground italic">{location}</p>
      )}
      {extras.map(([k, v]) => (
        <p key={k} className="text-[11px] text-foreground/90">
          <span className="text-muted-foreground">{prettify(k)}: </span>
          {String(v)}
        </p>
      ))}
      {bullets.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-foreground/90">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-accent flex-shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
