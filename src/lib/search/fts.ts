import { sql, type SQL } from "drizzle-orm";

export function noteReadPredicate(args: { orgId: string; userId: string }): SQL {
  const { orgId, userId } = args;
  return sql`
    notes.org_id = ${orgId}
    AND (
      notes.visibility = 'org'
      OR (
        notes.visibility = 'private'
        AND (
          notes.created_by = ${userId}
          OR EXISTS (
            SELECT 1 FROM org_memberships om
            WHERE om.org_id = notes.org_id
              AND om.user_id = ${userId}
              AND om.role IN ('admin', 'owner')
          )
        )
      )
      OR (
        notes.visibility = 'shared'
        AND (
          notes.created_by = ${userId}
          OR EXISTS (
            SELECT 1 FROM org_memberships om2
            WHERE om2.org_id = notes.org_id
              AND om2.user_id = ${userId}
              AND om2.role IN ('admin', 'owner')
          )
          OR EXISTS (
            SELECT 1 FROM note_shares ns
            WHERE ns.note_id = notes.id AND ns.user_id = ${userId}
          )
        )
      )
    )
  `;
}

export function noteSearchWhere(args: { orgId: string; userId: string; q: string }): SQL {
  const { orgId, userId, q } = args;
  const read = noteReadPredicate({ orgId, userId });
  return sql`${read} AND notes.search_vector @@ plainto_tsquery('english', ${q})`;
}
