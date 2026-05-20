"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

/* ─── Data Model ────────────────────────────────────────── */

interface ResumeData {
  name: string;
  email: string;
  location: string;
  linkedin: string;
  github: string;
  summary: string;
  experience: Array<{
    company: string;
    position: string;
    start_date: string;
    end_date: string;
    highlights: string[];
  }>;
  skills: Array<{ label: string; details: string }>;
  education: Array<{
    institution: string;
    degree: string;
    start_date: string;
    end_date: string;
  }>;
  theme: string;
}

const INITIAL_DATA: ResumeData = {
  name: "Alex Morgan",
  email: "alex@morg.dev",
  location: "San Francisco, CA",
  linkedin: "amorg",
  github: "amorg-dev",
  summary:
    "Senior frontend engineer with 7+ years shipping React at scale. Led design-system migrations across 12 surfaces and owned perf budgets for high-traffic flows.",
  experience: [
    {
      company: "Stripe",
      position: "Senior Frontend Engineer",
      start_date: "2022-01",
      end_date: "present",
      highlights: [
        "Led migration to Next.js App Router across 12 surfaces, cutting build time 41%.",
        "Built design-system tokens consumed by 40+ teams; mentored 3 junior engineers through onboarding.",
        "Cut p75 LCP by 38% via streaming SSR + image budgets.",
      ],
    },
    {
      company: "Vercel",
      position: "Frontend Engineer",
      start_date: "2020-01",
      end_date: "2022-01",
      highlights: [
        "Owned the templates marketplace (12k MAU).",
        "Authored 9 OSS examples; 3.4k stars combined.",
      ],
    },
  ],
  skills: [
    { label: "Languages", details: "TypeScript, JavaScript, Go" },
    { label: "Frameworks", details: "React, Next.js, Node.js, GraphQL" },
    { label: "Infrastructure", details: "PostgreSQL, Docker, AWS, Tailwind" },
  ],
  education: [
    {
      institution: "UC Berkeley",
      degree: "B.S. Computer Science",
      start_date: "2016-09",
      end_date: "2020-05",
    },
  ],
  theme: "sb2nov",
};

