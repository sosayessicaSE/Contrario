import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { requireAuthContext } from "@/server/actions/context";
import styles from "./org-home-hero.module.css";

export const dynamic = "force-dynamic";

export default async function OrgHomePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  await requireAuthContext(orgId);

  const db = getDb();
  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  const orgName = org?.name ?? "Organization";

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="org-home-title">
        <div className={styles.inner}>
          <p className={styles.eyebrow}>Your organization</p>
          <div className={styles.divider} aria-hidden />
          <h1 id="org-home-title" className={styles.title}>
            {orgName}
          </h1>
          <p className={styles.lead}>Here you will find all your organization&apos;s notes.</p>
          <div className={styles.actions}>
            <Link href={`/o/${orgId}/notes`} className={styles.primary}>
              Open notes
            </Link>
            <Link href={`/o/${orgId}/search`} className={styles.secondary}>
              Search
            </Link>
            <Link href={`/o/${orgId}/files`} className={styles.secondary}>
              Files
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
