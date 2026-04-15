"use server";

import { getSessionUser, ensureProfile } from "@/lib/auth/session";
import { getMembership } from "@/lib/tenancy/org-context";
import type { AuthContext } from "@/lib/rbac/permissions";

export async function requireAuthContext(orgId: string): Promise<AuthContext> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  await ensureProfile(user.id, user.email);
  const m = await getMembership(user.id, orgId);
  if (!m) throw new Error("Forbidden");
  return { userId: user.id, orgId, role: m.role };
}
