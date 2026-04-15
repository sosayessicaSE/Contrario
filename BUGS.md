# BUGS.md

## Review findings and fixes

### 1) `next build` failed TypeScript check on `scripts/seed.ts` (`DATABASE_URL` possibly undefined)

- **Symptom**: `pnpm exec next build` reported `Argument of type 'string | undefined' is not assignable to parameter of type 'string'` at `postgres(DATABASE_URL, ...)`.
- **Root cause**: Destructuring `DATABASE_URL` from `process.env` does not narrow after `process.exit` in a way Next’s project typecheck reliably understands; `tsconfig.json` also included `scripts/**/*.ts` in the app typecheck graph.
- **Fix**: Use explicit `const databaseUrl = process.env.DATABASE_URL` after a guard, add `"scripts"` to `tsconfig.json` `exclude`, and keep runtime validation.
- **Commit**: `ef64d87`

### 2) `next build` failed on Windows/OneDrive with `EPERM` during `output: "standalone"` tracing

- **Symptom**: Build failed while creating symlinks under `.next/standalone` (`EPERM: operation not permitted, symlink`).
- **Root cause**: Standalone output tracing relies on symlinks; some Windows setups (commonly under OneDrive) block symlink creation.
- **Fix**: Remove `output: "standalone"`; production still uses `next start` with a normal `.next` output (see `Dockerfile`).
- **Commit**: `ef64d87`

### 3) API route importing `loadNoteAccess` from a `"use server"` module

- **Symptom**: Risk of Next.js server-action module boundary issues when importing helpers from `server/actions/*` into Route Handlers.
- **Root cause**: `loadNoteAccess` lived alongside `"use server"` exports.
- **Fix**: Move shared loaders to `src/lib/notes/access.ts`.
- **Commit**: `f765421`

### 4) Supabase SSR cookie `setAll` callback implicit `any` under strict TS

- **Symptom**: `next build` failed with implicit `any` on `cookiesToSet` in middleware / server client / auth callback adapters.
- **Root cause**: `@supabase/ssr` cookie adapter typings require explicit parameter typing in strict mode.
- **Fix**: Annotate `cookiesToSet` as `{ name: string; value: string; options?: Record<string, unknown> }[]` and cast `options` when forwarding to Next’s cookie APIs.
- **Commit**: `e732e1e` (initial scaffold) / `d510d64` (auth callback route)
