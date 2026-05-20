---
name: rendercv-yaml
description: Authoritative reference for the RenderCV YAML schema — top-level keys (cv, design, locale, settings), every entry type (EducationEntry, ExperienceEntry, NormalEntry, OneLineEntry, BulletEntry, NumberedEntry, PublicationEntry, TextEntry), required vs optional fields, date formats, and rules for producing a valid YAML the rendercv CLI will accept without errors.
---

# rendercv-yaml

Use this skill when generating YAML for the `rendercv render` CLI. Producing invalid YAML wastes a writer→render→retry cycle, so always conform exactly to the schema below.

## Top-level structure

```yaml
cv:                # required — the resume content
design:            # optional — visual settings (theme, colors, fonts, margins)
locale:            # optional — language, month names, date format strings
settings:          # optional — current_date, pdf_title, bold_keywords
```

When the writer is asked to fill **only the `cv:` section**, it must NOT emit `design:`, `locale:`, or `settings:` — those come from a fixed template that is concatenated downstream.

## The `cv:` field

```yaml
cv:
  name: "Full Name"                    # required
  headline: "optional one-liner"
  location: "City, ST"
  email: "..."
  phone: "+1-555-..."
  website: "https://..."
  photo:                                # leave blank for ATS-clean
  social_networks:
    - network: LinkedIn                  # one of: LinkedIn, GitHub, GitLab, Mastodon, ORCID, ResearchGate, Stack Overflow, Telegram, X (Twitter), YouTube, Google Scholar
      username: "ch-varun"
    - network: GitHub
      username: "thecoder30ec4"
  custom_connections:                    # optional, list of {placeholder, url, fontawesome_icon}
  sections:
    <section title>:                     # arbitrary, e.g. summary, experience, projects, skills, education, publications
      - <entry — see entry types below>
```

`sections` is an ordered dict — keys are arbitrary section titles (rendered verbatim as the heading), values are lists of entries that all share the SAME entry type.

## Entry types (pick the right one for each section)

### EducationEntry — for school/degree records

```yaml
- institution: "Princeton University"   # required
  area: "Computer Science"               # required
  degree: "PhD"                           # optional, e.g. BS, MS, MBA, PhD
  date:                                   # OR start_date+end_date, not both
  start_date: "2018-09"                   # YYYY or YYYY-MM
  end_date: "2023-05"                     # or "present"
  location: "Princeton, NJ"
  summary: "optional 1-line"
  highlights:                             # bulleted achievements
    - "GPA: 3.97/4.00"
    - "Thesis title or advisor"
```

### ExperienceEntry — for jobs

```yaml
- company: "Acme Corp"                    # required
  position: "Senior Engineer"             # required
  start_date: "2023-06"
  end_date: "present"
  location: "San Francisco, CA"
  summary:                                 # rare — usually use highlights only
  highlights:
    - "XYZ-format bullet 1"
    - "XYZ-format bullet 2"
```

### NormalEntry — for projects, side work, anything that needs a title + dates + bullets

```yaml
- name: "[FlashInfer](https://github.com/...)"   # required, supports markdown link
  date: "2023-01"
  start_date:
  end_date:
  location:
  summary: "Open-source library for high-performance LLM inference kernels"
  highlights:
    - "Achieved 2.8x speedup over baseline on A100 GPUs"
    - "8,500+ GitHub stars, 200+ contributors"
```

### PublicationEntry — for papers

```yaml
- title: "Sparse Mixture-of-Experts at Scale"   # required
  authors:                                       # required, list
    - "*Self*"                                    # wrap own name in italic
    - "Co-author"
  doi: "10.1234/neurips.2023.1234"
  url:
  journal: "NeurIPS 2023"
  date: "2023-07"
```

### OneLineEntry — for skills, languages, tools

```yaml
- label: "Languages"                      # required
  details: "Python, C++, CUDA, Rust"      # required
```

### BulletEntry — for honors, awards, simple lists

```yaml
- bullet: "MIT Technology Review 35 Under 35 (2024)"
```

### NumberedEntry / ReversedNumberedEntry — for numbered/reverse-numbered lists

```yaml
- number: "Patent title (US Patent 11,234,567)"
- reversed_number: "Talk title — Venue (Year)"
```

### TextEntry — plain prose

```yaml
- "Free-form sentence used for summary sections."
```

## Date formats

- `YYYY` — `"2023"`
- `YYYY-MM` — `"2023-09"`
- `"present"` — for ongoing
- Use `date:` for a single event (publication, talk); use `start_date:` + `end_date:` for spans (jobs, school)
- Never mix: use either `date` OR (`start_date` + `end_date`), not both

## Markdown inside fields

- `**bold**`, `*italic*`, `[link](url)`, `` `code` `` all work in any string field
- Use `[Project Name](https://github.com/...)` for repo names so the PDF has a clickable link

## Common validation failures (avoid these)

1. Using `ExperienceEntry` fields in a section that needs `NormalEntry` (e.g. projects). Match entry type to section content.
2. Mixing entry types within a single section's list — every entry in one section MUST be the same type.
3. Date strings in the wrong format (`"Sep 2023"` will fail; use `"2023-09"`).
4. Including a `photo:` value when ATS readability matters — leave it blank or omit.
5. Quoting markdown links incorrectly — `name: "[Repo](https://...)"` works; `name: [Repo](https://...)` does NOT.
6. Putting bullet content in `summary:` instead of `highlights:` — `summary` is one prose line, `highlights` is a list.

## Quick lookup: section title → entry type

| Section | Entry type |
|---|---|
| `summary` / `welcome` | TextEntry |
| `education` | EducationEntry |
| `experience` | ExperienceEntry |
| `projects` | NormalEntry |
| `publications` | PublicationEntry |
| `skills` / `technologies` | OneLineEntry |
| `awards` / `honors` | BulletEntry |
| `patents` | NumberedEntry |
| `talks` / `invited_talks` | ReversedNumberedEntry |
