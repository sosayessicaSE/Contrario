export type OrgRole = "owner" | "admin" | "member";

export type Action =
  | "org:read"
  | "org:manage_members"
  | "note:create"
  | "note:read"
  | "note:update"
  | "note:delete"
  | "note:share"
  | "file:upload"
  | "file:read"
  | "file:delete"
  | "ai:summarize"
  | "ai:accept";

const matrix: Record<OrgRole, Action[]> = {
  owner: [
    "org:read",
    "org:manage_members",
    "note:create",
    "note:read",
    "note:update",
    "note:delete",
    "note:share",
    "file:upload",
    "file:read",
    "file:delete",
    "ai:summarize",
    "ai:accept",
  ],
  admin: [
    "org:read",
    "org:manage_members",
    "note:create",
    "note:read",
    "note:update",
    "note:delete",
    "note:share",
    "file:upload",
    "file:read",
    "file:delete",
    "ai:summarize",
    "ai:accept",
  ],
  member: [
    "org:read",
    "note:create",
    "note:read",
    "note:update",
    "note:delete",
    "note:share",
    "file:upload",
    "file:read",
    "file:delete",
    "ai:summarize",
    "ai:accept",
  ],
};

export function roleHasAction(role: OrgRole, action: Action): boolean {
  return matrix[role].includes(action);
}
