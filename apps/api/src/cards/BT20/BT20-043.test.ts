import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-043.js";

describe("BT20-043 Varodurumon", () => {
  it("suspends all opposing Digimon, grants +3000 DP, and offers an attack on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{ kind: "Suspend", target: { count: "all" } }, { kind: "ModifyDP", amount: 3000, duration: "forTheTurn" }, { kind: "Attack", optional: true }] });
    }
  });

  it("DNA digivolves this Digimon with another own Digimon, then offers the attack", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({ actions: [{ kind: "DnaDigivolve", optional: true, materials: { count: 2, includeRef: "self" } }, { kind: "Attack", optional: true, condition: { kind: "ifThisEffectActed" } }] });
  });

  it("gates the ACCEL play reduction and inherited DP reduction", () => {
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "Replacement", actions: [{ kind: "Replacement", mode: "reduceCost", amount: 5, condition: { kind: "youHave" } }] }] });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }] });
  });
});
