import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { noteShares, notes } from "@/lib/db/schema";
import type { NoteAccessContext } from "@/lib/rbac/permissions";

export async function loadShareUserIds(noteId: string) {
  const db = getDb();
  const rows = await db.select({ userId: noteShares.userId }).from(noteShares).where(eq(noteShares.noteId, noteId));
  return rows.map((r) => r.userId);
}

export async function loadNoteAccess(orgId: string, noteId: string): Promise<NoteAccessContext | null> {
  const db = getDb();
  const rows = await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.orgId, orgId))).limit(1);
  const n = rows[0];
  if (!n) return null;
  const sharedUserIds = await loadShareUserIds(noteId);
  return {
    orgId: n.orgId,
    visibility: n.visibility,
    createdBy: n.createdBy,
    sharedUserIds,
  };
}
