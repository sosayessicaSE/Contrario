import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getDb } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getMembership } from "@/lib/tenancy/org-context";
import { can, canReadNote } from "@/lib/rbac/permissions";
import type { OrgRole } from "@/lib/rbac/policy-matrix";
import { loadNoteAccess } from "@/lib/notes/access";
import { logEvent } from "@/lib/logging/logger";

const BUCKET = "note-files";

const schema = z.object({
  orgId: z.string().uuid(),
  fileId: z.string().uuid(),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = schema.parse(await req.json());
  const m = await getMembership(user.id, input.orgId);
  if (!m) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const ctx = { userId: user.id, orgId: input.orgId, role: m.role as OrgRole };
  if (!can(ctx, "file:read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const row = await db
    .select()
    .from(files)
    .where(and(eq(files.id, input.fileId), eq(files.orgId, input.orgId)))
    .limit(1);
  const f = row[0];
  if (!f || f.status !== "ready") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (f.noteId) {
    const access = await loadNoteAccess(input.orgId, f.noteId);
    if (!access || !canReadNote(ctx, access)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(f.storageObjectPath, 60 * 10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logEvent("info", "file.download_signed", { requestId, fileId: f.id, userId: user.id, orgId: input.orgId });
  return NextResponse.json({ signedUrl: data.signedUrl });
}
