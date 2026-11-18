# V-Spark 2026 — Web Development Competition Plan

Goal: 100/100. Every mark in the rubric maps to a feature below, and every feature is proven live.

## 0. The core strategy

The task statement is revealed on the day and we get **120 minutes**. Building auth, DB, storage, maps
and deployment from zero in 2 hours is where teams lose marks. So:

1. **Now (prep):** build a complete, deployed, secured, documented **starter** with every rubric item already
   working on a generic "Items" resource (title, description, category, location, image).
2. **On the day:** rename/reshape "Items" into the task's domain (e.g. "Properties", "Events", "Clinics"),
   add the task-specific features, redeploy, screenshot, submit.

> ⚠️ Confirm with organizers that a self-made starter/boilerplate is allowed (rule 19 forbids copying
> *others*, not your own prep — but ask). If not allowed, we still rehearse the exact build so it takes ~60 min.

## 1. Rubric → feature map

| # | Criterion (marks) | What we build | How judges verify |
|---|---|---|---|
| 1 | UI/UX + responsive (10) | Clean dashboard, landing, nav, empty/loading/error states, dark mode, mobile-first | Resize to phone, click around |
| 2 | Auth (15) | Firebase Auth: email/password + Google sign-in, register, login, logout, forgot password, **protected routes enforced on the server** | Try `/dashboard` logged out → redirect |
| 3 | DB + CRUD (20) | Supabase Postgres, `items` table, create/read/update/delete, search + filter + pagination, per-user ownership | Create, edit, delete, refresh — data persists |
| 4 | Cloud storage (10) | Supabase Storage **private** bucket, image upload with type/size checks, retrieval via short-lived signed URLs | Upload image, view it, try URL after expiry |
| 5 | External API (15) | **Google Maps**: Places autocomplete for address, map with markers for all items, geocoding; graceful error UI if API fails | Pick address, see marker, kill key → friendly error |
| 6 | Deployment (15) | Vercel production URL, env vars set, Firebase authorized domain, works end to end | Open URL on their phone |
| 7 | Code quality (5) | TypeScript strict, Zod validation on every input, central error handling, lint clean, small modules | AI/code review of GitHub |
| 8 | Docs (5) | README: overview, tech, architecture diagram, setup, **env var names**, integrations, deployment, **screenshots of every process**, student details | Read README |
| 9 | Live demo (5) | Rehearsed 3-min demo script + Q&A cheat sheet | Ask questions |

## 2. Tech stack (boring, proven, Vercel-native)

- **Next.js (App Router) + TypeScript strict** — one repo, frontend + backend, deploys to Vercel in one step.
- **Tailwind CSS + shadcn/ui** — fast, accessible, consistent UI.
- **Firebase Authentication** — required by rule 7. Client SDK for sign-in; **firebase-admin** on the server.
- **Supabase Postgres** — real database (rule 8).
- **Supabase Storage** — file uploads (rule 9).
- **Google Maps JavaScript API + Places + Geocoding** — the named external API.
- **Zod** (validation), **React Hook Form** (forms), **sonner** (toasts).
- **Vitest** for unit tests on validation and auth helpers; **Playwright** smoke test of the main flow.

## 3. Security architecture ("as protected as possible")

Firebase handles identity; Supabase handles data. They are joined **only on our server**:

```
Browser ──Firebase sign-in──▶ Firebase Auth
   │ ID token
   ▼
Next.js /api/session ── firebase-admin verifies token ──▶ sets httpOnly, Secure, SameSite=Lax session cookie
   │
Middleware: no valid session cookie → redirect to /login (protected routes)
   │
Server actions / route handlers: verify session cookie → uid
   ▼
Supabase (service-role key, SERVER ONLY) — every query scoped by owner_id = uid
```

Defense in depth:
- **RLS enabled on every table and on storage with no public policies** → even a leaked anon key can read/write nothing.
- Service-role key, Firebase admin key and Maps server key live **only** in Vercel env vars; never `NEXT_PUBLIC_`.
- Browser Maps key **restricted by HTTP referrer** (localhost + Vercel domain) and to the Maps/Places APIs only.
- Every input validated with Zod on the server (never trust the client); length limits; ownership checked on update/delete.
- Uploads: allow-list MIME (jpeg/png/webp), max 5 MB, random UUID filenames under `uid/`, private bucket, signed URLs (expiry ~1 h).
- Session cookie revoked on logout (`revokeRefreshTokens`) and cleared.
- Security headers via `next.config`: CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS.
- Basic rate limiting on auth/session and write endpoints.
- `.env*` in `.gitignore`, `.env.example` with names only; pre-submit secret scan (`git grep` + gitleaks).
- No `dangerouslySetInnerHTML`; React escapes output (XSS); parameterized queries via supabase-js (no SQL injection).