const SECTIONS = [
  { id: "header", label: "Header" },
  { id: "summary", label: "Summary" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
];

const THEMES = ["sb2nov", "classic", "modern", "compact"];

function formatDate(d: string): string {
  if (!d || d === "present") return d || "";
  const [year, month] = d.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = parseInt(month) - 1;
  if (isNaN(m) || m < 0 || m > 11) return d;
  return `${months[m]} ${year}`.trim();
}

/* ─── Inline editable text ─────────────────────────────── */

function EditableText({
  value,
  onChange,
  className,
  placeholder,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (multiline && ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value, multiline]);

  if (multiline) {
    return (
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={1}
        className={`w-full bg-transparent outline-none border-none resize-none focus:bg-[#fff8ee] rounded px-1 py-0.5 -mx-1 transition-colors ${className ?? ""}`}
        spellCheck={false}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-transparent outline-none border-none focus:bg-[#fff8ee] rounded px-1 py-0.5 -mx-1 transition-colors w-full ${className ?? ""}`}
      spellCheck={false}
    />
  );
}

/* ─── Field row (label + value) ────────────────────────── */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground w-24 flex-shrink-0 pt-1.5 font-mono">
        {label}
      </span>
      <div className="flex-1 min-w-0 text-sm">{children}</div>
    </div>
  );
}

/* ─── PDF Preview ───────────────────────────────────────── */

function PdfPreview({ data }: { data: ResumeData }) {
  const contact = [
    data.email,
    data.location,
    data.linkedin ? `linkedin.com/in/${data.linkedin}` : "",
    data.github ? `github.com/${data.github}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="bg-white text-black"
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "9.5px",
        lineHeight: "1.4",
        padding: "36px 40px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", borderBottom: "1px solid #999", paddingBottom: "8px", marginBottom: "8px" }}>
        <div style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "3px", textTransform: "uppercase" }}>
          {data.name || "YOUR NAME"}
        </div>
        <div style={{ fontSize: "8px", color: "#555", marginTop: "3px" }}>
          {contact}
        </div>
      </div>

      {data.summary && (
        <div style={{ marginBottom: "7px" }}>
          <div style={{ fontSize: "8.5px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1.5px", borderBottom: "0.5px solid #aaa", paddingBottom: "1px", marginBottom: "3px" }}>
            Summary
          </div>
          <div style={{ fontSize: "8.5px", color: "#333", lineHeight: "1.5" }}>
            {data.summary}
          </div>
        </div>
      )}

      {data.experience.length > 0 && (
        <div style={{ marginBottom: "7px" }}>
          <div style={{ fontSize: "8.5px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1.5px", borderBottom: "0.5px solid #aaa", paddingBottom: "1px", marginBottom: "4px" }}>
            Experience
          </div>
          {data.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: "bold", fontSize: "8.5px" }}>{exp.position}</div>
                <div style={{ fontSize: "8px", color: "#777", whiteSpace: "nowrap" }}>
                  {formatDate(exp.start_date)} – {formatDate(exp.end_date)}
                </div>
              </div>
              <div style={{ fontSize: "8px", color: "#555", fontStyle: "italic", marginBottom: "2px" }}>{exp.company}</div>
              {exp.highlights.map((h, j) => (
                <div key={j} style={{ display: "flex", gap: "4px", fontSize: "8.5px", color: "#333", lineHeight: "1.5", marginLeft: "4px" }}>
                  <span style={{ flexShrink: 0 }}>◦</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {data.skills.length > 0 && (
        <div style={{ marginBottom: "7px" }}>
          <div style={{ fontSize: "8.5px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1.5px", borderBottom: "0.5px solid #aaa", paddingBottom: "1px", marginBottom: "3px" }}>
            Skills
          </div>
          {data.skills.map((s, i) => (
            <div key={i} style={{ fontSize: "8.5px", color: "#333", lineHeight: "1.5" }}>
              <strong>{s.label}:</strong> {s.details}
            </div>
          ))}
        </div>
      )}

      {data.education.length > 0 && (
        <div style={{ marginBottom: "7px" }}>
          <div style={{ fontSize: "8.5px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1.5px", borderBottom: "0.5px solid #aaa", paddingBottom: "1px", marginBottom: "3px" }}>
            Education
          </div>
          {data.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: "bold", fontSize: "8.5px" }}>{edu.institution}</div>
                <div style={{ fontSize: "8px", color: "#777" }}>
                  {formatDate(edu.start_date)} – {formatDate(edu.end_date)}
                </div>
              </div>
              <div style={{ fontSize: "8px", color: "#555", fontStyle: "italic" }}>{edu.degree}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────── */

export default function EditorPage() {
  const router = useRouter();
  const [data, setData] = useState<ResumeData>(INITIAL_DATA);
  const [activeSection, setActiveSection] = useState("summary");
  const [atsScore] = useState(91);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function scrollToSection(id: string) {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ─── Helpers to update nested state ─── */
  function updateField<K extends keyof ResumeData>(key: K, value: ResumeData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function updateExp(i: number, patch: Partial<ResumeData["experience"][0]>) {
    setData((d) => ({
      ...d,
      experience: d.experience.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    }));
  }

  function updateExpHighlight(expIdx: number, hIdx: number, value: string) {
    setData((d) => ({
      ...d,
      experience: d.experience.map((e, idx) =>
        idx === expIdx
          ? { ...e, highlights: e.highlights.map((h, j) => (j === hIdx ? value : h)) }
          : e
      ),
    }));
  }

  function addExpHighlight(expIdx: number) {
    setData((d) => ({
      ...d,
      experience: d.experience.map((e, idx) =>
        idx === expIdx ? { ...e, highlights: [...e.highlights, ""] } : e
      ),
    }));
  }

  function removeExpHighlight(expIdx: number, hIdx: number) {
    setData((d) => ({
      ...d,
      experience: d.experience.map((e, idx) =>
        idx === expIdx ? { ...e, highlights: e.highlights.filter((_, j) => j !== hIdx) } : e
      ),
    }));
  }

  function addExperience() {
    setData((d) => ({
      ...d,
      experience: [
        ...d.experience,
        { company: "", position: "", start_date: "", end_date: "", highlights: [""] },
      ],
    }));
  }

  function removeExperience(i: number) {
    setData((d) => ({ ...d, experience: d.experience.filter((_, idx) => idx !== i) }));
  }

  function updateSkill(i: number, patch: Partial<ResumeData["skills"][0]>) {
    setData((d) => ({
      ...d,
      skills: d.skills.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  }

  function addSkill() {
    setData((d) => ({ ...d, skills: [...d.skills, { label: "", details: "" }] }));
  }

  function removeSkill(i: number) {
    setData((d) => ({ ...d, skills: d.skills.filter((_, idx) => idx !== i) }));
  }

  function updateEducation(i: number, patch: Partial<ResumeData["education"][0]>) {
    setData((d) => ({
      ...d,
      education: d.education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    }));
  }

  function addEducation() {
    setData((d) => ({
      ...d,
      education: [
        ...d.education,
        { institution: "", degree: "", start_date: "", end_date: "" },
      ],
    }));
  }

  function removeEducation(i: number) {
    setData((d) => ({ ...d, education: d.education.filter((_, idx) => idx !== i) }));
  }

  const sectionCounts: Record<string, number> = {
    header: 1,
    summary: 1,
    experience: data.experience.length,
    skills: data.skills.length,
    education: data.education.length,
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>

      {/* ── Top bar ── */}
      <header className="flex items-center gap-3 px-4 h-12 border-b border-border flex-shrink-0 bg-background">
        <button
          onClick={() => router.push("/shipped")}
          className="flex items-center gap-1.5 text-[11px] border border-border rounded px-2.5 py-1 hover:border-foreground transition-colors cursor-pointer font-mono"
        >
          ← Preview
        </button>

        <span className="text-sm font-bold">Senior FE @ Linear</span>

        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono border border-[#ffcc80] bg-[#fff8ee] text-[#b45309]">
          Needs review
        </span>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">ATS</span>
          <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-[#4caf50] transition-all duration-500"
              style={{ width: `${atsScore}%` }}
            />
          </div>
          <span className="text-[11px] font-bold tabular-nums">{atsScore}</span>
        </div>

        <button
          className="h-7 text-[11px] font-bold px-3 rounded cursor-pointer transition-colors duration-150"
          style={{ backgroundColor: "oklch(0.22 0.03 55)", color: "oklch(0.96 0.005 80)" }}
          onClick={() => router.push("/dashboard")}
        >
          Accept & Download ↓
        </button>
      </header>

      {/* ── Body: 3 columns ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Col 1: Sections nav ── */}
        <aside className="w-44 flex-shrink-0 border-r border-border flex flex-col overflow-y-auto py-3 font-mono">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground px-3 mb-2">
            sections
          </p>

          {SECTIONS.map((s) => {
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-left cursor-pointer transition-colors duration-150"
                style={
                  isActive
                    ? { backgroundColor: "oklch(0.96 0.01 60)", color: "oklch(0.12 0.01 60)" }
                    : {}
                }
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-150"
                    style={{
                      backgroundColor: isActive ? "oklch(0.55 0.15 25)" : "oklch(0.80 0.01 60)",
                    }}
                  />
                  <span className={isActive ? "font-bold" : ""}>{s.label}</span>
                </div>
                <span className="text-[9px] text-muted-foreground tabular-nums">
                  {sectionCounts[s.id]}
                </span>
              </button>
            );
          })}

          <hr className="my-3 border-border mx-3" />
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground px-3 mb-2">theme</p>
          <div className="px-3">
            <div className="relative">
              <select
                value={data.theme}
                onChange={(e) => updateField("theme", e.target.value)}
                className="w-full text-[11px] font-mono border border-border rounded px-2.5 py-1 bg-background appearance-none cursor-pointer focus:outline-none focus:border-foreground"
              >
                {THEMES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[9px]">∨</span>
            </div>
          </div>
        </aside>

        {/* ── Col 2: Form editor ── */}
        <main
          className="flex flex-col overflow-hidden border-r border-border"
          style={{ width: "calc((100% - 11rem) / 2)", minWidth: 0 }}
        >
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border flex-shrink-0 bg-background">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">editor</span>
            <span className="text-[9px] text-muted-foreground font-mono">·</span>
            <span className="text-[9px] text-muted-foreground font-mono">click any text to edit</span>
            <div className="flex-1" />
            <button className="flex items-center gap-1 text-[10px] border border-border rounded px-2 py-0.5 hover:border-foreground transition-colors cursor-pointer font-mono">
              ↻ Regenerate
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">

            {/* ── Header section ── */}
            <section
              ref={(el) => { sectionRefs.current["header"] = el; }}
              className="mb-8"
            >
              <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 pb-1 border-b border-border font-mono">
                Header
              </h2>
              <Field label="Name">
                <EditableText
                  value={data.name}
                  onChange={(v) => updateField("name", v)}
                  className="text-base font-bold"
                  placeholder="Your name"
                />
              </Field>
              <Field label="Email">
                <EditableText
                  value={data.email}
                  onChange={(v) => updateField("email", v)}
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="Location">
                <EditableText
                  value={data.location}
                  onChange={(v) => updateField("location", v)}
                  placeholder="City, Country"
                />
              </Field>
              <Field label="LinkedIn">
                <EditableText
                  value={data.linkedin}
                  onChange={(v) => updateField("linkedin", v)}
                  placeholder="username"
                />
              </Field>
              <Field label="GitHub">
                <EditableText
                  value={data.github}
                  onChange={(v) => updateField("github", v)}
                  placeholder="username"
                />
              </Field>
            </section>

            {/* ── Summary ── */}
            <section
              ref={(el) => { sectionRefs.current["summary"] = el; }}
              className="mb-8"
            >
              <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 pb-1 border-b border-border font-mono">
                Summary
              </h2>
              <div className="border border-border rounded-lg p-3 bg-card">
                <EditableText
                  value={data.summary}
                  onChange={(v) => updateField("summary", v)}
                  className="text-sm leading-relaxed"
                  placeholder="Brief description of your background…"
                  multiline
                />
              </div>
            </section>

            {/* ── Experience ── */}
            <section
              ref={(el) => { sectionRefs.current["experience"] = el; }}
              className="mb-8"
            >
              <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 pb-1 border-b border-border font-mono">
                Experience
              </h2>
              <div className="flex flex-col gap-4">
                {data.experience.map((exp, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 bg-card relative group">
                    <button
                      onClick={() => removeExperience(i)}
                      className="absolute top-2 right-2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity cursor-pointer font-mono"
                      title="Remove"
                    >
                      ⌫ remove
                    </button>
                    <Field label="Company">
                      <EditableText
                        value={exp.company}
                        onChange={(v) => updateExp(i, { company: v })}
                        className="font-bold"
                        placeholder="Company name"
                      />
                    </Field>
                    <Field label="Position">
                      <EditableText
                        value={exp.position}
                        onChange={(v) => updateExp(i, { position: v })}
                        placeholder="Your role"
                      />
                    </Field>
                    <Field label="Start">
                      <EditableText
                        value={exp.start_date}
                        onChange={(v) => updateExp(i, { start_date: v })}
                        placeholder="YYYY-MM"
                      />
                    </Field>
                    <Field label="End">
                      <EditableText
                        value={exp.end_date}
                        onChange={(v) => updateExp(i, { end_date: v })}
                        placeholder="YYYY-MM or present"
                      />
                    </Field>

                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">
                        Highlights
                      </p>
                      <div className="flex flex-col gap-2">
                        {exp.highlights.map((h, j) => (
                          <div key={j} className="flex items-start gap-2 group/h">
                            <span className="text-muted-foreground pt-0.5 flex-shrink-0">•</span>
                            <div className="flex-1 min-w-0">
                              <EditableText
                                value={h}
                                onChange={(v) => updateExpHighlight(i, j, v)}
                                className="text-sm leading-relaxed"
                                placeholder="Achievement or responsibility"
                                multiline
                              />
                            </div>
                            <button
                              onClick={() => removeExpHighlight(i, j)}
                              className="text-[10px] text-muted-foreground opacity-0 group-hover/h:opacity-100 hover:text-destructive transition-opacity cursor-pointer flex-shrink-0 mt-1 font-mono"
                            >
                              ⌫
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addExpHighlight(i)}
                          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left ml-4 mt-1 font-mono"
                        >
                          + add highlight
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addExperience}
                  className="border border-dashed border-border rounded-lg p-3 text-xs text-muted-foreground hover:border-foreground hover:text-foreground transition-colors cursor-pointer text-center font-mono"
                >
                  + add experience
                </button>
              </div>
            </section>

            {/* ── Skills ── */}
            <section
              ref={(el) => { sectionRefs.current["skills"] = el; }}
              className="mb-8"
            >
              <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 pb-1 border-b border-border font-mono">
                Skills
              </h2>
              <div className="flex flex-col gap-2">
                {data.skills.map((s, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 bg-card flex items-start gap-2 group">
                    <div className="flex-1 min-w-0">
                      <Field label="Category">
                        <EditableText
                          value={s.label}
                          onChange={(v) => updateSkill(i, { label: v })}
                          className="font-bold"
                          placeholder="e.g. Languages"
                        />
                      </Field>
                      <Field label="Details">
                        <EditableText
                          value={s.details}
                          onChange={(v) => updateSkill(i, { details: v })}
                          placeholder="comma-separated list"
                          multiline
                        />
                      </Field>
                    </div>
                    <button
                      onClick={() => removeSkill(i)}
                      className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity cursor-pointer flex-shrink-0 font-mono"
                    >
                      ⌫
                    </button>
                  </div>
                ))}
                <button
                  onClick={addSkill}
                  className="border border-dashed border-border rounded-lg p-3 text-xs text-muted-foreground hover:border-foreground hover:text-foreground transition-colors cursor-pointer text-center font-mono"
                >
                  + add skill category
                </button>
              </div>
            </section>

            {/* ── Education ── */}
            <section
              ref={(el) => { sectionRefs.current["education"] = el; }}
              className="mb-8"
            >
              <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 pb-1 border-b border-border font-mono">
                Education
              </h2>
              <div className="flex flex-col gap-2">
                {data.education.map((edu, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 bg-card relative group">
                    <button
                      onClick={() => removeEducation(i)}
                      className="absolute top-2 right-2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity cursor-pointer font-mono"
                    >
                      ⌫ remove
                    </button>
                    <Field label="Institution">
                      <EditableText
                        value={edu.institution}
                        onChange={(v) => updateEducation(i, { institution: v })}
                        className="font-bold"
                        placeholder="School name"
                      />
                    </Field>
                    <Field label="Degree">
                      <EditableText
                        value={edu.degree}
                        onChange={(v) => updateEducation(i, { degree: v })}
                        placeholder="e.g. B.S. Computer Science"
                      />
                    </Field>
                    <Field label="Start">
                      <EditableText
                        value={edu.start_date}
                        onChange={(v) => updateEducation(i, { start_date: v })}
                        placeholder="YYYY-MM"
                      />
                    </Field>
                    <Field label="End">
                      <EditableText
                        value={edu.end_date}
                        onChange={(v) => updateEducation(i, { end_date: v })}
                        placeholder="YYYY-MM"
                      />
                    </Field>
                  </div>
                ))}
                <button
                  onClick={addEducation}
                  className="border border-dashed border-border rounded-lg p-3 text-xs text-muted-foreground hover:border-foreground hover:text-foreground transition-colors cursor-pointer text-center font-mono"
                >
                  + add education
                </button>
              </div>
            </section>

            <div className="h-16" />
          </div>
        </main>

        {/* ── Col 3: Live preview ── */}
        <aside
          className="hidden lg:flex flex-col overflow-hidden bg-[#f0ede8]"
          style={{ width: "calc((100% - 11rem) / 2)" }}
        >
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border flex-shrink-0 bg-background">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">preview</span>
            <span className="text-[9px] text-muted-foreground font-mono">·</span>
            <span className="text-[9px] font-bold uppercase font-mono">{data.theme}</span>
            <div className="flex-1" />
            <span className="text-[9px] text-muted-foreground font-mono">live</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div
              className="shadow-md border border-[#d6d3ce] mx-auto"
              style={{ width: "100%", boxSizing: "border-box" }}
            >
              <PdfPreview data={data} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
