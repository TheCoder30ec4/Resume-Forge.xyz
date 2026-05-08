# Frontend Build Prompt — ResumeBuilder

You are building the frontend for an AI resume builder. The Python backend already exists: a LangGraph workflow (deepagents on Groq/Anthropic) that takes a job description plus the user's GitHub + LinkedIn data and produces a tailored RenderCV YAML + PDF. Your job is the entire user-facing app: auth, integrations, JD intake, the workflow run with streaming progress, an interactive draft editor, profile/BYOK key management, resume history, and the subscription/credit paywall.

## Stack

- **Framework**: Next.js 15 App Router (TypeScript, RSC where useful, Server Actions for mutations).
- **Styling**: Tailwind + shadcn/ui (Radix primitives). No custom CSS unless unavoidable.
- **Auth**: Auth.js (NextAuth v5) with Email magic-link + Google OAuth providers.
- **DB/ORM**: Postgres + Prisma. Schemas live in `prisma/schema.prisma`.
- **OAuth integrations**: GitHub (read public repos + READMEs), LinkedIn (profile import; if LinkedIn OAuth scope is gated, fall back to "paste profile URL → Apify scrape" via the existing backend tool).
- **Payments**: Razorpay (target market is INR ₹50 pricing). Webhooks on `/api/webhooks/razorpay` to flip subscription state and grant credits.
- **Backend bridge**: The Python workflow is exposed via FastAPI. The Next.js app calls it for `/run` (SSE stream of node progress + final YAML), `/render` (re-render YAML with a new theme), `/parse-linkedin` (Apify fallback). Auth between Next.js and FastAPI uses a signed JWT carrying the user id.
- **State**: Server state via TanStack Query; client state minimal (Zustand only for the draft editor's local edits).
- **Streaming UI**: SSE consumed via `EventSource`; render each LangGraph node's status as a stepper.

## Pages and routes

```
/                              public landing (hero, feature list, pricing, CTA → sign in)
/login                         magic-link form + Google button
/dashboard                     authed home: "New resume" CTA + recent runs list
/connect/github                OAuth start; on callback store access token + repo list
/connect/linkedin              OAuth start OR paste-URL fallback; store profile snapshot
/profile                       user details + BYOK (per-provider) + plan + billing portal
/resume/new                    JD intake: paste JD or upload file; theme picker; "Generate"
/resume/[id]                   draft view: streaming progress → editor → preview → download
/resume/[id]/edit              full-screen YAML/markdown editor with live PDF preview
/history                       all of user's prior runs (free: 1 visible, pro: unlimited)
/pricing                       paywall + checkout
/api/auth/[...nextauth]
/api/integrations/github/*
/api/integrations/linkedin/*
/api/run                       proxies SSE from FastAPI
/api/render                    POST { yamlId, theme } → triggers re-render
/api/checkout/subscribe        creates Razorpay subscription
/api/checkout/credits          creates Razorpay one-time order (5-resume credit pack)
/api/webhooks/razorpay         payment events
```

## Data model (Prisma)

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String?
  image           String?
  plan            Plan     @default(FREE)              // FREE | PRO
  subscriptionId  String?  // Razorpay subscription id
  resumeCredits   Int      @default(0)                  // for "no API key" purchases
  createdAt       DateTime @default(now())

  apiKeys         ApiKey[]
  integrations    Integration[]
  resumes         Resume[]
}

enum Plan { FREE PRO }

model ApiKey {
  id        String   @id @default(cuid())
  userId    String
  provider  Provider                                     // ANTHROPIC | OPENAI | GROQ | GOOGLE
  // Encrypted at rest with libsodium sealed box; key never returned to client after create
  ciphertext Bytes
  nonce      Bytes
  label      String?                                     // user-friendly nickname
  createdAt  DateTime @default(now())
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, provider])
}

enum Provider { ANTHROPIC OPENAI GROQ GOOGLE }

