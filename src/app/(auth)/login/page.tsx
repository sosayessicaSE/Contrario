import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { orgMemberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { LoginForm } from "./ui";
import { CreateOrgForm } from "./create-org";
import { listJoinableOrganizations } from "@/server/actions/orgs";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sp = (await searchParams) ?? {};
  const notice = typeof sp.notice === "string" ? sp.notice : undefined;

  if (user) {
    const db = getDb();
    const first = await db
      .select({ orgId: orgMemberships.orgId })
      .from(orgMemberships)
      .where(eq(orgMemberships.userId, user.id))
      .limit(1);
    if (first[0]) redirect("/");
    const joinableOrgs = await listJoinableOrganizations();
    return (
      <div style={{ maxWidth: 520, margin: "3rem auto", padding: "0 1rem" }} className="stack">
        <h1 style={{ margin: 0 }}>Join or create an organization</h1>
        <p className="muted small">You are signed in as {user.email}</p>
        {notice === "no-org" ? <div className="card">You need an organization to continue.</div> : null}
        <CreateOrgForm orgs={joinableOrgs} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "3rem auto", padding: "0 1rem" }} className="stack">
      <h1 style={{ margin: 0 }}>Sign in</h1>
      <p className="muted small">Multi-tenant notes (Supabase Auth)</p>
      {notice === "no-org" ? (
        <div className="card error">Sign in to access your organizations.</div>
      ) : null}
      <LoginForm />
    </div>
  );
}
