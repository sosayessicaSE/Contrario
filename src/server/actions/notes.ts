"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  aiNoteSummaries,
  noteShares,
  notes,
  noteTags,
  noteVersions,
  tags,
  type NoteVisibility,
} from "@/lib/db/schema";
import { can, canDeleteNote, canReadNote, canShareNote, canUpdateNote } from "@/lib/rbac/permissions";
import type { NoteAccessContext } from "@/lib/rbac/permissions";
import { loadNoteAccess, loadShareUserIds } from "@/lib/notes/access";
import { requireAuthContext } from "./context";
import { logEvent } from "@/lib/logging/logger";

async function tagNamesForNote(noteId: string) {
  const db = getDb();
  const rows = await db
    .select({ name: tags.name })
    .from(noteTags)
    .innerJoin(tags, eq(noteTags.tagId, tags.id))
    .where(eq(noteTags.noteId, noteId));
  return rows.map((r) => r.name);
}

async function upsertTags(orgId: string, names: string[]) {
  const db = getDb();
  const cleaned = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const ids: string[] = [];
  for (const name of cleaned) {
    const existing = await db
      .select()
      .from(tags)
      .where(and(eq(tags.orgId, orgId), eq(tags.name, name)))
      .limit(1);
    if (existing[0]) {
      ids.push(existing[0].id);
    } else {
      const [t] = await db.insert(tags).values({ orgId, name }).returning();
      ids.push(t!.id);
    }
  }
  return ids;
}

async function setNoteTags(noteId: string, orgId: string, tagNames: string[]) {
  const db = getDb();
  await db.delete(noteTags).where(eq(noteTags.noteId, noteId));
  const tagIds = await upsertTags(orgId, tagNames);
  if (tagIds.length) {
    await db.insert(noteTags).values(tagIds.map((tagId) => ({ noteId, tagId })));
  }
}

async function snapshotVersion(noteId: string, editedBy: string) {
  const db = getDb();
  const n = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
  const row = n[0];
  if (!row) return;
  const tagList = await tagNamesForNote(noteId);
  await db.insert(noteVersions).values({
    noteId,
    editedBy,
    title: row.title,
    body: row.body,
    visibilitySnapshot: row.visibility,
    tagsSnapshot: tagList,
  });
}

export async function createNote(orgId: string, input: { title: string; body: string; visibility: NoteVisibility; tagNames: string[] }) {
  const ctx = await requireAuthContext(orgId);
  if (!can(ctx, "note:create")) throw new Error("Forbidden");
  const db = getDb();
  const [n] = await db
    .insert(notes)
    .values({
      orgId,
      title: input.title,
      body: input.body,
      visibility: input.visibility,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();
  await setNoteTags(n!.id, orgId, input.tagNames);
  logEvent("info", "note.created", { orgId, noteId: n!.id, userId: ctx.userId });
  revalidatePath(`/o/${orgId}/notes`);
  return n!;
}

export async function updateNote(
  orgId: string,
  noteId: string,
  input: { title: string; body: string; visibility: NoteVisibility; tagNames: string[] },
) {
  const ctx = await requireAuthContext(orgId);
  const access = await loadNoteAccess(orgId, noteId);
  if (!access) throw new Error("Not found");
  if (!canUpdateNote(ctx, access)) throw new Error("Forbidden");

  const db = getDb();
  await snapshotVersion(noteId, ctx.userId);
  await db
    .update(notes)
    .set({
      title: input.title,
      body: input.body,
      visibility: input.visibility,
      updatedBy: ctx.userId,
      updatedAt: sql`now()`,
    })
    .where(and(eq(notes.id, noteId), eq(notes.orgId, orgId)));
  await setNoteTags(noteId, orgId, input.tagNames);
  logEvent("info", "note.updated", { orgId, noteId, userId: ctx.userId });
  revalidatePath(`/o/${orgId}/notes`);
  revalidatePath(`/o/${orgId}/notes/${noteId}`);
}

export async function deleteNote(orgId: string, noteId: string) {
  const ctx = await requireAuthContext(orgId);
  const access = await loadNoteAccess(orgId, noteId);
  if (!access) throw new Error("Not found");
  if (!canDeleteNote(ctx, access)) throw new Error("Forbidden");
  const db = getDb();
  await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.orgId, orgId)));
  logEvent("info", "note.deleted", { orgId, noteId, userId: ctx.userId });
  revalidatePath(`/o/${orgId}/notes`);
  redirect(`/o/${orgId}/notes`);
}

