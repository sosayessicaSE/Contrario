import { createServerSupabase } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getSessionUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function ensureProfile(userId: string, displayName?: string | null) {
  const db = getDb();
  const existing = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(profiles).values({
    userId,
    displayName: displayName ?? null,
  });
  const created = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return created[0]!;
}
