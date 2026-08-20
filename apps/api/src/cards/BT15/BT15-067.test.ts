import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-067.js";

describe("BT15-067", () => {
  it("returns a suspended opposing Digimon or Tamer when DigiPolice is in the stack", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Return", to: "deckBottom", condition: { kind: "selfDigivolutionStackHasTrait" } }] }));
  it("once per turn may play a Beast Dragon/DigiPolice costing 5000 DP or less when suspended", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSuspended", actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }] }] }));
});
