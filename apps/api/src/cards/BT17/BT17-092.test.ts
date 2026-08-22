import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-092.js";

describe("BT17-092 Menoa Bellucci", () => {
  it("trashes Morphomon or Eosmon to draw two on play", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Draw", amount: 2, optional: true, abortOnDecline: true, cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", nameOrTrait: [{ tokens: ["Morphomon", "Eosmon"], match: "name" }] } } } }],
    });
  });

  it("prevents only an opponent-effect departure and pays by deleting another Eosmon", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [{
        kind: "Replacement",
        event: "wouldLeavePlay",
        leaveCause: "byOpponentEffect",
        sourceFilter: { nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] },
        actions: [{ kind: "Prevent", optional: true, abortOnDecline: true, cost: { kind: "deleteOwn", target: { filter: { excludeSelf: true, nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] }, count: 1 } } }],
      }],
    });
  });

  it("plays itself from Security without paying its cost", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }] });
  });
});
