"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aiNoteSummaries } from "@/lib/db/schema";
import { can, canReadNote } from "@/lib/rbac/permissions";
import { requireAuthContext } from "./context";
import { loadNoteAccess } from "@/lib/notes/access";
import { logEvent } from "@/lib/logging/logger";

export async function acceptAiSummary(orgId: string, summaryId: string) {
  const ctx = await requireAuthContext(orgId);
  if (!can(ctx, "ai:accept")) throw new Error("Forbidden");
  const db = getDb();
  const rows = await db
    .select()
    .from(aiNoteSummaries)
    .where(and(eq(aiNoteSummaries.id, summaryId), eq(aiNoteSummaries.orgId, orgId)))
    .limit(1);
  const s = rows[0];
  if (!s) throw new Error("Not found");
  const access = await loadNoteAccess(orgId, s.noteId);
  if (!access) throw new Error("Not found");
  if (!canReadNote(ctx, access)) throw new Error("Forbidden");

  await db
    .update(aiNoteSummaries)
    .set({ status: "accepted" })
    .where(and(eq(aiNoteSummaries.id, summaryId), eq(aiNoteSummaries.orgId, orgId)));
  logEvent("info", "ai.summary_accepted", { orgId, summaryId, userId: ctx.userId });
  revalidatePath(`/o/${orgId}/notes/${s.noteId}`);
}

export async function rejectAiSummary(orgId: string, summaryId: string) {
  const ctx = await requireAuthContext(orgId);
  if (!can(ctx, "ai:accept")) throw new Error("Forbidden");
  const db = getDb();
  const rows = await db
    .select()
    .from(aiNoteSummaries)
    .where(and(eq(aiNoteSummaries.id, summaryId), eq(aiNoteSummaries.orgId, orgId)))
    .limit(1);
  const s = rows[0];
  if (!s) throw new Error("Not found");
  const access = await loadNoteAccess(orgId, s.noteId);
  if (!access) throw new Error("Not found");
  if (!canReadNote(ctx, access)) throw new Error("Forbidden");

  await db
    .update(aiNoteSummaries)
    .set({ status: "rejected" })
    .where(and(eq(aiNoteSummaries.id, summaryId), eq(aiNoteSummaries.orgId, orgId)));
  logEvent("info", "ai.summary_rejected", { orgId, summaryId, userId: ctx.userId });
  revalidatePath(`/o/${orgId}/notes/${s.noteId}`);
}
