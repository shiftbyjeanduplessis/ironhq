# IronHQ repo audit summary

## What broke the old repository

1. `tsconfig.json` contained SQL instead of JSON, which caused Next.js and TypeScript to fail before compilation.
2. `README.md` and `SETUP.md` also contained SQL rather than documentation.
3. The root of the repo contained many duplicate files such as `page (16).tsx`, `layout (20).tsx`, and `loading (15).tsx`, suggesting AI-generated or copy-exported clutter.
4. Runtime code, docs, and database migrations were mixed together instead of being separated by concern.
5. The project appeared to introduce advanced behavior like RPC-heavy builder flows before the shell and deployment foundation were stable.

## Rebuild decisions

- Start from a clean Next.js app-router shell.
- Remove all duplicate root files and restore valid config files.
- Keep SQL inside `supabase/` only.
- Ship demo data first so the app can deploy without backend blockers.
- Reintroduce auth, route guards, and RPCs only after the shell is stable.

## Recommended rebuild order

1. Deploy the shell exactly as provided here.
2. Add Supabase auth.
3. Add club context.
4. Replace mock data page by page.
5. Introduce a single save flow for programs.
6. Add advanced builder interactions only after save/load is reliable.
