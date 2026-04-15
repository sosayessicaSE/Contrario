"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { organizations, orgMemberships, profiles } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getSessionUser, ensureProfile } from "@/lib/auth/session";
import { can } from "@/lib/rbac/permissions";
import { requireAuthContext } from "./context";
import { logEvent } from "@/lib/logging/logger";

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "org"
  );
}

export async function createOrganization(name: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  await ensureProfile(user.id, user.email);
  const db = getDb();
  const base = slugify(name);
  let slug = base;
  for (let i = 0; i < 20; i++) {
    const clash = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
    if (!clash[0]) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  }
  const [org] = await db
    .insert(organizations)
    .values({ name, slug, createdBy: user.id })
    .returning();
  await db.insert(orgMemberships).values({ orgId: org!.id, userId: user.id, role: "owner" });
  logEvent("info", "org.created", { orgId: org!.id, userId: user.id });
  revalidatePath("/");
  redirect(`/o/${org!.id}/notes`);
}

export async function listMyOrganizations() {
  const user = await getSessionUser();
  if (!user) return [];
  const db = getDb();
  const memberships = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, user.id));
  if (!memberships.length) return [];
  const orgIds = memberships.map((m) => m.orgId);
  const orgs = await db.select().from(organizations).where(inArray(organizations.id, orgIds));
  return orgs.map((o) => ({ ...o, membership: memberships.find((m) => m.orgId === o.id) }));
}

export async function listOrgMembers(orgId: string) {
  await requireAuthContext(orgId);
  const db = getDb();
  return db
    .select({
      userId: orgMemberships.userId,
      role: orgMemberships.role,
      displayName: profiles.displayName,
    })
    .from(orgMemberships)
    .leftJoin(profiles, eq(profiles.userId, orgMemberships.userId))
    .where(eq(orgMemberships.orgId, orgId));
}

export async function addOrgMember(orgId: string, userId: string, role: "owner" | "admin" | "member" = "member") {
  const ctx = await assertOrgManageMembers(orgId);
  const db = getDb();
  await db
    .insert(orgMemberships)
    .values({ orgId, userId, role })
    .onConflictDoNothing({ target: [orgMemberships.orgId, orgMemberships.userId] });
  logEvent("info", "org.member_added", { orgId, actor: ctx.userId, userId });
  revalidatePath(`/o/${orgId}`);
}

export async function assertOrgManageMembers(orgId: string) {
  const ctx = await requireAuthContext(orgId);
  if (!can(ctx, "org:manage_members")) throw new Error("Forbidden");
  return ctx;
}
