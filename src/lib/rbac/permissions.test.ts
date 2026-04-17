import { describe, expect, it } from "vitest";
import { can, canReadNote, canUpdateNote } from "./permissions";
import type { AuthContext } from "./permissions";

const member = (orgId: string, userId: string): AuthContext => ({
  orgId,
  userId,
  role: "member",
});

const admin = (orgId: string, userId: string): AuthContext => ({
  orgId,
  userId,
  role: "admin",
});

describe("can", () => {
  it("denies when ctx is null", () => {
    expect(can(null, "note:read")).toBe(false);
  });

  it("allows member note read", () => {
    expect(can(member("o1", "u1"), "note:read")).toBe(true);
  });

  it("denies member org manage", () => {
    expect(can(member("o1", "u1"), "org:manage_members")).toBe(false);
  });

  it("allows admin org manage", () => {
    expect(can(admin("o1", "u1"), "org:manage_members")).toBe(true);
  });
});

describe("canReadNote", () => {
  const orgId = "00000000-0000-0000-0000-000000000001";

  it("allows org visibility for any member", () => {
    expect(
      canReadNote(member(orgId, "u1"), {
        orgId,
        visibility: "org",
        createdBy: "other",
        sharedUserIds: [],
      }),
    ).toBe(true);
  });

  it("denies private note for non-creator member", () => {
    expect(
      canReadNote(member(orgId, "u1"), {
        orgId,
        visibility: "private",
        createdBy: "other",
        sharedUserIds: [],
      }),
    ).toBe(false);
  });

  it("allows private note for creator", () => {
    expect(
      canReadNote(member(orgId, "u1"), {
        orgId,
        visibility: "private",
        createdBy: "u1",
        sharedUserIds: [],
      }),
    ).toBe(true);
  });

  it("allows private note for admin even if not creator", () => {
    expect(
      canReadNote(admin(orgId, "a1"), {
        orgId,
        visibility: "private",
        createdBy: "u1",
        sharedUserIds: [],
      }),
    ).toBe(true);
  });

  it("denies wrong org", () => {
    expect(
      canReadNote(member(orgId, "u1"), {
        orgId: "00000000-0000-0000-0000-000000000099",
        visibility: "org",
        createdBy: "u1",
        sharedUserIds: [],
      }),
    ).toBe(false);
  });

  it("allows shared note for listed user", () => {
    expect(
      canReadNote(member(orgId, "u1"), {
        orgId,
        visibility: "shared",
        createdBy: "other",
        sharedUserIds: ["u1"],
      }),
    ).toBe(true);
  });
});

describe("canUpdateNote", () => {
  const orgId = "00000000-0000-0000-0000-000000000001";

  it("allows member to update another user's org-visible note", () => {
    expect(
      canUpdateNote(member(orgId, "u1"), {
        orgId,
        visibility: "org",
        createdBy: "other",
        sharedUserIds: [],
      }),
    ).toBe(true);
  });

  it("denies member updating someone else's private note", () => {
    expect(
      canUpdateNote(member(orgId, "u1"), {
        orgId,
        visibility: "private",
        createdBy: "other",
        sharedUserIds: [],
      }),
    ).toBe(false);
  });

  it("denies member updating shared note when not creator, admin, or owner", () => {
    expect(
      canUpdateNote(member(orgId, "u1"), {
        orgId,
        visibility: "shared",
        createdBy: "other",
        sharedUserIds: ["u1"],
      }),
    ).toBe(false);
  });
});
