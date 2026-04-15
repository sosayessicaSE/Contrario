import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { createClient } from "@supabase/supabase-js";
import { and, eq, inArray } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const {
  DATABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SEED_USER_PASSWORD = "Password123!Seed",
  SEED_RESET,
} = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const ORG_SLUGS = ["seed-org-a", "seed-org-b", "seed-org-c"] as const;
const SEED_EMAILS = [
  "contrario-seed-1@example.com",
  "contrario-seed-2@example.com",
  "contrario-seed-3@example.com",
  "contrario-seed-4@example.com",
  "contrario-seed-5@example.com",
  "contrario-seed-6@example.com",
] as const;

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function ensureAuthUsers(): Promise<string[]> {
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Skipping Supabase Auth user creation (missing service role env).");
    const raw = process.env.SEED_USER_IDS;
    if (!raw) throw new Error("Provide SEED_USER_IDS (6 UUIDs) or Supabase service role env vars.");
    const ids = raw.split(",").map((s) => s.trim());
    if (ids.length < 6) throw new Error("SEED_USER_IDS must include at least 6 UUIDs");
    return ids.slice(0, 6);
  }

  const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ids: string[] = [];
  for (const email of SEED_EMAILS) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: SEED_USER_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = listed.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!found?.id) throw new Error(`Failed to create/find user ${email}: ${error.message}`);
      ids.push(found.id);
    } else {
      ids.push(data.user!.id);
    }
  }
  return ids;
}

async function resetSeedData(db: ReturnType<typeof drizzle>) {
  if (SEED_RESET !== "1") return;
  const orgs = await db.select().from(schema.organizations).where(inArray(schema.organizations.slug, [...ORG_SLUGS]));
  const orgIds = orgs.map((o) => o.id);
  if (!orgIds.length) return;
  await db.delete(schema.organizations).where(inArray(schema.organizations.id, orgIds));
}

async function upsertTag(db: ReturnType<typeof drizzle>, orgId: string, name: string) {
  const existing = await db
    .select()
    .from(schema.tags)
    .where(and(eq(schema.tags.orgId, orgId), eq(schema.tags.name, name)))
    .limit(1);
  if (existing[0]) return existing[0].id;
  const [t] = await db.insert(schema.tags).values({ orgId, name }).returning();
  return t!.id;
}

