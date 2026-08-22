import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-070.js";

describe("EX6-070 Phantom Pain", () => {
  it("contains Main placement, Delay deletion, and Security deletion IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("PlaceInBattleAreaSelf");
    expect(text).toContain("deleteOwn");
    expect(text).toContain("unsuspended");
  });
});