model Integration {
  id          String   @id @default(cuid())
  userId      String
  kind        IntegrationKind                            // GITHUB | LINKEDIN
  accessToken String                                     // encrypted
  refreshToken String?                                   // encrypted
  expiresAt   DateTime?
  metadata    Json                                       // GH username, repo IDs allowlisted, LinkedIn URL
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, kind])
}

enum IntegrationKind { GITHUB LINKEDIN }

model Resume {
  id            String   @id @default(cuid())
  userId        String
  title         String                                    // derived from JD's job title
  jdText        String   @db.Text
  yaml          String   @db.Text                          // assembled cv: + design: + locale: + settings:
  pdfUrl        String?                                    // S3/R2 URL after render
  theme         String   @default("sb2nov")
  atsScore      Float?
  atsReport     String?  @db.Text
  status        RunStatus @default(QUEUED)
  modelUsed     String                                     // e.g. "anthropic/claude-opus-4-7"
  costCents     Int      @default(0)                       // for cost tracking
  createdAt     DateTime @default(now())
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum RunStatus { QUEUED RUNNING NEEDS_REVIEW COMPLETED FAILED }
```

## Page-by-page UX requirements

### Landing (`/`)
Hero ("Tailor your resume to any job in 60 seconds"), three-step explainer (Connect → Paste JD → Edit & download), social proof slot, pricing table, footer.

### Login (`/login`)
Magic link first, Google second. After auth, route to `/dashboard` if integrations + at least one API key OR resume credits exist; otherwise to a `/onboarding` flow that walks through Connect GitHub → Connect LinkedIn → Add an API key (skippable with "I'll buy credits instead").

### Dashboard (`/dashboard`)
- Big "New resume" button → `/resume/new`.
- Cards showing the most recent 3 runs (title, JD snippet, ATS score, status pill, "Open" / "Download PDF" actions).
- Sidebar: integration health (green check or "Reconnect"), plan badge, credits remaining.
- Free user with one existing resume: dashboard shows the existing resume read-only and the "New resume" button is replaced with "Upgrade to Pro to save more".

### Connect GitHub (`/connect/github`)
OAuth via Auth.js GitHub provider with `read:user repo` scope. After callback, fetch the user's repos, present a checkbox list, store the allowlist in `Integration.metadata.repoAllowlist`. The backend's GitHub agent reads this allowlist instead of pulling all repos.

### Connect LinkedIn (`/connect/linkedin`)
Two-tier:
1. Try LinkedIn OAuth (basic profile scope only). If successful, snapshot profile + store handle.
2. If LinkedIn OAuth scope is unavailable (common on hobby apps), show a paste-URL form. Backend route `/api/integrations/linkedin/scrape` calls FastAPI's existing `get_linkedin` tool (Apify) and stores the snapshot in `Integration.metadata.profile`.

### Profile (`/profile`)
- **Identity**: name, email (read-only), avatar upload, location, default theme.
- **API keys (BYOK)**: per-provider rows (Anthropic, OpenAI, Groq, Google). Each row: provider logo, "Add key" button or "Connected ••••" with rotate / delete. Adding a key opens a modal that POSTs the plaintext key to `/api/keys` over HTTPS; server encrypts with libsodium and stores ciphertext only. Server NEVER returns the plaintext after creation.
- **Plan**: current plan, next billing date, manage subscription button (opens Razorpay portal), "Buy 5 resumes (₹X)" button if user wants to skip BYOK.
- **Danger zone**: disconnect integrations, delete account.

### Resume new (`/resume/new`)
- JD input: large textarea, file upload (.txt/.pdf/.docx parsed server-side), or "paste from URL" with a server-side fetch.
- Optional: user_input textarea ("Anything specific you want emphasized? Projects to pin/exclude?").
- Theme picker: visual cards for sb2nov / classic / moderncv / engineeringresumes / engineeringclassic.
- Model picker (only shown if user has multiple BYOK providers): Anthropic Claude Opus 4.7 / Sonnet 4.6 / OpenAI / Groq Qwen.
- "Generate" button — disabled until JD ≥ 200 chars and at least one integration connected and (BYOK key OR credit available).
- On click → POST `/api/run` → redirect to `/resume/[id]` immediately with `status=QUEUED`.

### Resume detail (`/resume/[id]`) — the streaming + draft view
Three phases on the same page (no full reloads):

1. **Running phase** — vertical stepper showing each LangGraph node:
   - JD analysis → GitHub agent → LinkedIn agent → Gap analysis → Resume writer → ATS validator → (retry loop indicator if attempt > 1) → Render.
   - SSE-driven; each node lights up as it transitions QUEUED → RUNNING → DONE. Show the deepagent's intermediate text streams under each step (collapsible).

2. **Review phase** (status = NEEDS_REVIEW): the diagram's "User review" node.
   - Two-pane layout: left = editable section list (Summary, Experience entries, Projects, Skills, Education) with inline rich-text editing; right = live PDF preview re-rendered on debounced edits via `/api/render`.
   - Highlight chip overlay on each bullet showing which JD keywords it covers + an ATS score gauge in the header. User can edit any text. "Regenerate this section" button per section.
   - "Accept & Download" button finalizes and sets status COMPLETED.

3. **Completed phase** — read-only view with download buttons for PDF and YAML, "Re-render with different theme" dropdown, "Duplicate to new run" button.

### Resume edit (`/resume/[id]/edit`)
Power-user mode. Monaco editor with YAML schema validation (use the rendercv schema), live PDF preview on the right. Save persists to `Resume.yaml`, triggers re-render.

### History (`/history`)
Table view of all resumes. Columns: title, JD snippet, theme, ATS score, model used, cost, created date, actions (open/download/delete/duplicate). Free users see the row but Open/Download is gated for all but the most recent — clicking shows the upgrade modal.

### Pricing (`/pricing`)
Three tiers as cards:

| Tier | Price | Includes |
|---|---|---|
| **Free** | ₹0 | 1 active resume saved at a time. BYOK required. |
| **Pro (subscription)** | ₹50/mo | Unlimited saved resumes, full history, theme switching, priority queue. BYOK still required. |
| **Pay-per-resume credits** | ₹X for 5 resumes | Use OUR API key (Opus 4.7). No subscription. Credits never expire. |

Each card has a "Choose" button that triggers the appropriate Razorpay flow. Show a comparison row at the bottom ("What's BYOK?" tooltip).

## Auth & access control

- Auth.js middleware in `middleware.ts` protects everything under `/dashboard`, `/resume`, `/profile`, `/history`. Redirect unauth → `/login`.
- API routes check session via `auth()` and return 401 with JSON if missing.
- All write endpoints take a CSRF token (Auth.js provides).
- Rate limiting: Upstash Redis sliding window — 10 runs/hour per user on free, 60/hour on pro.

## API key encryption

- Use libsodium's sealed-box (or `node:crypto` AES-GCM with a 32-byte master key in `KEY_ENCRYPTION_KEY` env). Store nonce + ciphertext.
- Decryption only happens server-side, in-memory, when forwarding the key to FastAPI via the JWT payload's `model_provider` + `api_key` claim. Never log keys.
- On account deletion, hard-delete all `ApiKey` rows.

## Workflow invocation contract (Next.js → FastAPI)

```
POST /run
Authorization: Bearer <jwt with userId>
{
  "resumeId": "cuid",
  "jd": "...",
  "userInput": null,
  "theme": "sb2nov",
  "model": { "provider": "anthropic", "name": "claude-opus-4-7", "apiKey": "sk-ant-..." },
  "github": { "username": "...", "repoAllowlist": ["repo-a", "repo-b"] },
  "linkedin": { "profileSnapshot": {...} }
}

← SSE stream:
event: node_start    data: { "node": "jd" }
event: node_text     data: { "node": "jd", "delta": "..." }
event: node_done     data: { "node": "jd", "output": {...} }
... one set per workflow node ...
event: ats_attempt   data: { "attempt": 1, "score": 0.62 }
event: needs_review  data: { "yaml": "...", "atsScore": 0.91, "atsReport": "..." }
event: completed     data: { "pdfUrl": "https://r2.../resume.pdf" }
event: error         data: { "node": "github", "message": "..." }
```

The Next.js `/api/run` route opens an EventSource to FastAPI, restreams to the browser, and writes intermediate state to Postgres so a refresh can resume the view.

## Cost guardrails (since Opus 4.7 is expensive)

- For credit-paid runs (using OUR key), default to Claude Opus 4.7 ONLY for `ResumeWriteAgent` and `GapAnalysisAgent` (the high-quality steps). Use Claude Haiku 4.5 for `JDNode`, `GithubNode` select/summarize sub-steps, `LinkedinNode`, `ATSValidatorNode`. Configure this in the FastAPI side; the frontend just sends `model: { policy: "credit_default" }` and the backend handles routing.
- Estimated cost per credit-paid resume should stay under ₹X (compute by sampling 5 production runs and averaging input/output tokens; back-solve so 5 resumes ≤ price).
- Display estimated cost on the resume detail page.

## Component checklist (`components/`)

```
components/
  marketing/Hero.tsx, Pricing.tsx, FeatureGrid.tsx
  auth/LoginForm.tsx, OAuthButtons.tsx
  dashboard/RecentResumes.tsx, IntegrationHealth.tsx, PlanBadge.tsx, CreditCounter.tsx
  integrations/GithubRepoPicker.tsx, LinkedinConnectModal.tsx
  resume/JDIntakeForm.tsx, ThemePicker.tsx, ModelPicker.tsx
  resume/RunStepper.tsx, NodeStatus.tsx, AtsScoreGauge.tsx
  resume/SectionEditor.tsx, BulletEditor.tsx, KeywordChips.tsx
  resume/PdfPreview.tsx (iframe to /api/render?id=)
  resume/YamlEditor.tsx (Monaco)
  profile/ApiKeyManager.tsx, ApiKeyAddModal.tsx, ProfileForm.tsx
  billing/CheckoutButton.tsx, PlanCards.tsx
  shared/AppShell.tsx, Sidebar.tsx, EmptyState.tsx, Toast.tsx
```

## Acceptance criteria

- [ ] A new user can sign up, connect GitHub + LinkedIn, add an Anthropic key, paste a JD, and see a tailored PDF inside the same session.
- [ ] A free user is hard-blocked from saving a 2nd resume; the upgrade modal appears with both subscription and credit-pack CTAs.
- [ ] BYOK keys round-trip through encryption: stored as ciphertext, decrypted only at request time, never logged.
- [ ] The streaming view shows each node lighting up in order, including the ATS retry loop (max 2 attempts).
- [ ] Editing a bullet in the review pane updates the PDF preview within 2 seconds.
- [ ] Theme switching on a completed resume re-renders without re-running the LLM pipeline (calls FastAPI `/render` with the existing YAML).
- [ ] All Razorpay flows work in test mode end-to-end (subscription create → webhook → plan flip; credits purchase → webhook → counter increment).
- [ ] Lighthouse: Perf ≥ 90, A11y = 100 on `/`, `/dashboard`, `/resume/[id]`.
- [ ] No plaintext API key ever leaves the browser via a URL or a client log; verify in Network tab.

## Out of scope (don't build)

- Cover letter generation, interview prep, salary negotiation — backend doesn't expose these yet.
- Multi-user teams / orgs — single-user only.
- Mobile native apps — responsive web is enough.
- Custom RenderCV themes / theme editor — only the 5 built-in themes.

Build it.
