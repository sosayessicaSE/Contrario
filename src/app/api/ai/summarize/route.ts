import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { aiNoteSummaries, notes } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getMembership } from "@/lib/tenancy/org-context";
import { can, canReadNote } from "@/lib/rbac/permissions";
import type { OrgRole } from "@/lib/rbac/policy-matrix";
import { summarizeNoteStructured, hashNoteInput } from "@/lib/ai/provider";
import { loadNoteAccess } from "@/lib/notes/access";
import { logEvent } from "@/lib/logging/logger";

const bodySchema = z.object({
  orgId: z.string().uuid(),
  noteId: z.string().uuid(),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      logEvent("warn", "rbac.denied", { requestId, route: "POST /api/ai/summarize", denyReason: "no_session" });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = bodySchema.parse(await req.json());
    const m = await getMembership(user.id, json.orgId);
    if (!m) {
      logEvent("warn", "rbac.denied", {
        requestId,
        route: "POST /api/ai/summarize",
        userId: user.id,
        denyReason: "not_org_member",
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ctx = { userId: user.id, orgId: json.orgId, role: m.role as OrgRole };
    if (!can(ctx, "ai:summarize")) {
      logEvent("warn", "rbac.denied", {
        requestId,
        route: "POST /api/ai/summarize",
        userId: user.id,
        orgId: json.orgId,
        denyReason: "ai_summarize",
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const access = await loadNoteAccess(json.orgId, json.noteId);
    if (!access || !canReadNote(ctx, access)) {
      logEvent("warn", "rbac.denied", {
        requestId,
        route: "POST /api/ai/summarize",
        userId: user.id,
        denyReason: "note_read",
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const n = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, json.noteId), eq(notes.orgId, json.orgId)))
      .limit(1);
    const note = n[0];
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

    logEvent("info", "ai.summarize_started", {
      requestId,
      userId: user.id,
      orgId: json.orgId,
      noteId: json.noteId,
      route: "POST /api/ai/summarize",
    });

    const model = process.env.SUMMARIZE_MODEL || "gpt-4o-mini";
    const output = await summarizeNoteStructured({ title: note.title, body: note.body, model });
    const inputHash = hashNoteInput(note.title, note.body);

    const [row] = await db
      .insert(aiNoteSummaries)
      .values({
        orgId: json.orgId,
        noteId: json.noteId,
        status: "draft",
        model,
        outputJson: output,
        inputHash,
        createdBy: user.id,
      })
      .returning();

    logEvent("info", "ai.summarize_succeeded", {
      requestId,
      userId: user.id,
      orgId: json.orgId,
      noteId: json.noteId,
      durationMs: Date.now() - started,
      route: "POST /api/ai/summarize",
    });

    return NextResponse.json({ summary: row });
  } catch (e) {
    logEvent("error", "ai.summarize_failed", {
      requestId,
      route: "POST /api/ai/summarize",
      durationMs: Date.now() - started,
      errorCode: "ai_failed",
    });
    const message = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
