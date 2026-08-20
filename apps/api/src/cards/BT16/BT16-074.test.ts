import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-074.js";

describe("BT16-074", () => {
  it("uses independent security branches and schedules the next-turn deletion", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({ kind: "Draw", amount: 2, condition: { kind: "securityAtLeast", value: 3 } });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({ kind: "Trash", target: { count: 1 }, condition: { kind: "securityAtLeast", value: 3 } });
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], condition: { kind: "securityAtMost", value: 3 }, optional: true });
    expect(compiled.effects?.[0]?.actions?.[3]).toMatchObject({ kind: "DelayedDelete" });
  });

  it("has the inherited Pulsemon security-cost unsuspend", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "EndOfAttack", isInherited: true, frequency: "OncePerTurn" });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ kind: "Unsuspend", optional: true, abortOnDecline: true, cost: { kind: "trash" } });
  });
});
