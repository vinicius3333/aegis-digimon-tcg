import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-053.js";

describe("BT26-053 Wolvermon", () => {
  it("encodes Blocker and the All Turns Once Per Turn target-switch cost/use route", () => {
    expect(compiled.effects?.[0]?.keywords).toContainEqual(expect.objectContaining({ keyword: "Blocker" }));
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenAttackTargetSwitched", actions: [{ kind: "TrashDigivolution" }, { kind: "UseOptionWithoutCost", from: ["hand"], payCost: false }] }] });
  });
});
