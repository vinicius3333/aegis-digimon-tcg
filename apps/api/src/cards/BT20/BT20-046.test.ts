import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-046.js";

describe("BT20-046 Espimon", () => {
  it("reduces a battle-area Espimon's digivolution into a Cyborg or Machine by 1", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({ actions: [{ kind: "Replacement", event: "wouldDigivolve", sourceFilter: { isSelfRef: true, zone: "battleArea" }, into: { nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }] }, actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }] }] });
  });

  it("grants the inherited +1000 DP continuously on all turns", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { filter: { isSelfRef: true }, isSelf: true } }] });
  });
});
