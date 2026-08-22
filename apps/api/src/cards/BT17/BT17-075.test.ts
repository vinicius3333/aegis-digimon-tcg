import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-075.js";

describe("BT17-075 Eosmon", () => {
  it("offers the opponent a Tamer first, then conditionally offers a white low-cost Tamer", () => {
    for (const effect of [compiled.effects?.[0], compiled.effects?.[1]]) {
      expect(effect?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", controller: "opponent", from: ["hand"], optional: true, target: { filter: { controller: "opponent", kind: ["Tamer"] } } });
      expect(effect?.actions?.[1]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], optional: true, condition: { kind: "ifThisEffectDidNotAct" }, target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["White"], playCostLte: 4 } } });
    }
  });

  it("always performs the scaled De-Digivolve step after the Tamer choices", () => {
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({ kind: "DeDigivolve", amount: 1, target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } }, scaling: { per: 2, unit: "cards", filter: { kind: ["Tamer"] } } });
    expect(compiled.effects?.[1]?.actions?.[2]).toMatchObject({ kind: "DeDigivolve", amount: 1 });
  });

  it("redirects one attack once per turn to an unsuspended Eosmon", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "OpponentsTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true, target: { filter: { controller: "mine", unsuspended: true, nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] } } }] }] });
  });
});
