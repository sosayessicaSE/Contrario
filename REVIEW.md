# REVIEW.md

## Reviewed deeply

- **RBAC matrix + note visibility** (`src/lib/rbac/permissions.ts`) and its reuse across server actions vs search SQL (`src/server/actions/notes.ts` `searchNotes` query).
- **Multi-tenant routing + membership gating** (`src/app/o/[orgId]/layout.tsx`, `src/server/actions/context.ts`).
- **AI summarize route** permission order: session → org membership → `can(ai:summarize)` → `canReadNote` → DB insert as `draft`.
- **Seed safety**: destructive reset only when `SEED_RESET=1` and only deletes known seed org slugs (`scripts/seed.ts`).

## Sampled / lighter review

- UI polish and accessibility.
- Full Supabase Storage upload compatibility matrix across browsers.

## Most distrusted areas

- Search SQL staying perfectly in sync with RBAC if visibility rules evolve.
- RLS applicability depending on which DB role `DATABASE_URL` uses.

## Next review pass (more time)

- Concurrency: simultaneous edits to the same note (versioning strategy).
- Storage path ACLs if buckets ever become public.
- Add integration tests hitting a disposable Postgres with migrations applied.
