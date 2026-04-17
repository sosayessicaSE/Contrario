import type { Action, OrgRole } from "./policy-matrix";
import { roleHasAction } from "./policy-matrix";
import type { NoteVisibility } from "@/lib/db/schema";

export type NoteAccessContext = {
  visibility: NoteVisibility;
  createdBy: string;
  orgId: string;
  sharedUserIds: string[];
};

export type AuthContext = {
  userId: string;
  orgId: string;
  role: OrgRole;
};

export function can(ctx: AuthContext | null, action: Action): boolean {
  if (!ctx) return false;
  return roleHasAction(ctx.role, action);
}

export function canReadNote(ctx: AuthContext | null, note: NoteAccessContext): boolean {
  if (!ctx || ctx.orgId !== note.orgId) return false;
  if (!roleHasAction(ctx.role, "note:read")) return false;

  if (note.visibility === "org") return true;

  if (note.visibility === "private") {
    if (note.createdBy === ctx.userId) return true;
    if (ctx.role === "admin" || ctx.role === "owner") return true;
    return false;
  }

  if (note.visibility === "shared") {
    if (note.createdBy === ctx.userId) return true;
    if (ctx.role === "admin" || ctx.role === "owner") return true;
    if (note.sharedUserIds.includes(ctx.userId)) return true;
    return false;
  }

  return false;
}

export function canUpdateNote(ctx: AuthContext | null, note: NoteAccessContext): boolean {
  if (!canReadNote(ctx, note)) return false;
  if (!ctx) return false;
  if (!roleHasAction(ctx.role, "note:update")) return false;
  // Org-wide notes: any member who can read may edit (shared workspace).
  if (note.visibility === "org") return true;
  if (note.createdBy === ctx.userId) return true;
  if (ctx.role === "admin" || ctx.role === "owner") return true;
  return false;
}

export function canDeleteNote(ctx: AuthContext | null, note: NoteAccessContext): boolean {
  if (!ctx) return false;
  if (!roleHasAction(ctx.role, "note:delete")) return false;
  if (!canReadNote(ctx, note)) return false;
  if (note.createdBy === ctx.userId) return true;
  if (ctx.role === "admin" || ctx.role === "owner") return true;
  return false;
}

export function canShareNote(ctx: AuthContext | null, note: NoteAccessContext): boolean {
  if (!ctx) return false;
  if (!roleHasAction(ctx.role, "note:share")) return false;
  if (!canReadNote(ctx, note)) return false;
  if (note.createdBy === ctx.userId) return true;
  if (ctx.role === "admin" || ctx.role === "owner") return true;
  return false;
}
