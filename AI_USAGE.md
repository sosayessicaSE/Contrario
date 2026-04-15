# AI_USAGE.md

## Agents / parallelism

- This repository was implemented as a **single-agent sequential build** in Cursor Agent mode (no parallel sub-agents launched for this session).
- Work was split by **layers**: scaffold → schema/migrations → RBAC + server actions → UI → API routes → seed/infra/docs.

## Where automation was “wrong” / risky

- **Drizzle SQL triggers**: Needed careful ordering (notes vs note_tags) to avoid recursion; validated by reasoning + SQL review (no runtime DB in this environment).
- **Supabase signed uploads**: Client upload headers vary by Supabase version; kept minimal `Authorization: Bearer <token>` when token is returned.

## Human-style interventions (manual review)

- Tightened TypeScript typings for Supabase cookie adapters (`setAll` parameter typing) after `next build` failures.
- Simplified seeding logic after an initial draft produced an inefficient tag-attachment loop.

## What I would not trust agents to do unsupervised

- **RLS policy equivalence** vs app-layer RBAC (easy to drift).
- **Permission predicates embedded in raw SQL** (search): requires line-by-line review against `canReadNote()`.
- **Storage upload/download URL minting**: must be checked against Supabase API changes.
