import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-075.js";

describe("BT15-075", () => {
  it("may trash a hand card for +2000 DP and draws with SoC in stack when digivolving or attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "ModifyDP", amount: 2000, cost: { kind: "trash" }, optional: true },
        { kind: "Draw", amount: 1, condition: { filter: { kind: ["Tamer"] } } },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        { kind: "ModifyDP", amount: 2000 },
        { kind: "Draw", amount: 1, condition: { filter: { kind: ["Tamer"] } } },
      ],
    });
  });
  it("gains 1 memory once per turn after attacking when the opponent has memory", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1 }],
    }));
});
