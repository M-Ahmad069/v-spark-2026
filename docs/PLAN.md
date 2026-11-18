# V-Spark 2026 — CaptionFlow: AI Social Media Caption Generator & Scheduler

Task: single-page prototype — Gemini captions, Google Drive save/sync + scheduling, feed with edit/delete,
email notifications with customizable settings, deployed on Vercel. Must also satisfy competition rubric.

## Requirement → feature → rubric

| Task req | Feature | Rubric marks covered |
|---|---|---|
| 1 AI captions | Prompt + platform + tone → Gemini returns 3 captions with hashtags (structured JSON output) | External API (15) |
| 2 Drive + scheduler | Pick caption, pick date/time, save → row in Supabase **and** JSON file in user's Google Drive folder "CaptionFlow" (drive.file scope) | DB (20), API |
| 3 Feed | List of posts (status: scheduled / sent), edit text + time, delete (syncs Drive file) | CRUD (20), UI (10) |
| 4 Email | Settings: on/off, recipient email, lead time (at time / 15m / 1h / 1 day before), subject prefix, include hashtags; per-post notes. Supabase pg_cron hits `/api/cron` every minute → Gmail SMTP sends due emails | API, DB |
| Rubric: storage | Optional image attachment per post → Supabase Storage private bucket, signed URLs | Storage (10) |
| Rubric: auth | Firebase Auth (email/password + Google), session cookie, protected `/app` | Auth (15) |
| 5 Deploy | Vercel production URL | Deployment (15) |

## Architecture

- Next.js (App Router, TS) on Vercel. Firebase Auth client → `/api/session` verifies ID token with
  firebase-admin → httpOnly session cookie. Middleware/server checks protect `/app` and all APIs.
- Supabase Postgres + Storage accessed **only server-side** with the secret key; RLS on, no public policies.
- Gemini key server-only; per-user rate limit; Zod-validated input/output.
- Google Drive: Google sign-in with `drive.file` scope → access token kept in memory on the client,
  sent per request to the server which writes/updates/deletes the Drive file. Never stored.
- Emails: Nodemailer + Gmail app password. Cron route protected by `CRON_SECRET`; idempotent (`notified_at`).

## Data

- `posts(id, owner_id, prompt, platform, caption, hashtags[], scheduled_at, notes, image_path, drive_file_id, status, notified_at, created_at, updated_at)`
- `notification_settings(owner_id pk, enabled, email, lead_minutes, subject_prefix, include_hashtags)`

## Build order

1. Gemini key, DB schema, storage bucket, cron.  2. Auth + session.  3. Generate captions.
4. Save/schedule + Drive sync + image upload.  5. Feed edit/delete.  6. Email settings + cron sender.
7. UI polish/responsive.  8. Deploy + env vars + Firebase authorized domain.  9. README + screenshots. 10. Security check, submit.
