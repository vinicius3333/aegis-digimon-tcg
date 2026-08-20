import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-020.js";

describe("BT17-020", () => {
  it("reveals three and adds a Hybrid/Ten Warriors or inherited-effect Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ count: 1, to: "hand" }, { count: 1, to: "hand" }] }] });
  });

  it("plays an inherited-effect Tamer from hand for 2 less as inherited once per turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 2, optional: true }] });
  });
});