export async function setNoteShares(orgId: string, noteId: string, userIds: string[]) {
  const ctx = await requireAuthContext(orgId);
  const access = await loadNoteAccess(orgId, noteId);
  if (!access) throw new Error("Not found");
  if (!canShareNote(ctx, access)) throw new Error("Forbidden");
  if (access.visibility !== "shared") throw new Error("Note must be shared visibility");

  const db = getDb();
  await db.delete(noteShares).where(eq(noteShares.noteId, noteId));
  const unique = [...new Set(userIds)];
  if (unique.length) {
    await db.insert(noteShares).values(unique.map((userId) => ({ noteId, userId })));
  }
  logEvent("info", "note.shares_updated", { orgId, noteId, userId: ctx.userId });
  revalidatePath(`/o/${orgId}/notes/${noteId}`);
}

export async function listNotesForOrg(orgId: string) {
  const ctx = await requireAuthContext(orgId);
  const db = getDb();
  const rows = await db
    .select()
    .from(notes)
    .where(eq(notes.orgId, orgId))
    .orderBy(desc(notes.updatedAt));

  const filtered = [];
  for (const n of rows) {
    const sharedUserIds = await loadShareUserIds(n.id);
    const access: NoteAccessContext = {
      orgId: n.orgId,
      visibility: n.visibility,
      createdBy: n.createdBy,
      sharedUserIds,
    };
    if (canReadNote(ctx, access)) filtered.push(n);
  }
  return filtered;
}

export async function getNoteDetail(orgId: string, noteId: string) {
  const ctx = await requireAuthContext(orgId);
  const access = await loadNoteAccess(orgId, noteId);
  if (!access) return null;
  if (!canReadNote(ctx, access)) return null;
  const db = getDb();
  const n = await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.orgId, orgId))).limit(1);
  const tagNames = await tagNamesForNote(noteId);
  const versions = await db
    .select()
    .from(noteVersions)
    .where(eq(noteVersions.noteId, noteId))
    .orderBy(desc(noteVersions.createdAt));
  const shares = await loadShareUserIds(noteId);
  const summaries = await db
    .select()
    .from(aiNoteSummaries)
    .where(eq(aiNoteSummaries.noteId, noteId))
    .orderBy(desc(aiNoteSummaries.createdAt))
    .limit(10);
  return { note: n[0]!, tagNames, versions, shares, summaries };
}

export async function searchNotes(orgId: string, query: string, limit = 50) {
  const ctx = await requireAuthContext(orgId);
  if (!query.trim()) return [];
  const db = getDb();
  const q = query.trim();
  const rows = await db.execute(sql`
    SELECT n.id, n.title, n.body, n.visibility, n.created_by, n.updated_at
    FROM notes n
    WHERE n.org_id = ${orgId}
      AND n.search_vector @@ plainto_tsquery('english', ${q})
      AND (
        n.visibility = 'org'
        OR (
          n.visibility = 'private'
          AND (
            n.created_by = ${ctx.userId}
            OR EXISTS (
              SELECT 1 FROM org_memberships om
              WHERE om.org_id = n.org_id AND om.user_id = ${ctx.userId} AND om.role IN ('admin','owner')
            )
          )
        )
        OR (
          n.visibility = 'shared'
          AND (
            n.created_by = ${ctx.userId}
            OR EXISTS (
              SELECT 1 FROM org_memberships om2
              WHERE om2.org_id = n.org_id AND om2.user_id = ${ctx.userId} AND om2.role IN ('admin','owner')
            )
            OR EXISTS (
              SELECT 1 FROM note_shares ns
              WHERE ns.note_id = n.id AND ns.user_id = ${ctx.userId}
            )
          )
        )
      )
    ORDER BY n.updated_at DESC
    LIMIT ${limit}
  `);
  return rows as unknown as Array<{
    id: string;
    title: string;
    body: string;
    visibility: string;
    created_by: string;
    updated_at: Date;
  }>;
}
