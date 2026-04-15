import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getDb } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMembership } from "@/lib/tenancy/org-context";
import { can, canReadNote } from "@/lib/rbac/permissions";
import type { OrgRole } from "@/lib/rbac/policy-matrix";
import { loadNoteAccess } from "@/lib/notes/access";
import { logEvent } from "@/lib/logging/logger";

const BUCKET = "note-files";
const MAX_BYTES = 15 * 1024 * 1024;

const schema = z.object({
  orgId: z.string().uuid(),
  noteId: z.string().uuid().optional().nullable(),
  filename: z.string().min(1).max(255),
  mime: z.string().min(1).max(120),
  size: z.number().int().positive().max(MAX_BYTES),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      logEvent("warn", "rbac.denied", { requestId, route: "POST /api/files/sign-upload", denyReason: "no_session" });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input = schema.parse(await req.json());
    const m = await getMembership(user.id, input.orgId);
    if (!m) {
      logEvent("warn", "rbac.denied", { requestId, denyReason: "not_org_member" });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const ctx = { userId: user.id, orgId: input.orgId, role: m.role as OrgRole };
    if (!can(ctx, "file:upload")) {
      logEvent("warn", "rbac.denied", { requestId, denyReason: "file_upload" });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (input.noteId) {
      const access = await loadNoteAccess(input.orgId, input.noteId);
      if (!access || !canReadNote(ctx, access)) {
        logEvent("warn", "rbac.denied", { requestId, denyReason: "note_read_for_file" });
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const admin = createServiceRoleClient();
    const db = getDb();
    const [fileRow] = await db
      .insert(files)
      .values({
        orgId: input.orgId,
        noteId: input.noteId ?? null,
        storageObjectPath: "pending",
        filename: input.filename,
        mime: input.mime,
        size: input.size,
        status: "pending",
        uploadedBy: user.id,
      })
      .returning();

    const objectPath = `${input.orgId}/${fileRow!.id}/${input.filename}`;
    await db.update(files).set({ storageObjectPath: objectPath }).where(eq(files.id, fileRow!.id));

    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(objectPath);
    if (error) {
      logEvent("error", "file.upload_signed_failed", { requestId, message: error.message });
      await db.delete(files).where(eq(files.id, fileRow!.id));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logEvent("info", "file.upload_signed", {
      requestId,
      userId: user.id,
      orgId: input.orgId,
      fileId: fileRow!.id,
    });

    return NextResponse.json({ fileId: fileRow!.id, path: objectPath, signedUrl: data.signedUrl, token: data.token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    logEvent("error", "file.upload_signed_failed", { requestId, message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
