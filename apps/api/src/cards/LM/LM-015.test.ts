import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-015.js";

describe("LM-015 Ryudamon", () => {
  it("digivolves into Ginryumon from hand when attacking while its owner has a Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "LM-015", as: "ryudamon" }, { card: "BT1-085", as: "tamer" }],
        hand: [{ card: "BT15-058", as: "ginryumon" }],
      },
      1: { security: ["BT1-001"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("ryudamon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("ryudamon").topCard.cardId === "BT15-058");
    expect(s.perm("ryudamon").topCard.cardId).toBe("BT15-058");
  });
});
