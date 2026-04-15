import { getDb } from "@/lib/db";
import { orgMemberships } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { OrgRole } from "@/lib/rbac/policy-matrix";

export async function getMembership(userId: string, orgId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(orgMemberships)
    .where(and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { orgId: row.orgId, userId: row.userId, role: row.role as OrgRole };
}
