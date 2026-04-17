# Contrario Notes

Multi-tenant notes app: organizations, role-based access, full-text search, version history, file attachments (Supabase Storage), and optional AI summaries. Built with **Next.js 15**, **Supabase Auth**, **PostgreSQL** (via **Drizzle ORM**), and deployed with Docker/Railway support.

---

## Prerequisites

- **Node.js 20+** (matches the Dockerfile)
- **pnpm** 9+ ([corepack](https://nodejs.org/api/corepack.html): `corepack enable`)
- A **Supabase** project (Auth, Postgres, Storage)
- **PostgreSQL** connection string compatible with Drizzle (Supabase’s database URL from **Project Settings → Database**)

---

## Step-by-step: run locally

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the template and edit values for your Supabase project:

```bash
cp .env.example .env
```

Fill at least:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `DATABASE_URL` | Postgres connection string (same DB Supabase uses) |
| `NEXT_PUBLIC_APP_URL` | App origin, e.g. `http://localhost:3000` (used for redirects and callbacks) |

**Optional but recommended:**

- `SUPABASE_SERVICE_ROLE_KEY` — required for `pnpm db:seed` to create test users via the Admin API; also used for server-side storage operations.
- `LLM_API_KEY` — real AI summaries; if unset, summaries run in **mock** mode (see below).
- `LLM_API_BASE_URL` — defaults to OpenAI-compatible `https://api.openai.com/v1` when empty.
- `MOCK_AI=1` — force mock summaries even if a key is set.

See `.env.example` for the full list (`LOG_LEVEL`, `PORT`, seed options, etc.).

### 3. Supabase dashboard setup

1. **Authentication → URL configuration**  
   Add your site URL (e.g. `http://localhost:3000`) and set the redirect URL pattern so OAuth/email flows can return to `/auth/callback`.

2. **Storage**  
   Create a **public** or appropriately RLS-protected bucket named **`note-files`** (the UI mentions this). Adjust policies so signed uploads/downloads from the app work for your org.

3. **Connection issues**  
   If migrations time out on IPv6, try Supabase’s **connection pooler** URI (often port `6543`) or run the provided scripts (`db:migrate`, `db:seed`) which prefer IPv4 DNS ordering.

### 4. Apply database schema

Generate SQL migrations are in `drizzle/`. Apply them:

```bash
pnpm db:migrate
```

For iterative local schema sync (use with care vs. migrate):

```bash
pnpm db:push
```

### 5. (Optional) Seed demo data

Creates organizations, memberships, notes, and (if configured) Supabase auth users:

```bash
pnpm db:seed
```

Default seed user password is in `.env.example` (`SEED_USER_PASSWORD`). Set `SEED_RESET=1` to wipe and re-seed (see `scripts/seed.ts`).

### 6. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up or sign in, create an organization if you have no membership, then you land on org-scoped routes under `/o/[orgId]/…`.

### 7. Other useful commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Production Next.js build |
| `pnpm start` | Runs `scripts/start.mjs`: applies Drizzle migrations, optionally `APPLY_RLS_ON_START=1` SQL from `supabase/migrations/001_rls.sql`, then `next start` |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |

---

## How it works

### High-level architecture

- **Next.js App Router** renders pages and Server Actions under `src/app` and `src/server/actions`.
- **Supabase** handles **email/password auth** (and session cookies via `@supabase/ssr`). The `/auth/callback` route exchanges an auth `code` for a session.
- **PostgreSQL** holds app data (orgs, notes, tags, versions, files metadata, AI summary rows). Access is through **Drizzle** (`src/lib/db`).
- **Files**: metadata in Postgres; blobs in Supabase **Storage** (`note-files` bucket), with API routes for signed upload/download.
- **AI summaries**: server calls an OpenAI-compatible chat API (or returns deterministic mock output when `MOCK_AI=1` or `LLM_API_KEY` is missing).

### Auth and routing

- **`src/middleware.ts`** refreshes the Supabase session and redirects unauthenticated users away from `/o/*` to `/login?next=…`.
- **`/`** (`src/app/page.tsx`): if signed in, redirects to the first org’s notes; otherwise to login. Users without any org are sent to login with a notice and can create an org.

### Multi-tenancy and permissions

- Users belong to **organizations** via **`org_memberships`** with roles (`owner`, `admin`, `member`).
- Org-scoped UI lives under **`/o/[orgId]/…`**. The org layout loads the session, ensures a **profile** row, and verifies membership; otherwise it redirects.
- **Notes** support visibility (`org`, `private`, `shared`) and **note shares** for explicit user access. Server actions and `src/lib/notes/access.ts` / RBAC helpers enforce who can read or edit.

### Notes, search, and versions

- Each **note** has title, body, visibility, and a **`search_vector`** column maintained for **PostgreSQL full-text search** (GIN index).
- Edits create **version snapshots** in **`note_versions`** (title, body, visibility, tags) for history and diff UI.
- **Tags** are normalized per org and linked through **`note_tags`**.

### Files

- Upload flow uses signed URLs (`/api/files/…` routes) and marks rows in **`files`** as `pending` → `ready` (or `failed`) when complete.

### AI summaries

- Summaries are stored in **`ai_note_summaries`** with status `draft` / `accepted` / `rejected`, keyed by an **input hash** of title+body so repeated requests can be deduplicated logically in the app layer.
- **`MOCK_AI=1`** or missing **`LLM_API_KEY`** uses the built-in mock structured summary (no external API cost).

### Production start (`pnpm start`)

`scripts/start.mjs` connects with `DATABASE_URL`, runs Drizzle migrations from the `drizzle/` folder, optionally applies RLS SQL when `APPLY_RLS_ON_START=1`, then spawns **`next start`**. This matches the **Railway** `startCommand` in `railway.toml`.

---

## Environment reference

Authoritative variable names and comments live in **`.env.example`**. Server-side validation is in **`src/lib/env.ts`** (`DATABASE_URL` is required at runtime for DB-backed features).
