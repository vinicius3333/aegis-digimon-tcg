import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-05.js";

describe("ST13-05 Durandamon", () => {
  it("reveals 3 while attacking and plays one eligible Legend-Arms Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST13-05", as: "durandamon" }], deck: ["ST13-02", "BT1-001", "BT1-002"] },
      1: { security: ["BT1-003"] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("durandamon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-02"));
    expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-001", "BT1-002"]);
  });
});
