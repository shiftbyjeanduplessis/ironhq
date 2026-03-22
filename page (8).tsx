# IronHQ — From-Scratch Setup Guide

Follow these steps exactly, in order. Each step has a success check
so you know it worked before moving on.

---

## Prerequisites

Install these before starting:

| Tool | Version | Check |
|---|---|---|
| Node.js | 20+ | `node -v` |
| npm | 10+ | `npm -v` |
| Supabase CLI | latest | `npx supabase -v` |
| Docker Desktop | latest | Must be running |
| Git | any | `git -v` |

---

## Step 1 — Create the Next.js project

```bash
# Create the project
npx create-next-app@latest ironhq \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd ironhq
```

✅ **Check:** `ls` shows `app/`, `package.json`, `tailwind.config.ts`

---

## Step 2 — Copy the IronHQ files

Copy all files from the output folder into the `ironhq/` directory,
preserving the folder structure. The output folder contains:

```
.env.example
README.md
middleware.ts
next.config.ts          ← replaces next.config.js created by scaffold
package.json            ← replaces the one created by scaffold
postcss.config.js
tailwind.config.ts      ← replaces tailwind.config.ts created by scaffold
tsconfig.json           ← replaces tsconfig.json created by scaffold

app/
  globals.css           ← replaces app/globals.css created by scaffold
  layout.tsx            ← replaces app/layout.tsx created by scaffold
  page.tsx              ← replaces app/page.tsx created by scaffold
  (auth)/...
  (coach)/...
  (athlete)/...
  (admin)/...
  auth/callback/route.ts

components/
  architect/
  logger/
  roster/
  comms/
  programs/
  admin/
  ui/

utils/
  supabase/
    client.ts
    server.ts

supabase/
  migrations/
    00001_schema.sql
    00002_rls.sql
    00003_rpcs.sql
    00004_views.sql
    00005_program_rpcs.sql
    00006_admin_rpcs.sql
  seed.sql
```

✅ **Check:** `find . -name "*.tsx" | wc -l` should show 30+ files

---

## Step 3 — Install dependencies

```bash
npm install
```

This installs everything in `package.json` including:
- `@supabase/ssr` and `@supabase/supabase-js`
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- `@tanstack/react-query`
- `lucide-react`
- `clsx`, `tailwind-merge`

✅ **Check:** `node_modules/` exists, no red errors in install output

---

## Step 4 — Initialise Supabase locally

```bash
npx supabase init
```

This creates a `supabase/` folder with config files.
Our migration files are already inside `supabase/migrations/` from Step 2.

✅ **Check:** `supabase/config.toml` exists

---

## Step 5 — Start Supabase (requires Docker running)

```bash
npx supabase start
```

This will take 2–3 minutes the first time while Docker pulls images.
When finished, it prints output like:

```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
Inbucket URL: http://localhost:54324
anon key: eyJ...
service_role key: eyJ...
```

**Copy these values — you need them in the next step.**

✅ **Check:** `http://localhost:54323` opens Supabase Studio in browser

---

## Step 6 — Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in with the values from Step 5:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste anon key here>
SUPABASE_SERVICE_ROLE_KEY=<paste service_role key here>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

✅ **Check:** `.env.local` has all four values filled in (no placeholder text remaining)

---

## Step 7 — Run the database migrations

```bash
npx supabase db push
```

This applies all six migrations in order:
1. `00001_schema.sql` — all tables, indexes, triggers, PR detection trigger
2. `00002_rls.sql` — helper functions, RLS on all tables, all policies
3. `00003_rpcs.sql` — auth, workout, and logging RPCs
4. `00004_views.sql` — delta report, roster compliance, history timeline views
5. `00005_program_rpcs.sql` — program and workout template RPCs
6. `00006_admin_rpcs.sql` — admin panel RPCs

✅ **Check:** No errors. Go to Studio → Table Editor — you should see all tables listed.

If you see an error, run the migrations manually one at a time in Studio → SQL Editor to identify which one failed.

---

## Step 8 — Create test users

1. Go to **http://localhost:54323**
2. Click **Authentication** in the left sidebar
3. Click **Add user → Create new user**
4. Create: `coach@ironhq.local` with any password
5. Tick **"Auto Confirm User"** ← important, otherwise email verification blocks login
6. Repeat for `athlete@ironhq.local`
7. Optionally create `admin@ironhq.local` (same process)

✅ **Check:** Both users appear in the Authentication → Users list with a green "Confirmed" status

---