async function main() {
  const client = postgres(DATABASE_URL, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  await resetSeedData(db);

  const userIds = await ensureAuthUsers();

  for (const uid of userIds) {
    await db.insert(schema.profiles).values({ userId: uid, displayName: `Seed ${uid.slice(0, 8)}` }).onConflictDoNothing({
      target: schema.profiles.userId,
    });
  }

  const orgRows: Array<typeof schema.organizations.$inferSelect> = [];
  for (let i = 0; i < ORG_SLUGS.length; i++) {
    const slug = ORG_SLUGS[i]!;
    const owner = userIds[i % userIds.length]!;
    const existing = await db.select().from(schema.organizations).where(eq(schema.organizations.slug, slug)).limit(1);
    if (existing[0]) {
      orgRows.push(existing[0]);
      continue;
    }
    const [org] = await db
      .insert(schema.organizations)
      .values({ name: `Seed Org ${String.fromCharCode(65 + i)}`, slug, createdBy: owner })
      .returning();
    orgRows.push(org!);
  }

  const orgIds = orgRows.map((o) => o.id);

  const memberships: Array<{ orgId: string; userId: string; role: "owner" | "admin" | "member" }> = [
    { orgId: orgIds[0]!, userId: userIds[0]!, role: "owner" },
    { orgId: orgIds[0]!, userId: userIds[1]!, role: "member" },
    { orgId: orgIds[0]!, userId: userIds[2]!, role: "member" },
    { orgId: orgIds[1]!, userId: userIds[1]!, role: "owner" },
    { orgId: orgIds[1]!, userId: userIds[3]!, role: "admin" },
    { orgId: orgIds[1]!, userId: userIds[4]!, role: "member" },
    { orgId: orgIds[2]!, userId: userIds[2]!, role: "owner" },
    { orgId: orgIds[2]!, userId: userIds[5]!, role: "member" },
    { orgId: orgIds[2]!, userId: userIds[0]!, role: "member" },
  ];

  for (const m of memberships) {
    await db.insert(schema.orgMemberships).values(m).onConflictDoNothing({
      target: [schema.orgMemberships.orgId, schema.orgMemberships.userId],
    });
  }

  const handNotes: Array<{
    orgIdx: number;
    title: string;
    body: string;
    visibility: "org" | "private" | "shared";
    creatorIdx: number;
    tags: string[];
  }> = [
    { orgIdx: 0, title: "Quarterly plan", body: "Goals and milestones", visibility: "org", creatorIdx: 0, tags: ["plan", "q1"] },
    { orgIdx: 1, title: "Quarterly plan", body: "Different org same title", visibility: "org", creatorIdx: 1, tags: ["plan", "ops"] },
    { orgIdx: 0, title: "Secret roadmap", body: "Private content", visibility: "private", creatorIdx: 0, tags: ["roadmap"] },
    { orgIdx: 0, title: "Shared draft", body: "Shared with teammate", visibility: "shared", creatorIdx: 0, tags: ["draft"] },
    { orgIdx: 2, title: "Incident notes", body: "Postmortem", visibility: "org", creatorIdx: 2, tags: ["incident", "plan"] },
  ];

  const createdNoteIds: string[] = [];
  for (const hn of handNotes) {
    const orgId = orgIds[hn.orgIdx]!;
    const creator = userIds[hn.creatorIdx]!;
    const [n] = await db
      .insert(schema.notes)
      .values({
        orgId,
        title: hn.title,
        body: hn.body,
        visibility: hn.visibility,
        createdBy: creator,
        updatedBy: creator,
      })
      .returning();
    createdNoteIds.push(n!.id);
    for (const tagName of hn.tags) {
      const tagId = await upsertTag(db, orgId, tagName);
      await db.insert(schema.noteTags).values({ noteId: n!.id, tagId }).onConflictDoNothing({
        target: [schema.noteTags.noteId, schema.noteTags.tagId],
      });
    }
    if (hn.visibility === "shared") {
      await db.insert(schema.noteShares).values({ noteId: n!.id, userId: userIds[1]! }).onConflictDoNothing({
        target: [schema.noteShares.noteId, schema.noteShares.userId],
      });
    }
    for (let v = 0; v < 3; v++) {
      await db.insert(schema.noteVersions).values({
        noteId: n!.id,
        editedBy: creator,
        title: `${hn.title} v${v}`,
        body: `${hn.body} (edit ${v})`,
        visibilitySnapshot: hn.visibility,
        tagsSnapshot: hn.tags,
      });
    }
  }

  const rnd = mulberry32(1337);
  const batchSize = 500;
  const bulk: Array<typeof schema.notes.$inferInsert> = [];
  for (let i = 0; i < 10_000; i++) {
    const orgId = orgIds[Math.floor(rnd() * orgIds.length)]!;
    const creator = userIds[Math.floor(rnd() * userIds.length)]!;
    bulk.push({
      orgId,
      title: `Bulk note ${i} title-${Math.floor(rnd() * 200)}`,
      body: `Bulk body ${Math.floor(rnd() * 50_000)} token-${ORG_SLUGS[0]} tag:plan`,
      visibility: rnd() < 0.85 ? "org" : rnd() < 0.5 ? "private" : "shared",
      createdBy: creator,
      updatedBy: creator,
    });
  }
  for (let i = 0; i < bulk.length; i += batchSize) {
    await db.insert(schema.notes).values(bulk.slice(i, i + batchSize));
  }

  for (let i = 0; i < 5; i++) {
    const orgId = orgIds[0]!;
    const uploader = userIds[0]!;
    await db.insert(schema.files).values({
      orgId,
      noteId: createdNoteIds[0] ?? null,
      storageObjectPath: `seed/${orgId}/placeholder-${i}.txt`,
      filename: `seed-${i}.txt`,
      mime: "text/plain",
      size: 12,
      status: "ready",
      uploadedBy: uploader,
    });
  }

  await client.end({ timeout: 5 });
  console.log("Seed complete.");
  console.log(`Organizations: ${orgIds.join(", ")}`);
  console.log(`Users: ${SEED_EMAILS.join(", ")}`);
  console.log(`Password (default): ${SEED_USER_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