## 4. Data model (starter)

```sql
items (
  id uuid pk default gen_random_uuid(),
  owner_id text not null,            -- Firebase uid
  title text not null check (char_length(title) between 3 and 120),
  description text check (char_length(description) <= 2000),
  category text not null,
  address text, lat double precision, lng double precision,
  image_path text,                    -- path in private bucket
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
index on (owner_id, created_at desc)
```
Optional `profiles (uid pk, display_name, avatar_path)` for a profile page (extra polish).
Applied via migration files in `supabase/migrations` so the schema is in GitHub.

## 5. Pages

- `/` landing (hero, features, CTA) · `/login` · `/register` · `/forgot-password`
- `/dashboard` stats cards + recent items + map overview (protected)
- `/items` list with search, filter, pagination · `/items/new` · `/items/[id]` detail with map + image · `/items/[id]/edit`
- `/map` all items on Google Map with info windows
- `/profile` name + avatar upload (second storage use)
- Polished 404, error boundary, loading skeletons

## 6. Build order (thin vertical slices, each verified before the next)

| Step | Slice | Done when |
|---|---|---|
| 1 | Scaffold Next.js + TS + Tailwind + shadcn, lint, git, deploy empty app to Vercel | Live URL loads |
| 2 | Firebase auth + session cookie + middleware | Register/login/logout/protected route work live |
| 3 | Supabase schema + RLS + server CRUD | Full CRUD works live, other user can't see/edit my items |
| 4 | Storage upload + signed URLs | Upload + view image live, bad file type rejected |
| 5 | Google Maps (autocomplete, map, markers, error state) | Works live on Vercel domain |
| 6 | UI/UX polish, responsive, dark mode, states | Checked at 375px / 768px / 1440px |
| 7 | Security headers, rate limit, secret scan, security review | No findings left |
| 8 | Tests (Vitest + Playwright smoke) | Green |
| 9 | README with screenshots, `.env.example`, architecture diagram | Complete |
| 10 | Rehearsal: timed "day-of" adaptation to a mock task | ≤ 60 min |

## 7. Day-of runbook (120 min)

| Time | Action |
|---|---|
| 0–10 | Read task, map each task feature to the starter, decide names. Split work between 2 members. |
| 10–70 | Rename domain, adjust schema/migration, build task-specific features. Deploy every ~20 min. |
| 70–90 | Test every rubric item on the **live URL** + phone. Fix. |
| 90–105 | Screenshots → README, student details, final deploy. |
| 105–115 | Push GitHub, upload full folder (no ZIP, no `.env`, no `node_modules`) to Drive. |
| 115–120 | Buffer. Submit links before deadline. |

## 8. Skills used per area

| Area | Skill |
|---|---|
| Planning / spec | agent-skills |
| Every coding step | ponytail (smallest complete change) |
| Next.js / React code + speed | vercel-react-best-practices, next-dev-loop |
| UI design | frontend-design + impeccable, emil-design-eng (polish), web-design-guidelines / ux-heuristics (review) |
| Components | shadcn, vercel-composition-patterns |
| DB, migrations, RLS | supabase, supabase-postgres-best-practices |
| Security | security-review, differential-review, sharp-edges, supply-chain-risk-auditor |
| Bugs | systematic-debugging |
| Tests / browser checks | test-driven-development, webapp-testing / run |
| Deploy | vercel-cli / deploy-to-vercel |
| Final check | code-review, verification-before-completion |

## 9. "AI-judge proof" code checklist

Judges (and AI reviewers like Gemini/Claude) look for: clear folder structure, typed code, validation,
error handling, no secrets, no dead code, meaningful names, comments where logic is non-obvious,
tests, a complete README. We run `code-review` and `security-review` before submission and fix everything.

## 10. What we need from you (accounts — free tiers are fine)

- Firebase project (Auth: Email/Password + Google enabled) → web config + service account key
- Supabase project → URL, anon key, service-role key
- Google Cloud project **with billing enabled** → Maps JavaScript, Places, Geocoding APIs + key
- Vercel account linked to GitHub · GitHub repo (public at submission)
- Team names + registration numbers for the README

## 11. Risks

| Risk | Mitigation |
|---|---|
| Maps key fails on live domain | Referrer list includes Vercel domain; tested in prep |
| Firebase login fails on Vercel | Add Vercel domain to Firebase authorized domains |
| Task needs a different API too | Starter keeps an `lib/api` pattern; add one with same error handling |
| Running out of time | Deploy early and often; rubric checklist at 70 min |
| Starter not allowed | Ask organizers; rehearse the build anyway |
