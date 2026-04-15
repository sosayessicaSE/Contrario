import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, ensureProfile } from "@/lib/auth/session";
import { getMembership } from "@/lib/tenancy/org-context";
import { listMyOrganizations } from "@/server/actions/orgs";
import { SignOutButton } from "./sign-out";
import { OrgSwitcherClient } from "./org-switcher";

export const dynamic = "force-dynamic";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  await ensureProfile(user.id, user.email);
  const m = await getMembership(user.id, orgId);
  if (!m) redirect("/login?notice=forbidden");

  const orgs = await listMyOrganizations();

  return (
    <div className="stack" style={{ minHeight: "100vh" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "0.75rem 1rem",
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div className="row" style={{ gap: "0.75rem" }}>
          <strong>Contrario</strong>
          <span className="small muted">Org</span>
          <OrgSwitcherClient currentOrgId={orgId} orgs={orgs} />
        </div>
        <nav className="row">
          <Link href={`/o/${orgId}/notes`}>Notes</Link>
          <Link href={`/o/${orgId}/search`}>Search</Link>
          <Link href={`/o/${orgId}/files`}>Files</Link>
          <Link href="/">Home</Link>
          <SignOutButton />
        </nav>
      </header>
      <main style={{ padding: "1rem", maxWidth: 1100, margin: "0 auto", width: "100%" }}>{children}</main>
    </div>
  );
}
