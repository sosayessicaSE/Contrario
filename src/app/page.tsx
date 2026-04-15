import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { orgMemberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const db = getDb();
  const first = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, user.id))
    .limit(1);

  if (first[0]) redirect(`/o/${first[0].orgId}/notes`);
  redirect("/login?notice=no-org");
}
