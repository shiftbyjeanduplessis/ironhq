# IronHQ

Professional strength coaching platform. Built for coaches and athletes who are serious about performance tracking.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase GoTrue (magic link) |
| Styling | Tailwind CSS |
| Drag & Drop | @dnd-kit/core |
| Data Fetching | @tanstack/react-query |
| Language | TypeScript |

---

## Architecture

**Two separate UX layers:**

- **Coach Layer** (`/architect`, `/roster`, `/comms`) — laptop-first, high-density desktop interface
- **Athlete Layer** (`/logger`, `/history`) — mobile-first, high-contrast, optimised for gym floor use

**Core rules:**

- `profiles.id` is the universal identity anchor (1:1 with `auth.users`)
- Planned training and actual logged training live in entirely separate tables
- All multi-table writes go through PostgreSQL `SECURITY DEFINER` RPCs
- Every business table has Row Level Security enabled with club-scoped policies

---

## Project Structure

```
ironhq/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── onboarding/page.tsx
│   ├── (coach)/
│   │   ├── layout.tsx
│   │   ├── architect/page.tsx
│   │   ├── roster/page.tsx
│   │   └── comms/page.tsx
│   ├── (athlete)/
│   │   ├── layout.tsx
│   │   ├── logger/page.tsx
│   │   └── history/page.tsx
│   ├── auth/callback/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── architect/      # Coach workout builder components
│   ├── roster/         # Compliance table and delta panel
│   ├── comms/          # Noticeboard and messaging
│   └── logger/         # Athlete set logging
├── utils/
│   └── supabase/
│       └── client.ts
├── supabase/
│   ├── migrations/
│   │   ├── 00001_schema.sql
│   │   ├── 00002_rls.sql
│   │   ├── 00003_rpcs.sql
│   │   └── 00004_views.sql
│   └── seed.sql
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- npm or pnpm
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)
- Docker Desktop (required for Supabase local)

### Step 1 — Install dependencies

```bash
npm install
```

### Step 2 — Set up Supabase locally

```bash
# Initialise (skip if supabase/ folder already exists)
npx supabase init

# Start local Supabase instance (requires Docker)
npx supabase start
```

This starts Supabase locally at:
- **Studio**: http://localhost:54323
- **API**: http://localhost:54321
- **Inbucket (email)**: http://localhost:54324

### Step 3 — Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with the values printed by `npx supabase start`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<service role key from supabase start output>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 4 — Run migrations

```bash
npx supabase db push
```

This applies all four migrations in order:
1. `00001_schema.sql` — tables, indexes, triggers, PR detection
2. `00002_rls.sql` — RLS enablement and all policies
3. `00003_rpcs.sql` — all RPCs
4. `00004_views.sql` — analytics views

### Step 5 — Create test users

1. Open Supabase Studio → http://localhost:54323
2. Go to **Authentication → Users → Add user**
3. Create: `coach@ironhq.local` (confirm email immediately)
4. Create: `athlete@ironhq.local` (confirm email immediately)
5. Copy both UUIDs from the Users table

### Step 6 — Seed the database

Open `supabase/seed.sql`, paste the UUIDs at the top:

```sql
v_coach_id   UUID := 'paste-coach-uuid-here';
v_athlete_id UUID := 'paste-athlete-uuid-here';
```

Then run the seed script in **Studio → SQL Editor**.

You should see: `✅ Seed complete. Club: ..., Coach: ..., Athlete: ...`

### Step 7 — Generate TypeScript types

```bash
npm run types:supabase
```

This generates `src/types/supabase.ts` with full type coverage for all tables and views.

### Step 8 — Start the dev server

```bash
npm run dev
```

Open http://localhost:3000

---

## Testing the full flow

### As a coach

1. Go to http://localhost:3000/login
2. Enter `coach@ironhq.local`
3. Open Inbucket at http://localhost:54324 to get the magic link
4. Click the link → you land on `/architect`
5. Drag exercises from the library into the builder
6. Select an athlete, pick a date, click **Assign Workout**

### As an athlete

1. Open a new incognito window
2. Go to http://localhost:3000/login
3. Enter `athlete@ironhq.local`
4. Get the link from Inbucket
5. Click → you land on `/logger`
6. Click **Start Workout** → log sets → click **Complete Workout**

### Verify PRs

After completing a workout, go to `/history` as the athlete. If any sets were heavier than previous bests, a PR entry will appear in the timeline. The PR detection runs automatically via the PostgreSQL trigger.

### Verify delta

Go back to the coach window → `/roster`. Click the athlete row. The delta panel shows planned vs actual volume for each exercise.

---

## Invite flow

To test the invite flow (rather than seeding directly):

```sql
-- Run in SQL Editor as the coach
INSERT INTO invites (club_id, invited_email, intended_role, expires_at)
VALUES (
  '<your-club-id-from-seed>',
  'newathelete@ironhq.local',
  'athlete',
  NOW() + INTERVAL '7 days'
);

-- Get the invite token
SELECT invite_token FROM invites WHERE invited_email = 'newathlete@ironhq.local';
```

Then go to:
```
http://localhost:3000/auth/callback?invite_token=<token>
```

After signing up with magic link, the user hits `/onboarding`, enters their name, and is routed to `/logger`.

---

## Deployment (Supabase Cloud + Vercel)

### Database

```bash
# Link to your remote project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations to production
npx supabase db push
```

### Environment variables (Vercel)

Add these in Vercel → Project Settings → Environment Variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your project URL from Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key from Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (mark as sensitive) |
| `NEXT_PUBLIC_SITE_URL` | Your production domain e.g. `https://app.ironhq.com` |

### Supabase Auth redirect URL

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://app.ironhq.com`
- **Redirect URLs**: `https://app.ironhq.com/auth/callback`

---

## Known issues and notes

| Issue | Status | Notes |
|---|---|---|
| `coach_roster_compliance` athletes with zero workouts | Fixed in `00004_views.sql` | Uses `cm.club_id` not `aw.club_id` |
| Onboarding `useSearchParams` Suspense boundary | Fixed in `onboarding/page.tsx` | Wrapped in `<Suspense>` |
| Roster table invalid Tailwind classes | Fixed in `RosterClient.tsx` | Explicit `col-span-*` values |
| `coach_delta_report` view bypasses RLS | Mitigated | Server component always filters by `club_id`. Direct API access is unprotected — add `security_invoker` for extra hardening |
| Middleware fetches profile on every request | Known | Acceptable at MVP scale. Long-term fix: store `primary_role` in JWT claims |
| Coach nav uses text icons | Known | Swap for `lucide-react` icons when polishing UI |
| No `loading.tsx` skeleton screens | Known | Add per-route loading states for production |

---

## Sprint roadmap

| Phase | Status | Description |
|---|---|---|
| 1 — Foundation | ✅ Done | Schema, RLS, RPCs, migrations |
| 2A — Architect | ✅ Done | Coach workout builder |
| 2B — Auth | ✅ Done | Login, invite, onboarding |
| 2C — Logger | ✅ Done | Athlete set logging |
| 2D — Roster / Delta | ✅ Done | Compliance table, planned vs actual |
| 3 — Comms | ✅ Done | Noticeboard, direct messaging |
| 4 — Billing toggle | ✅ Done | Manual billing status on roster |
| 5 — Multi-week programs | Not started | Full program template builder UI |
| 6 — Payment integration | Not started | Business model TBD |
| 7 — Admin panel | Not started | Support and troubleshooting interface |
