# IronHQ Clean Rebuild

This is a fresh-start version of IronHQ designed to solve the deployment instability in the previous repository.

## Why this rebuild exists

The old repository had broken config files, duplicated route files, and SQL pasted into application and documentation files. That made reliable deployment impossible.

## What this version includes

- Next.js 14 app-router foundation
- Tailwind styling
- Stable dashboard, roster, programs, and builder placeholder pages
- Mock data for immediate deploy validation
- Separated SQL schema and seed files
- Minimal middleware that does not block deployment

## What this version intentionally does not include yet

- Live Supabase authentication
- RLS policies
- RPC-driven program builder save flows
- Drag-and-drop planner behavior
- Messaging and logging subsystems

## Local setup

1. Create a new GitHub repository.
2. Copy this file set into that repository.
3. Run `npm install`.
4. Run `npm run dev`.
5. When ready, deploy to Render or Vercel.

## Recommended deployment settings

- Node version: 20.x
- Build command: `npm install && npm run build`
- Start command: `npm start`

## Phase 2 plan

After the shell deploys successfully, wire the following in this order:

1. Supabase auth on `/login`
2. Protected middleware
3. Club-aware data fetching
4. Program CRUD
5. Athlete execution logs
6. Comms and admin surfaces
