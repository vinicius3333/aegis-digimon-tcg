import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-003.js";

describe("BT15-003", () => {
  it("may trash the top or bottom security card to gain 1 memory once per turn", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1, optional: true, cost: { kind: "trash", target: { count: 1, filter: { zone: "security" } } } });
  });
});
