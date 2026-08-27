import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-066.js";

describe("BT16-066", () => {
  it("offers the opponent a hand trash and gains memory if they decline", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Trash",
        controller: "opponent",
        optional: true,
        target: { filter: { kind: ["Digimon"] } },
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "GainMemory",
        amount: 1,
        condition: { kind: "ifThisEffectDidNotAct" },
      });
    }
  });

  it("draws and trashes one card as inherited once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", amount: 1 },
        { kind: "Trash", target: { count: 1 } },
      ],
    });
  });
});
