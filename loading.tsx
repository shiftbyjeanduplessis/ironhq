# .env.local
# Copy this file and fill in your values.
# Never commit .env.local to version control.
# .env.example (this file) is safe to commit.

# ── Supabase ──────────────────────────────────────────────────
# Found in: Supabase Dashboard → Project Settings → API

# Your project URL (public — safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Anon key (public — safe for browser, RLS enforced)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Service role key (private — NEVER expose to browser)
# Used only by Edge Functions and server-side admin tasks.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ── App ───────────────────────────────────────────────────────
# Used for auth redirect URLs. Change to your production domain when deploying.
NEXT_PUBLIC_SITE_URL=http://localhost:3000
