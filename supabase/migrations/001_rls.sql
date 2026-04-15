-- Row Level Security for authenticated Supabase client reads (defense in depth).
-- The Next.js server uses Drizzle with DATABASE_URL; that role may bypass RLS. RBAC is enforced in application code.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_note_summaries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_memberships m
    WHERE m.org_id = p_org AND m.user_id = p_user
  );
$$;

CREATE OR REPLACE FUNCTION public.org_role(p_org uuid, p_user uuid)
RETURNS org_role
LANGUAGE sql
STABLE
AS $$
  SELECT m.role FROM org_memberships m
  WHERE m.org_id = p_org AND m.user_id = p_user
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_read_note(p_note uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM notes n
    WHERE n.id = p_note
      AND public.is_org_member(n.org_id, p_user)
      AND (
        n.visibility = 'org'
        OR (
          n.visibility = 'private'
          AND (
            n.created_by = p_user
            OR public.org_role(n.org_id, p_user) IN ('owner', 'admin')
          )
        )
        OR (
          n.visibility = 'shared'
          AND (
            n.created_by = p_user
            OR public.org_role(n.org_id, p_user) IN ('owner', 'admin')
            OR EXISTS (
              SELECT 1 FROM note_shares s
              WHERE s.note_id = n.id AND s.user_id = p_user
            )
          )
        )
      )
  );
$$;

CREATE POLICY profiles_select_self ON profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY profiles_insert_self ON profiles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY profiles_update_self ON profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY orgs_select_member ON organizations
FOR SELECT TO authenticated
USING (public.is_org_member(id, auth.uid()));

CREATE POLICY memberships_select_member ON org_memberships
FOR SELECT TO authenticated
USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY notes_select_visible ON notes
FOR SELECT TO authenticated
USING (public.can_read_note(id, auth.uid()));

CREATE POLICY tags_select_member ON tags
FOR SELECT TO authenticated
USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY note_tags_select_visible ON note_tags
FOR SELECT TO authenticated
USING (public.can_read_note(note_id, auth.uid()));

CREATE POLICY note_shares_select_visible ON note_shares
FOR SELECT TO authenticated
USING (public.can_read_note(note_id, auth.uid()));

CREATE POLICY note_versions_select_visible ON note_versions
FOR SELECT TO authenticated
USING (public.can_read_note(note_id, auth.uid()));

CREATE POLICY files_select_visible ON files
FOR SELECT TO authenticated
USING (
  public.is_org_member(org_id, auth.uid())
  AND (
    note_id IS NULL
    OR public.can_read_note(note_id, auth.uid())
  )
);

CREATE POLICY ai_summaries_select_visible ON ai_note_summaries
FOR SELECT TO authenticated
USING (
  public.is_org_member(org_id, auth.uid())
  AND public.can_read_note(note_id, auth.uid())
);
