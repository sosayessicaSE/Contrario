"use server";

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { can, canReadNote } from "@/lib/rbac/permissions";
import { requireAuthContext } from "./context";
import { loadNoteAccess } from "@/lib/notes/access";

export async function listOrgFiles(orgId: string) {
  const ctx = await requireAuthContext(orgId);
  if (!can(ctx, "file:read")) throw new Error("Forbidden");
  const db = getDb();
  const rows = await db
    .select()
    .from(files)
    .where(eq(files.orgId, orgId))
    .orderBy(desc(files.createdAt));

  const out = [];
  for (const f of rows) {
    if (!f.noteId) {
      out.push(f);
      continue;
    }
    const access = await loadNoteAccess(orgId, f.noteId);
    if (access && canReadNote(ctx, access)) out.push(f);
  }
  return out;
}

export async function getFileRow(orgId: string, fileId: string) {
  const ctx = await requireAuthContext(orgId);
  if (!can(ctx, "file:read")) throw new Error("Forbidden");
  const db = getDb();
  const row = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.orgId, orgId)))
    .limit(1);
  const f = row[0];
  if (!f) return null;
  if (f.noteId) {
    const access = await loadNoteAccess(orgId, f.noteId);
    if (!access || !canReadNote(ctx, access)) return null;
  }
  return f;
}
