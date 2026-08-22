import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-086.js";

describe("BT18-086 Lucemon: Larva", () => {
  it("covers security play, breeding replacement, and 0 DP protection", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Security", isSecurity: true });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Breeding",
      actions: [{ kind: "Replacement", event: "wouldLeavePlay" }],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "GrantStatic", grant: "immuneToDeletion" }],
    });
  });
});
