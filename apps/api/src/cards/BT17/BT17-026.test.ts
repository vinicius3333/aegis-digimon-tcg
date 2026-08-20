import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-026.js";

describe("BT17-026", () => {
  it("digivolves a Koji Tamer by placing Lobomon and KendoGarurumon from trash for cost 3", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", isFromHand: true, actions: [{ kind: "Digivolve", costOverride: 3, ignoreRequirements: true, additionalCosts: [{ kind: "place" }] }] });
  });

  it("returns a Hybrid card from its stack to suspend an opposing Digimon or Tamer", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd", optional: true, abortOnDecline: true, cost: { kind: "return" } }] });
  });

  it("returns a level 4 or lower opponent as inherited when it has Hybrid or Ten Warriors", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Return", to: "hand", condition: { kind: "selfHasTrait" } }] });
  });
});