## Step 9 — Run the seed script

1. In Studio, go to **SQL Editor**
2. Open `supabase/seed.sql`
3. At the top of the file, replace the placeholder UUIDs with the real UUIDs from Step 8:

```sql
v_coach_id   UUID := '<paste coach UUID here>';
v_athlete_id UUID := '<paste athlete UUID here>';
```

Get the UUIDs from Authentication → Users — click each user to see their UUID.

4. Run the script (click the green Run button)

✅ **Check:** The output panel shows:
```
✅ Seed complete. Club: ..., Coach: ..., Athlete: ...
```

If you created an admin user, run this separately in SQL Editor:

```sql
UPDATE profiles
SET primary_role = 'admin', is_active = true
WHERE email = 'admin@ironhq.local';
```

---

## Step 10 — Generate TypeScript types

```bash
npm run types:supabase
```

This generates `src/types/supabase.ts` with full type coverage for all your tables, views, and RPCs. Your editor will now autocomplete Supabase queries correctly.

✅ **Check:** `src/types/supabase.ts` exists and contains your table names

---

## Step 11 — Type check and start

```bash
# Check for TypeScript errors first
npm run typecheck

# Start the dev server
npm run dev
```

✅ **Check:** `http://localhost:3000` loads and redirects to `/login`

---

## Step 12 — Test the full flow

### Coach flow

1. Go to `http://localhost:3000/login`
2. Enter `coach@ironhq.local`
3. Go to `http://localhost:54324` (Inbucket) — click the magic link in the email
4. You land on `/architect`
5. Drag exercises from the left pane into the builder
6. Enter a workout title, select the athlete, pick a date
7. Click **Assign Workout**

### Athlete flow

1. Open a new **incognito window**
2. Go to `http://localhost:3000/login`
3. Enter `athlete@ironhq.local`
4. Get the magic link from Inbucket
5. You land on `/logger`
6. Click **Start Workout** → log sets → **Complete Workout**

### Verify PR detection

After the athlete completes a workout, go to `/history`. If any sets beat previous bests, a PR entry appears automatically.

### Verify delta

Back in the coach window, go to `/roster`. Click the athlete row. The delta panel shows planned vs actual volume.

### Program builder

Go to `/programs`. Create a workout template, then build a multi-week program by assigning templates to day slots.

### Admin panel (if you created an admin user)

Go to `http://localhost:3000/admin` — platform stats, club management, profile management.

---

## Common errors and fixes

### "relation does not exist" when running migrations

The migrations must run in order. If you ran them out of order, reset and start again:

```bash
npx supabase db reset
npx supabase db push
```

### Magic link says "Email link is invalid or has expired"

Your `NEXT_PUBLIC_SITE_URL` in `.env.local` doesn't match where the app is running. For local dev it must be `http://localhost:3000`.

Also check: Supabase Studio → Authentication → URL Configuration → set Site URL to `http://localhost:3000`.

### "Unauthorized: not an active coach in this club"

The seed script didn't run correctly, or the UUID you pasted didn't match. Go to Studio → Table Editor → `club_memberships` and verify the coach profile has `role = 'coach'` and `status = 'active'`.

### "useSearchParams() should be wrapped in a suspense boundary"

This is already fixed in `onboarding/page.tsx`. If you see it elsewhere, wrap the component that calls `useSearchParams()` in a `<Suspense>` boundary.

### Build fails with "Module not found: lucide-react"

```bash
npm install lucide-react
```

### Tailwind classes not applying

Check that `tailwind.config.ts` content paths include `./components/**/*.{ts,tsx}` and `./app/**/*.{ts,tsx}`. Then restart the dev server.

---

## Deploying to production

### 1. Create a Supabase project

Go to `https://supabase.com` → New Project. Note your project ref (in the URL).

### 2. Link and push migrations

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### 3. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Set these environment variables in Vercel dashboard → Project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase Dashboard → Settings → API (keep secret) |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel URL e.g. `https://ironhq.vercel.app` |

### 4. Configure auth redirect in Supabase

Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://ironhq.vercel.app`
- **Redirect URLs**: `https://ironhq.vercel.app/auth/callback`

---

## File count summary

```
52 files total
  5 SQL migrations + 1 seed file
  6 Next.js pages (server components)
  6 loading.tsx skeleton screens
  2 layout files (coach + athlete + admin)
  1 middleware
  19 client components
  2 Supabase utility files
  7 config files (package.json, tsconfig, tailwind, etc.)
```
