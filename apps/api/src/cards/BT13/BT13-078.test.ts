import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-078.js";

describe("BT13-078 Phascomon", () => {
  it("draws 1 and then trashes 1 card on deletion", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "OnDeletion");
    expect(effect?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      expect.objectContaining({ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } }),
    ]);
  });

  it("keeps the inherited end-of-opponent-turn effect once per turn", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "EndOfOpponentsTurn", frequency: "OncePerTurn" });
  });

  it("draws before trashing when deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-078", as: "phascomon" }], deck: ["BT1-002"], hand: ["BT1-001"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("phascomon").permanentId]);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-002"]);
  });
});
