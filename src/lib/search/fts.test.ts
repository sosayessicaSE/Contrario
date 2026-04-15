import { describe, expect, it } from "vitest";
import { noteReadPredicate } from "./fts";

describe("noteReadPredicate", () => {
  it("builds a SQL fragment without throwing", () => {
    const pred = noteReadPredicate({
      orgId: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
    });
    expect(pred).toBeTruthy();
  });
});
