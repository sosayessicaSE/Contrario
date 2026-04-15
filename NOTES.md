# NOTES.md (agent scratchpad)

## Architecture decisions

- **Tenancy**: Active org is always in the URL (`/o/[orgId]/...`). Membership is verified in the org layout server component.
- **Authorization**: A centralized `can()` / `canReadNote()` matrix in `src/lib/rbac/permissions.ts` is applied at the start of server actions and API routes. SQL search duplicates the visibility semantics intentionally (defense in depth vs drift).
- **RLS**: `supabase/migrations/001_rls.sql` is optional at runtime. Apply with `APPLY_RLS_ON_START=1` (see `scripts/start.mjs`). The Drizzle server connection typically uses a Postgres role that may bypass RLS; the app still enforces RBAC in code.
- **AI**: Provider-agnostic HTTP call in `src/lib/ai/provider.ts` with `MOCK_AI=1` or missing `LLM_API_KEY` forcing deterministic mock output for safe local testing.
- **Search**: Postgres `tsvector` maintained by triggers in `drizzle/0000_curved_gertrude_yorkes.sql` tail section.

## Supabase setup checklist

1. Create a Supabase project.
2. Set `DATABASE_URL` to the pooled/direct Postgres connection string.
3. Create a Storage bucket named **`note-files`** (private). File routes assume this bucket name.
4. Run migrations: `pnpm db:migrate` (or rely on `pnpm start` which migrates first).
5. Optional: set `APPLY_RLS_ON_START=1` on Railway to apply `001_rls.sql` automatically.

## Operational notes

- **Windows + OneDrive**: `output: "standalone"` was avoided because `next build` can fail at the “symlink traced files” step with `EPERM`. Production uses `next start` with a normal `.next` build output.
- **Seed**: `pnpm db:seed` creates ~10k notes plus overlapping fixtures. Use `SEED_RESET=1` to delete seed orgs by slug prefix (`seed-org-*`) before re-seeding.

## Follow-ups (if more time)

- Add pagination cursors to search + notes list.
- Add rate limiting for AI + uploads.
- Replace “list then filter” note listing with a single SQL visibility predicate.
