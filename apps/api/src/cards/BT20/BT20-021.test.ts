import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-021.js";

describe("BT20-021 Jesmon GX", () => {
  it("shares the once-per-turn Royal Knight placement cost across entry and attack triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Delete", cost: { kind: "place", target: { from: ["hand", "trash"], filter: { nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] } }, destination: "digivolutionStack", position: "bottom", host: "self" }, optional: true }] });
    }
    const attack = compiled.effects.filter((entry) => entry.trigger === "WhenAttacking")[1];
    expect(attack).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Unsuspend", target: { isSelf: true } }, { kind: "Trash", target: { filter: { controller: "opponent", zone: "security" } }, fromTop: true, scaling: { per: 2, unit: "digivolutionCards" } }] });
    expect(compiled.effects.find((entry) => entry.trigger === "Counter")).toMatchObject({ isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] });
  });
});
